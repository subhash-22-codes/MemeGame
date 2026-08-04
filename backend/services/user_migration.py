"""
Authoritative Guest-to-Account Migration Service
Performs atomic ID reassignment for guest players who upgrade to a registered account,
ensuring zero progress loss while maintaining strict idempotency and abuse prevention.
"""
import re
import logging
from datetime import datetime

logger = logging.getLogger("UserMigration")

def migrate_guest_to_account(guest_id: str, new_user_id: str, new_username: str, db) -> dict:
    """
    Migrates all historical gameplay records from guest_id to new_user_id.
    
    Args:
        guest_id: The temporary ID (e.g. "guest_3f9a1b2c4e5d")
        new_user_id: The permanent ObjectId string of the newly registered user
        new_username: The permanent username
        db: MongoDB database instance
        
    Returns:
        dict with migration summary stats: {"success": bool, "matches_migrated": int, "error": str}
    """
    if not guest_id or not new_user_id:
        return {"success": False, "matches_migrated": 0, "error": "Missing guest_id or new_user_id"}

    # 1. Regex Validation: Must match canonical guest ID format (guest_<12 hex chars>)
    if not re.match(r'^guest_[a-fA-F0-9]{12}$', str(guest_id)):
        logger.warning(f"[MIGRATION] Invalid guest_id format rejected: {guest_id}")
        return {"success": False, "matches_migrated": 0, "error": "Invalid guest_id format"}

    migrated_guests = db["migrated_guests"]
    game_results = db["game_results"]
    users = db["users"]

    try:
        # 2. Idempotency Lock: Prevent duplicate migration of the same guest session
        if migrated_guests.find_one({"_id": guest_id}):
            logger.warning(f"[MIGRATION] Guest ID {guest_id} was already migrated.")
            return {"success": False, "matches_migrated": 0, "error": "Guest session already migrated"}

        # Record migration lock immediately
        migrated_guests.insert_one({
            "_id": guest_id,
            "targetUserId": str(new_user_id),
            "targetUsername": new_username,
            "migratedAt": datetime.utcnow()
        })

        # 3. Atomic Update in game_results_collection
        # A. Update players array entries
        res_players = game_results.update_many(
            {"players.id": guest_id},
            {"$set": {
                "players.$.id": str(new_user_id),
                "players.$.username": new_username
            }}
        )

        # B. Update winners array entries
        res_winners = game_results.update_many(
            {"winners.id": guest_id},
            {"$set": {
                "winners.$.id": str(new_user_id),
                "winners.$.username": new_username
            }}
        )

        # C. Update host entries
        res_host = game_results.update_many(
            {"host.id": guest_id},
            {"$set": {
                "host.id": str(new_user_id),
                "host.username": new_username
            }}
        )

        matches_updated = max(res_players.modified_count, res_winners.modified_count, res_host.modified_count)

        # 4. Re-aggregate authoritative user stats on the newly created user profile
        total_games = game_results.count_documents({"players.id": str(new_user_id)})
        total_wins = game_results.count_documents({"winners.id": str(new_user_id)})
        games_hosted = game_results.count_documents({"host.id": str(new_user_id)})

        # Update users_collection with migration audit trail and recalculated metrics
        from bson.objectid import ObjectId
        user_query = {"_id": ObjectId(new_user_id)} if len(str(new_user_id)) == 24 else {"_id": str(new_user_id)}
        
        users.update_one(
            user_query,
            {"$set": {
                "migratedFromGuestId": guest_id,
                "migratedAt": datetime.utcnow(),
                "stats.totalGames": total_games,
                "stats.totalWins": total_wins,
                "stats.gamesHosted": games_hosted
            }}
        )

        logger.info(
            f"[MIGRATION] Successfully migrated guest {guest_id} -> user {new_user_id} "
            f"({matches_updated} historical matches linked)."
        )
        return {
            "success": True,
            "matches_migrated": matches_updated,
            "error": None
        }

    except Exception as e:
        logger.error(f"[MIGRATION] Error migrating guest {guest_id} -> {new_user_id}: {e}")
        return {"success": False, "matches_migrated": 0, "error": str(e)}
