"""
Socket.IO event handlers for the game loop.
Handles: connect, disconnect, room management, game phases, chat, timers, cleanup.
"""

import time
import random
import secrets
import logging
import uuid
from datetime import datetime, timedelta
from flask import request
from flask_socketio import emit, join_room, leave_room

from core.database import (
    rooms_collection, sessions_collection, game_results_collection,
    redis_client, local_socket_store, local_rejoin_store,
    json_safe, MAX_PLAYERS, TIMER_PREFIX
)
from core.giphy import get_memes_from_giphy
from middleware.auth import verify_socket_token
from services.game_services import get_room_with_validation, get_player_and_room, update_and_broadcast_state, get_client_safe_room
from utils.game_utils import generate_unique_room_id
from utils.session_utils import generate_session_id

logger = logging.getLogger(__name__)


# ============================================================
#  SOCKET ↔ PLAYER MAPPING (Redis-backed with in-memory fallback)
# ============================================================

def set_socket_mapping(sid: str, room_id: str, player_id: str, session_id: str) -> None:
    data = {
        "roomId": room_id,
        "playerId": player_id,
        "sessionId": session_id,
        "lastSeen": datetime.utcnow().isoformat()
    }
    try:
        if redis_client:
            redis_client.hset(f"sock:{sid}", mapping=data)
            redis_client.expire(f"sock:{sid}", 24 * 3600)
            return
    except Exception as e:
        logger.error(f"set_socket_mapping error: {e}")
    local_socket_store[f"sock:{sid}"] = data


def get_socket_mapping(sid: str) -> dict:
    try:
        if redis_client:
            res = redis_client.hgetall(f"sock:{sid}")
            if res:
                return res
    except Exception as e:
        logger.error(f"get_socket_mapping error: {e}")
    return local_socket_store.get(f"sock:{sid}", {})


def clear_socket_mapping(sid: str) -> None:
    try:
        if redis_client:
            redis_client.delete(f"sock:{sid}")
    except Exception as e:
        logger.error(f"clear_socket_mapping error: {e}")
    local_socket_store.pop(f"sock:{sid}", None)


# ============================================================
#  SESSION / GRACE PERIOD HELPERS
# ============================================================

def set_active_session(session_id: str, room_id: str, player_id: str):
    try:
        if redis_client:
            redis_client.hset(f"session:{session_id}", mapping={
                "roomId": room_id,
                "playerId": player_id,
                "lastSeen": datetime.utcnow().isoformat()
            })
            redis_client.sadd(f"room_sessions:{room_id}", session_id)
    except Exception as e:
        logger.error(f"Redis set_active_session error: {e}")


def delete_sessions_for_room(room_id: str):
    try:
        if redis_client:
            session_ids = redis_client.smembers(f"room_sessions:{room_id}") or []
            for sid in session_ids:
                redis_client.delete(f"session:{sid}")
            redis_client.delete(f"room_sessions:{room_id}")
    except Exception as e:
        logger.error(f"Redis delete_sessions_for_room error: {e}")


def delete_player_sessions(room_id: str, player_id: str):
    try:
        if redis_client:
            session_ids = redis_client.smembers(f"room_sessions:{room_id}") or []
            for sid in session_ids:
                sess = redis_client.hgetall(f"session:{sid}") or {}
                if sess.get("playerId") == player_id:
                    redis_client.delete(f"session:{sid}")
                    redis_client.srem(f"room_sessions:{room_id}", sid)
    except Exception as e:
        logger.error(f"Redis delete_player_sessions error: {e}")


def set_rejoin_grace(session_id: str, ttl_seconds: int = 45) -> None:
    try:
        if redis_client:
            redis_client.setex(f"rejoin_grace:{session_id}", ttl_seconds, "1")
            return
    except Exception as e:
        logger.error(f"set_rejoin_grace error: {e}")
    local_rejoin_store[session_id] = time.time() + ttl_seconds


def pop_rejoin_grace(session_id: str) -> bool:
    try:
        if redis_client:
            pipe = redis_client.pipeline()
            key = f"rejoin_grace:{session_id}"
            pipe.get(key)
            pipe.delete(key)
            val, _ = pipe.execute()
            if val:
                return True
    except Exception as e:
        logger.error(f"pop_rejoin_grace error: {e}")
    return local_rejoin_store.pop(session_id, False)


# ============================================================
#  ROOM RUNTIME HELPERS
# ============================================================

def cleanup_room_runtime(room_id: str):
    try:
        if redis_client:
            redis_client.delete(f"{TIMER_PREFIX}:{room_id}")

        keys_to_remove = [sid for sid, data in local_socket_store.items() if data.get("roomId") == room_id]
        for sid in keys_to_remove:
            if sid in local_socket_store:
                del local_socket_store[sid]

        if redis_client:
            delete_sessions_for_room(room_id)

        logger.info(f"[CLEANUP] Purged room {room_id} from memory.")
    except Exception as e:
        logger.error(f"cleanup_room_runtime error: {e}")


local_timer_store = {}


def set_timer(room_id: str, end_time_iso: str, duration: int, timer_id: str = None):
    try:
        local_timer_store[room_id] = {"cancel": "0", "active_timer_id": timer_id}
        if redis_client:
            redis_client.hset(f"{TIMER_PREFIX}:{room_id}", mapping={
                "end_time": end_time_iso,
                "duration": str(duration),
                "cancel": "0",
                "active_timer_id": str(timer_id) if timer_id else ""
            })
    except Exception as e:
        logger.error(f"Redis set_timer error: {e}")


def cancel_timer(room_id: str):
    try:
        if room_id in local_timer_store:
            local_timer_store[room_id]["cancel"] = "1"
            local_timer_store[room_id]["active_timer_id"] = None
        if redis_client:
            redis_client.hset(f"{TIMER_PREFIX}:{room_id}", mapping={"cancel": "1", "active_timer_id": ""})
    except Exception as e:
        logger.error(f"Redis cancel_timer error: {e}")


def broadcast_state(room_id, update_payload, phase, socketio):
    update_and_broadcast_state(
        room_id, update_payload, phase,
        rooms_collection, socketio, json_safe, logger
    )


def finalize_game(room_id: str) -> dict | None:
    try:
        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            return None

        if room.get("gamePhase") not in ("results", "finalResults", "memeReveal"):
            logger.warning(f"[FINALIZE_SKIP] Room {room_id} is in phase {room.get('gamePhase')}")
            return None

        total_rounds = int(room.get("totalRounds", 0))
        current_round = int(room.get("currentRound", 0))

        if current_round < total_rounds:
            return None

        players = room.get("players", [])
        top_score = max(int(p.get("score", 0)) for p in players) if players else 0

        winners = [
            {
                "id": p.get("id"),
                "username": p.get("username"),
                "score": int(p.get("score", 0)),
                "avatar": p.get("avatar")
            }
            for p in players
            if int(p.get("score", 0)) == top_score
        ]

        host_data = room.get("host", {})
        # Collect all judges from judge history
        judge_history = room.get("judgeHistory", [])
        all_judge_ids = list(set(judge_history)) if judge_history else [host_data.get("id")] if host_data.get("id") else []

        submissions = room.get("submissions", [])
        best_sub = None
        if submissions:
            sorted_subs = sorted(submissions, key=lambda s: s.get("roundScore", s.get("score", 0)), reverse=True)
            if sorted_subs:
                best_sub = {
                    "username": sorted_subs[0].get("username", "Player"),
                    "memeUrl": sorted_subs[0].get("memeUrl", ""),
                    "prompt": room.get("currentSentence") or sorted_subs[0].get("title", "Meme of the Match"),
                    "score": sorted_subs[0].get("roundScore", sorted_subs[0].get("score", 0))
                }

        result_doc = {
            "roomId": room_id,
            "host": host_data,
            "allJudges": all_judge_ids,
            "winners": winners,
            "bestSubmission": best_sub,
            "players": [
                {
                    "id": p.get("id"),
                    "username": p.get("username"),
                    "score": int(p.get("score", 0)),
                    "avatar": p.get("avatar")
                }
                for p in players
            ],
            "totalRounds": total_rounds,
            "createdAt": datetime.utcnow()
        }

        game_results_collection.update_one(
            {"roomId": room_id},
            {"$set": result_doc},
            upsert=True
        )

        rooms_collection.update_one(
            {"roomId": room_id},
            {"$set": {"status": "archived", "cleanupAt": datetime.utcnow() + timedelta(minutes=5)}}
        )

        return result_doc

    except Exception as e:
        logger.error(f"finalize_game error: {e}")
        return None


# ============================================================
#  REGISTER ALL SOCKET EVENTS
# ============================================================

def register_socket_events(socketio):
    """Register all Socket.IO event handlers. Called from app.py."""

    # --- Helper to extract values from Redis mappings ---
    def _val(session: dict, key: str) -> str:
        v = session.get(key) or session.get(key.encode() if isinstance(key, str) else key)
        if not v:
            alt = "session_id" if key == "sessionId" else "sessionId"
            v = session.get(alt) or session.get(alt.encode() if isinstance(alt, str) else alt)
        if isinstance(v, bytes):
            return v.decode()
        return v or ""

    # --- GLOBAL SOCKET ERROR HANDLER ---

    @socketio.on_error_default
    def handle_default_socket_error(e):
        sid = getattr(request, "sid", "unknown")
        logger.error(
            f"[SOCKET_ERROR] Unhandled socket exception on sid {sid}: {str(e)}",
            exc_info=True,
            extra={"sid": sid, "code": "SERVER_ERROR"}
        )
        try:
            emit('error', {
                'error': 'An unexpected server error occurred. Please try again.',
                'code': 'SERVER_ERROR'
            }, room=sid)
        except Exception as emit_err:
            logger.error(f"[SOCKET_ERROR] Could not emit error payload to {sid}: {emit_err}")

    # --- CONNECTION ---

    @socketio.on('connect')
    def handle_connect(auth=None):
        user = verify_socket_token(auth or {})
        if not user:
            logger.warning(f"[CONNECT] Rejected unauthenticated socket: {request.sid}")
            return False  # Reject the connection
        logger.info(f"[CONNECT] Authenticated user {user.get('id')} connected: {request.sid}")

    @socketio.on('rejoinRoom')
    def handle_rejoin(data):
        sid = request.sid
        room_id = data.get('roomId')
        session_id = data.get('sessionId')
        user_id = data.get('userId')

        if not pop_rejoin_grace(session_id):
            logger.warning(f"[REJOIN_FAIL] Grace period expired/invalid: {session_id}")
            emit('error', {'code': 'SESSION_EXPIRED', 'message': 'Reconnection timed out'})
            return

        session_data = {}
        if redis_client:
            session_data = redis_client.hgetall(f"session:{session_id}") or {}
        if session_data.get('roomId') != room_id or session_data.get('playerId') != user_id:
            logger.warning(f"[REJOIN_FAIL] Data mismatch for session {session_id}")
            emit('error', {'code': 'INVALID_SESSION', 'message': 'Session mismatch'})
            return

        set_socket_mapping(sid, room_id, user_id, session_id)
        join_room(room_id)
        join_room(f"player_{user_id}")
        rooms_collection.update_one(
            {"roomId": room_id, "players.id": user_id},
            {
                "$set": {"players.$.isConnected": True, "players.$.lastSeen": datetime.utcnow()},
                "$unset": {"emptySince": ""}
            }
        )

        room = rooms_collection.find_one({"roomId": room_id})
        if room:
            emit('gameStateUpdate', json_safe(get_client_safe_room(room, user_id)))
            socketio.emit('playerReconnected', {'playerId': user_id}, to=room_id)

        logger.info(f"[REJOIN_SUCCESS] Player {user_id} re-linked to room {room_id}")

    def migrate_host_if_needed(room_id, leaving_player_id):
        try:
            room = rooms_collection.find_one({"roomId": room_id})
            if not room:
                return False

            host_id = room.get("host", {}).get("id")
            if leaving_player_id != host_id:
                return False

            logger.warning(f"[HOST_MIGRATE] Host {leaving_player_id} left room {room_id}. Attempting migration...")
            players = room.get("players", [])
            new_host = next((p for p in players if p.get("id") != leaving_player_id and p.get("isConnected", True)), None)
            if not new_host and players:
                new_host = next((p for p in players if p.get("id") != leaving_player_id), None)

            if not new_host:
                logger.info(f"[HOST_MIGRATE] No players remaining in room {room_id}. Deleting room.")
                rooms_collection.delete_one({"roomId": room_id})
                cleanup_room_runtime(room_id)
                return True

            logger.info(f"[HOST_MIGRATE] Promoting {new_host.get('username')} ({new_host.get('id')}) to Host in {room_id}")
            new_host["isHost"] = True

            rooms_collection.update_one(
                {"roomId": room_id, "players.id": new_host["id"]},
                {"$set": {"players.$.isHost": True}}
            )
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"host": new_host}}
            )

            updated_room = rooms_collection.find_one({"roomId": room_id})
            if updated_room:
                broadcast_state(room_id, {}, updated_room.get("gamePhase", "lobby"), socketio)

            return True
        except Exception as e:
            logger.error(f"[HOST_MIGRATE] Error migrating host in room {room_id}: {e}")
            return False

    @socketio.on("disconnect")
    def handle_disconnect(reason=None, *args, **kwargs):
        sid = request.sid
        logger.info(f"[DISCONNECT] Client disconnected ({reason}): {sid}")

        try:
            session = get_socket_mapping(sid)

            if sid in local_socket_store:
                del local_socket_store[sid]

            if not session:
                return

            room_id = _val(session, "roomId")
            player_id = _val(session, "playerId")
            session_id = _val(session, "sessionId")

            if not all([room_id, player_id, session_id]):
                return

            rooms_collection.update_one(
                {"roomId": room_id, "players.id": player_id},
                {"$set": {"players.$.isConnected": False, "players.$.lastSeen": datetime.utcnow()}},
                upsert=False
            )

            room = rooms_collection.find_one({"roomId": room_id})
            if not room:
                return

            active_players = [p for p in room["players"] if p.get("isConnected", False)]
            if not active_players:
                logger.info(f"[DISCONNECT] Room {room_id} has no active players. Starting 60-second grace period.")
                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$set": {"emptySince": datetime.utcnow()}}
                )
                return
            else:
                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$unset": {"emptySince": ""}}
                )

            # Host migration
            migrated_or_deleted = migrate_host_if_needed(room_id, player_id)
            if not migrated_or_deleted:
                updated_room = rooms_collection.find_one({"roomId": room_id})
                if updated_room:
                    socketio.emit('playerDisconnected', {
                        "players": json_safe(updated_room.get("players", [])),
                        "disconnectedPlayerId": player_id
                    }, to=room_id)

            set_rejoin_grace(session_id, 45)
            clear_socket_mapping(sid)

        except Exception as e:
            logger.error(f"[ERROR] Exception in handle_disconnect: {e}")

    # --- ROOM MANAGEMENT ---

    @socketio.on('createRoom')
    def handle_create_room(data):
        sid = request.sid

        try:
            host = data.get("host")
            if not host:
                emit("error", {"error": "Missing host data", "code": "MISSING_DATA"}, to=sid)
                return

            existing_rooms = list(rooms_collection.find({"players.id": host.get("id")}))
            for old_room in existing_rooms:
                old_room_id = old_room.get("roomId")
                logger.info(f"[CREATE_ROOM] Cleaning up previous room {old_room_id} for host {host.get('id')} starting a new game")
                rooms_collection.delete_one({"roomId": old_room_id})
                cleanup_room_runtime(old_room_id)

            host_data = {
                "id": host.get("id"),
                "username": host.get("username"),
                "avatar": host.get("avatar"),
                "isHost": True,
                "isConnected": True,
                "lastSeen": datetime.utcnow(),
                "score": 0,
                "roundScores": [],
                "isReady": True,
            }

            room_id = generate_unique_room_id(rooms_collection)
            session_id = generate_session_id()

            room_data = {
                "roomId": room_id,
                "host": host_data,
                "players": [host_data],
                "totalRounds": int(data.get("rounds", 5)),
                "currentRound": 0,
                "gamePhase": "lobby",
                "promptCreator": None,
                "currentSentence": None,
                "submissions": [],
                "creatorOrder": [],
                "creatorHistory": [],
                "wheelSpinnerId": None,
                "wheelSpun": False,
                "votedPlayerIds": [],
                "customPrompts": data.get("customPrompts", []),
                "rerollTokensUsed": [],
                "playerMemes": {},
                "createdAt": datetime.utcnow(),
                "lastActivity": datetime.utcnow()
            }
            insert_result = rooms_collection.insert_one(room_data)

            sessions_collection.update_one(
                {"sessionId": session_id},
                {"$set": {
                    "sessionId": session_id, "roomId": room_id, "playerId": host_data["id"],
                    "lastSeen": datetime.utcnow(), "isHost": True
                }},
                upsert=True
            )

            set_active_session(session_id, room_id, host_data["id"])
            set_socket_mapping(sid, room_id, host_data["id"], session_id)
            join_room(room_id)
            join_room(f"player_{host_data['id']}")

            logger.info(f"[CREATE] Host {host_data['id']} created room {room_id}")

            room_data["_id"] = str(insert_result.inserted_id)
            emit('roomCreated', {
                "roomData": json_safe(room_data),
                "sessionId": session_id
            }, to=sid)

        except Exception as e:
            logger.error(f"[ERROR] Error in createRoom: {str(e)}")
            emit("error", {"error": "Failed to create room", "code": "CREATE_ROOM_FAILED"}, to=sid)

    @socketio.on('joinRoom')
    def handle_join_room(data):
        start = time.time()
        sid = request.sid

        try:
            room_id = data.get("roomId")
            player_data = data.get("player")
            player_id = player_data.get("id")
            provided_session_id = data.get("sessionId")

            if not room_id or not player_data or not player_id:
                emit("error", {"error": "Room ID and player info required", "code": "MISSING_DATA"}, to=sid)
                return

            rejoined_from_grace = False
            if provided_session_id and pop_rejoin_grace(provided_session_id):
                rejoined_from_grace = True
                logger.info(f"[REJOIN] Player {player_id} reconnected within grace period")

            room, error = get_room_with_validation(room_id, rooms_collection)
            if error:
                emit("error", {"error": error, "code": "ROOM_NOT_FOUND"}, to=sid)
                return

            game_started = room.get("gamePhase") != "lobby"
            session_id = provided_session_id
            existing_idx = next((i for i, p in enumerate(room.get("players", [])) if p["id"] == player_id), None)

            if existing_idx is not None:
                logger.info(f"[REJOIN] Player {player_id} is rejoining room {room_id}")
                existing_player = room["players"][existing_idx]
                existing_player["isConnected"] = True
                existing_player["lastSeen"] = datetime.utcnow()

                if not session_id:
                    session_id = existing_player.get("sessionId") or generate_session_id()
                existing_player["sessionId"] = session_id
                existing_player["isReady"] = True
                room["players"][existing_idx] = existing_player

                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$set": {f"players.{existing_idx}": existing_player, "lastActivity": datetime.utcnow()}}
                )
            else:
                if game_started:
                    emit("error", {"error": "Game has already started", "code": "GAME_ALREADY_STARTED"}, to=sid)
                    return

                if len(room.get("players", [])) >= MAX_PLAYERS:
                    emit("error", {"error": "Room Full. Maximum of 10 players allowed.", "code": "ROOM_FULL"}, to=sid)
                    return

                logger.info(f"[JOIN] New player {player_id} joining room {room_id}")
                session_id = provided_session_id or generate_session_id()
                new_player = {
                    "id": player_id,
                    "username": player_data.get("username"),
                    "avatar": player_data.get("avatar"),
                    "isHost": False,
                    "isConnected": True,
                    "lastSeen": datetime.utcnow(),
                    "score": 0,
                    "roundScores": [],
                    "sessionId": session_id,
                    "isReady": player_data.get("isReady", True),
                }

                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$push": {"players": new_player}, "$set": {"lastActivity": datetime.utcnow()}}
                )

            sessions_collection.update_one(
                {"sessionId": session_id},
                {"$set": {
                    "sessionId": session_id, "roomId": room_id, "playerId": player_id,
                    "lastSeen": datetime.utcnow(), "isHost": False
                }},
                upsert=True
            )
            sessions_collection.delete_many({
                "roomId": room_id, "playerId": player_id, "sessionId": {"$ne": session_id}
            })

            set_socket_mapping(sid, room_id, player_id, session_id)
            set_active_session(session_id, room_id, player_id)
            join_room(room_id)
            join_room(f"player_{player_id}")

            updated_room = rooms_collection.find_one({"roomId": room_id})

            if existing_idx is not None or rejoined_from_grace:
                emit('playerReconnected', {
                    "players": json_safe(updated_room.get("players", [])),
                    "reconnectedPlayerId": player_id
                }, to=room_id, skip_sid=sid)
            else:
                emit("playerJoined", {
                    "players": json_safe(updated_room.get("players", []))
                }, to=room_id, skip_sid=sid)

            emit("roomJoined", {
                "roomData": json_safe(updated_room),
                "sessionId": session_id
            }, to=sid)

            end = time.time()
            logger.info(f"[METRIC] joinRoom latency: {(end - start)*1000:.2f} ms")

        except Exception as e:
            logger.error(f"[ERROR] Error in joinRoom: {str(e)}")
            emit("error", {"error": "Failed to join room", "code": "JOIN_FAILED"}, to=sid)

    @socketio.on('leaveRoom')
    def handle_leave_room(data):
        sid = request.sid
        try:
            room_id = data.get('roomId')
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )

            if error:
                logger.info(f"[LEAVE] Player {sid} tried to leave, but: {error}")
                return

            logger.info(f"[LEAVE] Player {player['id']} is leaving room {room_id}")

            rooms_collection.update_one(
                {"roomId": room_id},
                {"$pull": {"players": {"id": player['id']}}}
            )
            sessions_collection.delete_many({"roomId": room_id, "playerId": player['id']})
            delete_player_sessions(room_id, player['id'])
            clear_socket_mapping(sid)
            leave_room(room_id, sid)

            migrated_or_deleted = migrate_host_if_needed(room_id, player['id'])
            if not migrated_or_deleted:
                updated_room = rooms_collection.find_one({"roomId": room_id})
                if updated_room:
                    emit('playerLeft', {
                        "players": json_safe(updated_room.get("players", [])),
                        "leftPlayerId": player['username']
                    }, to=room_id)

        except Exception as e:
            logger.error(f"[ERROR] Error in leaveRoom: {str(e)}")

    @socketio.on('discardRoom')
    def handle_discard_room(data):
        sid = request.sid
        try:
            room_id = data.get('roomId')
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )

            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            if not player.get("isHost"):
                emit("error", {"error": "Only the host can discard the room", "code": "NOT_HOST"}, to=sid)
                return

            logger.info(f"[DISCARD] Host {player['id']} is discarding room {room_id}")

            emit('roomDiscarded', {"message": "The host has closed the room"}, to=room_id)
            leave_room(room_id, sid)
            socketio.close_room(room_id)

            rooms_collection.delete_one({"roomId": room_id})
            sessions_collection.delete_many({"roomId": room_id})
            cleanup_room_runtime(room_id)

        except Exception as e:
            logger.error(f"[ERROR] Error in discardRoom: {str(e)}")
            emit("error", {"error": "Failed to discard room", "code": "DISCARD_ROOM_FAILED"}, to=sid)

    # --- GAME LOOP ---

    @socketio.on('startGame')
    def handle_start_game(data):
        sid = request.sid
        start = time.time()
        try:
            room_id = data.get("roomId")
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )

            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            if not player.get("isHost"):
                emit("error", {"error": "Only the host can start the game", "code": "NOT_HOST"}, to=sid)
                return

            players = room.get("players", [])
            if len(players) < 3:
                emit("error", {"error": "At least 3 players are required to start a competitive multiplayer game.", "code": "NOT_ENOUGH_PLAYERS"}, to=sid)
                return

            if room.get("gamePhase") != "finalResults" and not all(p.get("isReady", False) for p in players):
                emit("error", {"error": "Not all players are ready", "code": "PLAYERS_NOT_READY"}, to=sid)
                return

            # Build prompt creator rotation order (shuffled list of all player IDs)
            connected_player_ids = [p["id"] for p in players if p.get("isConnected", True)]
            secrets.SystemRandom().shuffle(connected_player_ids)

            # First prompt creator is the first in the shuffled order
            first_creator_id = connected_player_ids[0]

            updated_players = []
            first_creator_data = None
            for p in players:
                p["score"] = 0
                p["roundScores"] = []
                p["isReady"] = True
                p.pop("isJudge", None)
                if p["id"] == first_creator_id:
                    first_creator_data = p
                updated_players.append(p)

            # In Round 1, the Host spins the wheel!
            wheel_spinner_id = room.get("host", {}).get("id") or first_creator_id

            initial_update = {
                "$set": {
                    "currentRound": 1,
                    "promptCreator": first_creator_data,
                    "currentSentence": None,
                    "submissions": [],
                    "players": updated_players,
                    "creatorOrder": connected_player_ids,
                    "creatorHistory": [first_creator_id],
                    "wheelSpinnerId": wheel_spinner_id,
                    "wheelSpun": False,
                    "spinStartTime": None,
                    "votedPlayerIds": [],
                },
                "$unset": {
                    "finalResult": ""
                }
            }

            broadcast_state(room_id, initial_update, "promptSpinner", socketio)
            # Start 15s auto-spin fallback timer in case wheelSpinnerId is AFK
            start_room_timer(room_id, 15, "auto_spin_wheel", socketio)

            end = time.time()
            logger.info({
                "type": "metric", "event": "start_game",
                "latency_ms": round((end - start) * 1000, 2),
                "room": room_id, "players": len(players)
            })

        except Exception as e:
            logger.error(f"[ERROR] Error in startGame: {e}")
            emit("error", {"error": "Failed to start game", "code": "START_GAME_FAILED"}, to=sid)

    @socketio.on('spinWheel')
    def handle_spin_wheel(data):
        sid = request.sid
        try:
            room_id = data.get("roomId")
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error or not room:
                return

            if room.get("gamePhase") != "promptSpinner" or room.get("wheelSpun"):
                return

            spinner_id = room.get("wheelSpinnerId")
            if player.get("id") != spinner_id and not player.get("isHost"):
                emit("error", {"error": "It is not your turn to spin the wheel", "code": "NOT_SPINNER"}, to=sid)
                return

            stop_game_timer(room_id)
            logger.info(f"[GAME] Wheel spun in room {room_id} by {player.get('id')}")

            now_ts = int(time.time() * 1000)
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"wheelSpun": True, "spinStartTime": now_ts}}
            )
            broadcast_state(room_id, {"$set": {"wheelSpun": True, "spinStartTime": now_ts}}, "promptSpinner", socketio)
            start_room_timer(room_id, 4, "prompt_spinner_complete", socketio)

        except Exception as e:
            logger.error(f"[ERROR] Error in handle_spin_wheel: {e}")

    @socketio.on('submitSentence')
    def handle_submit_sentence(data):
        sid = request.sid
        start = time.time()
        try:
            room_id = data.get("roomId")
            sentence = data.get("sentence")

            if not sentence:
                emit("error", {"error": "Sentence cannot be empty", "code": "MISSING_DATA"}, to=sid)
                return

            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            current_creator_id = room.get("promptCreator", {}).get("id")
            if player.get("id") != current_creator_id:
                emit("error", {"error": "Only the Prompt Creator can submit a prompt", "code": "NOT_CREATOR"}, to=sid)
                return

            if room.get("gamePhase") != "sentenceCreation":
                emit("error", {"error": "Room is not in Prompt Cooking phase", "code": "WRONG_PHASE"}, to=sid)
                return

            transition_res = rooms_collection.update_one(
                {"roomId": room_id, "gamePhase": "sentenceCreation"},
                {"$set": {"gamePhase": "memeSelection"}}
            )
            if transition_res.modified_count == 0:
                logger.info(f"[GAME] Room {room_id} already transitioned from sentenceCreation.")
                return

            # Authoritatively increment promptsCreated for the player in users_collection
            try:
                from core.database import users_collection
                from bson.objectid import ObjectId
                player_id = player.get("id", "")
                if player_id and not str(player_id).startswith("guest_"):
                    try:
                        users_collection.update_one({"_id": ObjectId(player_id)}, {"$inc": {"promptsCreated": 1}})
                    except Exception:
                        users_collection.update_one({"_id": str(player_id)}, {"$inc": {"promptsCreated": 1}})
            except Exception as stat_err:
                logger.warning(f"[STAT_ERROR] Could not increment promptsCreated: {stat_err}")

            stop_game_timer(room_id)
            random_memes = get_memes_from_giphy()

            sentence_update = {
                "$set": {
                    "currentSentence": sentence,
                    "submissions": [],
                    "availableMemes": random_memes
                }
            }

            broadcast_state(room_id, sentence_update, "memeSelection", socketio)
            start_room_timer(room_id, 90, "memeSelection", socketio)

            end = time.time()
            logger.info({
                "type": "metric", "event": "submit_sentence",
                "latency_ms": round((end - start) * 1000, 2),
                "room": room_id, "player": player.get("id")
            })

        except Exception as e:
            logger.error(f"[ERROR] Error in submitSentence: {str(e)}")
            emit("error", {"error": "Failed to submit sentence", "code": "SUBMIT_SENTENCE_FAILED"}, to=sid)

    @socketio.on('selectMeme')
    def handle_select_meme(data):
        sid = request.sid
        start = time.time()
        try:
            room_id = data.get("roomId")
            meme_id = data.get("memeId")

            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            submissions = room.get("submissions", [])
            if any(s.get("playerId") == player["id"] for s in submissions):
                emit("error", {"error": "You have already submitted", "code": "ALREADY_SUBMITTED"}, to=sid)
                return

            available_memes = room.get("availableMemes", [])
            selected_meme_obj = next((m for m in available_memes if m["id"] == meme_id), None)

            if not selected_meme_obj:
                emit("error", {"error": "Invalid meme data submitted.", "code": "INVALID_MEME"}, to=sid)
                return

            new_submission = {
                "submissionId": str(uuid.uuid4()),
                "playerId": player["id"],
                "username": player["username"],
                "avatar": player.get("avatar"),
                "memeId": selected_meme_obj["id"],
                "memeUrl": selected_meme_obj["url"],
                "title": selected_meme_obj.get("title", "Meme"),
                "score": 0,
                "votes": []
            }

            result = rooms_collection.find_one_and_update(
                {"roomId": room_id, "gamePhase": "memeSelection", "submissions.playerId": {"$ne": player["id"]}},
                {"$push": {"submissions": new_submission}},
                return_document=True
            )

            if not result:
                emit("error", {"error": "You have already submitted or phase ended", "code": "ALREADY_SUBMITTED"}, to=sid)
                return

            new_submissions = result.get("submissions", [])
            players = result.get("players", [])
            connected_players = [p for p in players if p.get("isConnected", True)]

            all_submitted = len(new_submissions) >= len(connected_players)
            update_payload = {"$set": {"submissions": new_submissions}}

            if all_submitted:
                transition_res = rooms_collection.update_one(
                    {"roomId": room_id, "gamePhase": "memeSelection"},
                    {"$set": {"gamePhase": "voting", "votedPlayerIds": []}}
                )
                if transition_res.modified_count == 0:
                    logger.info(f"[GAME] Room {room_id} already transitioned from memeSelection.")
                    return
                logger.info(f"[GAME] All players submitted in {room_id}. Moving to community voting.")
                stop_game_timer(room_id)
                x = len(connected_players)
                if x <= 2:
                    vote_duration = 20
                elif x == 3:
                    vote_duration = 30
                elif x == 4:
                    vote_duration = 35
                elif x == 5:
                    vote_duration = 40
                elif x == 6:
                    vote_duration = 45
                elif x == 7:
                    vote_duration = 50
                elif x == 8:
                    vote_duration = 55
                else:
                    vote_duration = 60

                for s in new_submissions:
                    if "votes" not in s:
                        s["votes"] = []
                broadcast_state(room_id, {"$set": {"submissions": new_submissions, "votedPlayerIds": []}}, "voting", socketio)
                start_room_timer(room_id, vote_duration, "voting", socketio)
            else:
                broadcast_state(room_id, update_payload, "memeSelection", socketio)

            end = time.time()
            logger.info({
                "type": "metric", "event": "select_meme",
                "latency_ms": round((end - start) * 1000, 2),
                "room": room_id, "player": player.get("id"),
                "total_submissions": len(new_submissions),
                "expected_submissions": len(connected_players)
            })

        except Exception as e:
            logger.error(f"[ERROR] Error in selectMeme: {str(e)}")
            emit("error", {"error": "Failed to select meme", "code": "SELECT_MEME_FAILED"}, to=sid)

    @socketio.on('rerollMemes')
    def handle_reroll_memes(data):
        sid = request.sid
        try:
            room_id = data.get("roomId")
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            if room.get("gamePhase") != "memeSelection":
                emit("error", {"error": "Rerolls are only allowed during Meme Selection phase", "code": "INVALID_PHASE"}, to=sid)
                return

            pid = player["id"]
            rerolled_users = room.get("rerollTokensUsed", [])
            if pid in rerolled_users:
                emit("error", {"error": "You have already used your Reroll Token for this match", "code": "REROLL_EXHAUSTED"}, to=sid)
                return

            fresh_memes = get_memes_from_giphy()
            player_memes = room.get("playerMemes", {})
            player_memes[pid] = fresh_memes

            rooms_collection.update_one(
                {"roomId": room_id},
                {
                    "$set": {f"playerMemes.{pid}": fresh_memes},
                    "$addToSet": {"rerollTokensUsed": pid}
                }
            )

            emit("memesRerolled", {"memes": fresh_memes, "rerollsLeft": 0}, to=sid)
            logger.info(f"[REROLL] Player {player['username']} ({pid}) rerolled their memes in room {room_id}")

        except Exception as e:
            logger.error(f"[ERROR] Error in rerollMemes: {str(e)}")
            emit("error", {"error": "Failed to reroll memes", "code": "REROLL_FAILED"}, to=sid)

    def calculate_ranked_voting_scores(submissions):
        for sub in submissions:
            sub_votes = sub.get("votes", [])
            total_pts = 0
            r1, r2, r3 = 0, 0, 0
            for v in sub_votes:
                rank = int(v.get("rank", 0))
                if rank == 1:
                    total_pts += 5
                    r1 += 1
                elif rank == 2:
                    total_pts += 3
                    r2 += 1
                elif rank == 3:
                    total_pts += 1
                    r3 += 1
                elif "rating" in v:
                    rating = int(v.get("rating", 3))
                    total_pts += max(1, min(5, rating))

            sub["roundScore"] = total_pts
            sub["rank1Count"] = r1
            sub["rank2Count"] = r2
            sub["rank3Count"] = r3
            sub["avgRating"] = total_pts

        def sort_key(s):
            return (s.get("roundScore", 0), s.get("rank1Count", 0), s.get("rank2Count", 0), s.get("rank3Count", 0))

        if submissions:
            best_sub = max(submissions, key=sort_key, default=None)
            for sub in submissions:
                if sub is best_sub and sort_key(sub)[0] > 0:
                    sub["roundScore"] += 15
                    sub["isWinner"] = True
                else:
                    sub["isWinner"] = False
        return submissions

    @socketio.on('submitCommunityVotes')
    @socketio.on('scoreMeme')
    def handle_submit_community_votes(data):
        sid = request.sid
        start = time.time()
        try:
            room_id = data.get("roomId")
            votes = data.get("votes", [])
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error or not room:
                emit("error", {"error": error or "Room not found", "code": "AUTH_ERROR"}, to=sid)
                return

            if room.get("gamePhase") != "voting":
                emit("error", {"error": "Not currently in voting phase", "code": "INVALID_PHASE"}, to=sid)
                return

            voter_id = player["id"]
            voted_ids = room.get("votedPlayerIds", [])
            if voter_id in voted_ids:
                emit("error", {"error": "You have already voted", "code": "ALREADY_VOTED"}, to=sid)
                return

            submissions = room.get("submissions", [])
            active_players_count = len([p for p in room.get("players", []) if p.get("isConnected", True)])
            max_allowed_rank = 2 if active_players_count <= 3 else 3
            seen_targets = set()
            seen_ranks = set()
            for v in votes:
                target_id = v.get("targetPlayerId")
                rank_val = int(v.get("rank", 0))
                rating_val = int(v.get("rating", 3))
                if rank_val > max_allowed_rank:
                    emit("error", {"error": f"Rank {rank_val} is not allowed for {active_players_count} players (max rank {max_allowed_rank})", "code": "INVALID_RANK"}, to=sid)
                    return
                target_sub = next((s for s in submissions if s.get("submissionId") == target_id or s.get("playerId") == target_id or s.get("memeId") == target_id or s.get("memeId") == v.get("memeId")), None)
                if not target_sub:
                    emit("error", {"error": "Invalid vote target", "code": "INVALID_VOTE_TARGET"}, to=sid)
                    return
                if target_sub.get("playerId") == voter_id:
                    emit("error", {"error": "You cannot vote for yourself", "code": "SELF_VOTE_FORBIDDEN"}, to=sid)
                    return
                if target_id in seen_targets:
                    emit("error", {"error": "Duplicate vote target in payload", "code": "DUPLICATE_VOTE_TARGET"}, to=sid)
                    return
                if rank_val in (1, 2, 3):
                    if rank_val in seen_ranks:
                        emit("error", {"error": f"Duplicate rank {rank_val} in payload", "code": "DUPLICATE_VOTE_RANK"}, to=sid)
                        return
                    seen_ranks.add(rank_val)
                seen_targets.add(target_id)
                for sub in submissions:
                    if sub.get("playerId") == target_sub.get("playerId"):
                        if "votes" not in sub:
                            sub["votes"] = []
                        vote_entry = {"voterId": voter_id}
                        if rank_val in (1, 2, 3):
                            vote_entry["rank"] = rank_val
                        else:
                            vote_entry["rating"] = max(1, min(5, rating_val))
                        sub["votes"].append(vote_entry)
                        break

            voted_ids.append(voter_id)
            rooms_collection.update_one(
                {"roomId": room_id},
                {"$set": {"submissions": submissions, "votedPlayerIds": voted_ids}}
            )

            players = room.get("players", [])
            connected_players = [p for p in players if p.get("isConnected", True)]

            if len(voted_ids) >= len(connected_players):
                current_round = int(room.get("currentRound", 1))
                total_rounds = int(room.get("totalRounds", 5))
                next_phase = "finalResults" if current_round >= total_rounds else "results"

                transition_res = rooms_collection.update_one(
                    {"roomId": room_id, "gamePhase": "voting"},
                    {"$set": {"gamePhase": next_phase}}
                )
                if transition_res.modified_count == 0:
                    logger.info(f"[VOTING] Room {room_id} already transitioned from voting.")
                    return

                logger.info(f"[VOTING] All players voted in {room_id}. Calculating scores...")
                stop_game_timer(room_id)

                submissions = calculate_ranked_voting_scores(submissions)

                updated_players = []
                for p in players:
                    pid = p["id"]
                    sub = next((s for s in submissions if s["playerId"] == pid), None)
                    added_score = sub.get("roundScore", 0) if sub else 0
                    p["score"] = p.get("score", 0) + added_score
                    round_scores = p.get("roundScores", [])
                    round_scores.append(added_score)
                    p["roundScores"] = round_scores
                    updated_players.append(p)

                rooms_collection.update_one(
                    {"roomId": room_id},
                    {"$set": {"submissions": submissions, "players": updated_players}}
                )

                if int(current_round) >= int(total_rounds):
                    logger.info(f"[GAME_OVER] Final round completed in {room_id}. Finalizing...")
                    result_doc = finalize_game(room_id)
                    final_update = {}
                    if result_doc:
                        final_update["$set"] = {"finalResult": result_doc, "submissions": submissions, "players": updated_players}
                    broadcast_state(room_id, final_update, "finalResults", socketio)
                    stop_game_timer(room_id)
                else:
                    logger.info(f"[ROUND_OVER] Round {current_round} done. Moving to results.")
                    broadcast_state(room_id, {"$set": {"submissions": submissions, "players": updated_players}}, "results", socketio)
            else:
                broadcast_state(room_id, {"$set": {"votedPlayerIds": voted_ids}}, "voting", socketio)

            end = time.time()
            logger.info({
                "type": "metric", "event": "submit_community_votes",
                "latency_ms": round((end - start) * 1000, 2),
                "room": room_id, "voter": sid,
                "voted_count": len(voted_ids)
            })

        except Exception as e:
            logger.error(f"[ERROR] Error in handle_submit_community_votes: {str(e)}")
            emit("error", {"error": "Failed to submit votes", "code": "VOTE_FAILED"}, to=sid)

    @socketio.on('nextRound')
    def handle_next_round(data):
        sid = request.sid
        try:
            room_id = data.get("roomId")
            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )
            if error:
                emit("error", {"error": error, "code": "AUTH_ERROR"}, to=sid)
                return

            if not player.get("isHost"):
                emit("error", {"error": "Only the host can start the next round", "code": "NOT_HOST"}, to=sid)
                return

            current_round = int(room.get("currentRound", 0))
            total_rounds = int(room.get("totalRounds", 10))

            if current_round >= total_rounds:
                logger.info(f"[GAME] Game ended in {room_id}. Moving to final results.")
                result_doc = finalize_game(room_id)
                final_update = {}
                if result_doc:
                    final_update["$set"] = {"finalResult": result_doc}
                broadcast_state(room_id, final_update, "finalResults", socketio)
                stop_game_timer(room_id)
            else:
                next_round_num = current_round + 1
                logger.info(f"[GAME] Starting round {next_round_num} in {room_id}.")

                # CREATOR ROTATION: Pick the next prompt creator from creatorOrder
                creator_order = room.get("creatorOrder", [])
                players = room.get("players", [])
                connected_ids = {p["id"] for p in players if p.get("isConnected", True)}

                next_creator_id = None
                if creator_order:
                    for offset in range(len(creator_order)):
                        candidate_idx = (next_round_num - 1 + offset) % len(creator_order)
                        candidate_id = creator_order[candidate_idx]
                        if candidate_id in connected_ids:
                            next_creator_id = candidate_id
                            break

                if not next_creator_id:
                    next_creator_id = next(iter(connected_ids), None)

                next_creator_data = None
                updated_players = []
                for p in players:
                    p.pop("isJudge", None)
                    if p["id"] == next_creator_id:
                        next_creator_data = p
                    updated_players.append(p)

                # The previous Prompt Creator spins the wheel for this round!
                wheel_spinner_id = room.get("promptCreator", {}).get("id") or next_creator_id

                next_round_update = {
                    "$set": {
                        "currentRound": next_round_num,
                        "promptCreator": next_creator_data,
                        "currentSentence": None,
                        "submissions": [],
                        "players": updated_players,
                        "wheelSpinnerId": wheel_spinner_id,
                        "wheelSpun": False,
                        "votedPlayerIds": [],
                    },
                    "$push": {
                        "creatorHistory": next_creator_id
                    }
                }

                broadcast_state(room_id, next_round_update, "promptSpinner", socketio)
                start_room_timer(room_id, 15, "auto_spin_wheel", socketio)

        except Exception as e:
            logger.error(f"[ERROR] Error in nextRound: {str(e)}")
            emit("error", {"error": "Failed to start next round", "code": "NEXT_ROUND_FAILED"}, to=sid)

    # --- CHAT ---

    @socketio.on('chatMessage')
    def handle_chat_message(data):
        sid = request.sid
        start = time.time()

        try:
            room_id = data.get("roomId") or data.get("room_id")
            message_body = data.get("message")
            if isinstance(message_body, dict):
                text_content = str(message_body.get("message", ""))
            else:
                text_content = str(message_body)

            if not room_id or not text_content.strip():
                return

            player, room, error = get_player_and_room(
                sid, room_id, rooms_collection, get_socket_mapping, logger
            )

            if error:
                return

            socketio.emit("chatMessage", {
                "id": f"msg_{int(time.time() * 1000)}",
                "sender": player.get("username", "Unknown"),
                "username": player.get("username", "Unknown"),
                "senderId": player.get("id"),
                "playerId": player.get("id"),
                "userId": player.get("id"),
                "message": text_content[:500],
                "avatar": player.get("avatar", ""),
                "timestamp": int(time.time() * 1000),
                "type": "user"
            }, to=room_id)

            end = time.time()
            logger.info({
                "type": "metric", "event": "chat_message",
                "latency_ms": round((end - start) * 1000, 2),
                "room": room_id, "player": player.get("id")
            })

        except Exception as e:
            logger.error({
                "type": "error", "event": "chat_exception",
                "sid": sid, "error": str(e)
            })

    # --- TIMERS ---

    def start_room_timer(room_id, duration, timer_type, sio):
        start_game_timer(room_id, duration, sio, timer_type)

    def start_game_timer(room_id, duration, sio, timer_type=None):
        my_timer_id = str(uuid.uuid4().hex)
        end_time = datetime.utcnow() + timedelta(seconds=duration)
        set_timer(room_id, end_time.isoformat(), duration, timer_id=my_timer_id)

        def timer_worker(rid, end_time_local, ttype, tid):
            try:
                remaining = (end_time_local - datetime.utcnow()).total_seconds()
                while remaining > 0:
                    cancelled = False
                    if redis_client:
                        if redis_client.hget(f"{TIMER_PREFIX}:{rid}", "cancel") == "1":
                            redis_client.hset(f"{TIMER_PREFIX}:{rid}", "cancel", "0")
                            cancelled = True
                        elif redis_client.hget(f"{TIMER_PREFIX}:{rid}", "active_timer_id") != tid:
                            logger.info(f"[TIMER_SUPERSEDED] Timer {tid} for {rid} superseded by newer timer.")
                            return
                    elif rid in local_timer_store:
                        if local_timer_store[rid].get("cancel") == "1":
                            local_timer_store[rid]["cancel"] = "0"
                            cancelled = True
                        elif local_timer_store[rid].get("active_timer_id") != tid:
                            logger.info(f"[TIMER_SUPERSEDED] Timer {tid} for {rid} superseded by newer timer.")
                            return
                    if cancelled:
                        logger.info(f"[TIMER] Timer for {rid} cancelled (type: {ttype}).")
                        return
                    sio.sleep(1)
                    remaining = (end_time_local - datetime.utcnow()).total_seconds()

                logger.info(f"[TIMER] Timer for {rid} ended (type: {ttype}).")
                room = rooms_collection.find_one({"roomId": rid})
                if not room:
                    return

                phase = room.get('gamePhase')

                if ttype == "auto_spin_wheel":
                    if phase != "promptSpinner" or room.get("wheelSpun"):
                        logger.info(f"[TIMER] Ignoring stale auto_spin_wheel timer for {rid} (current phase: {phase})")
                        return
                    logger.info(f"[TIMER] Auto-spinning wheel for room {rid}")
                    now_ts = int(time.time() * 1000)
                    rooms_collection.update_one({"roomId": rid}, {"$set": {"wheelSpun": True, "spinStartTime": now_ts}})
                    broadcast_state(rid, {"$set": {"wheelSpun": True, "spinStartTime": now_ts}}, "promptSpinner", sio)
                    start_room_timer(rid, 4, "prompt_spinner_complete", sio)

                elif ttype == "prompt_spinner_complete":
                    if phase != "promptSpinner":
                        logger.info(f"[TIMER] Ignoring stale prompt_spinner_complete timer for {rid} (current phase: {phase})")
                        return
                    logger.info(f"[TIMER] Wheel spin complete for {rid}, moving to sentenceCreation")
                    rooms_collection.update_one({"roomId": rid}, {"$set": {"wheelSpun": False}})
                    broadcast_state(rid, {"$set": {"wheelSpun": False}}, "sentenceCreation", sio)
                    start_room_timer(rid, 90, "sentenceCreation", sio)

                elif ttype == "sentenceCreation":
                    if phase != "sentenceCreation":
                        logger.info(f"[TIMER] Ignoring stale sentenceCreation timer for {rid} (current phase: {phase})")
                        return
                    transition_res = rooms_collection.update_one(
                        {"roomId": rid, "gamePhase": "sentenceCreation"},
                        {"$set": {"gamePhase": "memeSelection"}}
                    )
                    if transition_res.modified_count == 0:
                        logger.info(f"[TIMER] Room {rid} already transitioned from sentenceCreation.")
                        return
                    logger.info(f"[TIMER] Sentence creation timed out for {rid}, using fallback prompt")
                    fallback_prompt = "When your boss catches you sleeping during work."
                    random_memes = get_memes_from_giphy()
                    sentence_update = {
                        "$set": {
                            "currentSentence": fallback_prompt,
                            "submissions": [],
                            "availableMemes": random_memes
                        }
                    }
                    rooms_collection.update_one({"roomId": rid}, sentence_update)
                    broadcast_state(rid, sentence_update, "memeSelection", sio)
                    start_room_timer(rid, 90, "memeSelection", sio)

                elif ttype == "memeSelection":
                    if phase != "memeSelection":
                        logger.info(f"[TIMER] Ignoring stale memeSelection timer for {rid} (current phase: {phase})")
                        return
                    transition_res = rooms_collection.update_one(
                        {"roomId": rid, "gamePhase": "memeSelection"},
                        {"$set": {"gamePhase": "voting", "votedPlayerIds": []}}
                    )
                    if transition_res.modified_count == 0:
                        logger.info(f"[TIMER] Room {rid} already transitioned from memeSelection.")
                        return
                    logger.info(f"[TIMER] Meme selection timed out for {rid}. Moving to voting.")
                    submissions = room.get("submissions", [])
                    players = room.get("players", [])
                    connected_players = [p for p in players if p.get("isConnected", True)]
                    x = len(connected_players)
                    if x <= 2:
                        vote_duration = 20
                    elif x == 3:
                        vote_duration = 30
                    elif x == 4:
                        vote_duration = 35
                    elif x == 5:
                        vote_duration = 40
                    elif x == 6:
                        vote_duration = 45
                    elif x == 7:
                        vote_duration = 50
                    elif x == 8:
                        vote_duration = 55
                    else:
                        vote_duration = 60

                    start_room_timer(rid, vote_duration, "voting", sio)
                    for s in submissions:
                        if "votes" not in s:
                            s["votes"] = []
                    broadcast_state(rid, {"$set": {"submissions": submissions, "votedPlayerIds": []}}, "voting", sio)

                elif ttype == "voting":
                    if phase != "voting":
                        logger.info(f"[TIMER] Ignoring stale voting timer for {rid} (current phase: {phase})")
                        return
                    current_round = room.get("currentRound", 1)
                    total_rounds = room.get("totalRounds", 5)
                    next_phase = "finalResults" if current_round >= total_rounds else "results"
                    transition_res = rooms_collection.update_one(
                        {"roomId": rid, "gamePhase": "voting"},
                        {"$set": {"gamePhase": next_phase}}
                    )
                    if transition_res.modified_count == 0:
                        logger.info(f"[TIMER] Room {rid} already transitioned from voting.")
                        return
                    logger.info(f"[TIMER] Voting timed out for {rid}. Calculating final scores for round.")
                    submissions = room.get("submissions", [])
                    players = room.get("players", [])

                    submissions = calculate_ranked_voting_scores(submissions)

                    updated_players = []
                    for p in players:
                        pid = p["id"]
                        sub = next((s for s in submissions if s["playerId"] == pid), None)
                        added_score = sub.get("roundScore", 0) if sub else 0
                        p["score"] = p.get("score", 0) + added_score
                        round_scores = p.get("roundScores", [])
                        round_scores.append(added_score)
                        p["roundScores"] = round_scores
                        updated_players.append(p)

                    rooms_collection.update_one(
                        {"roomId": rid},
                        {"$set": {"submissions": submissions, "players": updated_players}}
                    )

                    if int(current_round) >= int(total_rounds):
                        result_doc = finalize_game(rid)
                        final_update = {}
                        if result_doc:
                            final_update["$set"] = {"finalResult": result_doc, "submissions": submissions, "players": updated_players}
                        broadcast_state(rid, final_update, "finalResults", sio)
                        stop_game_timer(rid)
                    else:
                        broadcast_state(rid, {"$set": {"submissions": submissions, "players": updated_players}}, "results", sio)

            except Exception as e:
                logger.error(f"[TIMER] Error in timer worker for {rid}: {e}")

        sio.start_background_task(timer_worker, room_id, end_time, timer_type, my_timer_id)
        sio.emit('timerStarted', {
            'duration': duration,
            'endTime': end_time.isoformat()
        }, to=room_id)

    def stop_game_timer(room_id):
        logger.info(f"[TIMER] Stopping timer for {room_id}")
        cancel_timer(room_id)

    # --- PERIODIC CLEANUP ---

    def cleanup_old_data():
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            rooms_collection.delete_many({
                "lastActivity": {"$lt": cutoff_time},
                "gamePhase": {"$in": ["lobby", "results"]}
            })
            sessions_collection.delete_many({"lastSeen": {"$lt": cutoff_time}})
            otp_collection = rooms_collection.database["otp_verifications"]
            otp_collection.delete_many({"created_at": {"$lt": cutoff_time}})

            # Purge empty rooms whose 60-second grace period has expired
            grace_cutoff = datetime.utcnow() - timedelta(seconds=60)
            expired_rooms = list(rooms_collection.find({"emptySince": {"$lt": grace_cutoff}}))
            for r in expired_rooms:
                rid = r["roomId"]
                logger.info(f"[CLEANUP] Purging room {rid} (empty for >60s grace period).")
                rooms_collection.delete_one({"roomId": rid})
                sessions_collection.delete_many({"roomId": rid})
                cleanup_room_runtime(rid)

            if expired_rooms:
                logger.info(f"[CLEANUP] Cleaned up {len(expired_rooms)} expired empty rooms.")
        except Exception as e:
            logger.error(f"[CLEANUP] Error during cleanup: {str(e)}")

    def periodic_cleanup_worker():
        while True:
            socketio.sleep(30)
            cleanup_old_data()

    socketio.start_background_task(periodic_cleanup_worker)
