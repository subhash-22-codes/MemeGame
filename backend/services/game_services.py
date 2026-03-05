from datetime import datetime, timedelta


def get_room_with_validation(room_id, rooms_collection):
    """Get room and validate it exists"""
    room = rooms_collection.find_one({"roomId": room_id})
    if not room:
        return None, "Room not found"
    return room, None
  
def get_player_and_room(
    sid: str,
    room_id: str,
    rooms_collection,
    get_socket_mapping,
    logger
) -> tuple[dict | None, dict | None, str | None]:
    """
    Utility to securely get the player and room from a socket ID.
    Returns: (player, room, error_message)
    """
    try:
        mapping = get_socket_mapping(sid)

        def _val(key: str) -> str:
            v = mapping.get(key) or mapping.get(key.encode())
            if isinstance(v, bytes):
                return v.decode()
            return v or ""

        player_id = _val("playerId")

        if not player_id:
            logger.error(f"[AUTH_ERROR] No player_id found for sid {sid}. Mapping: {mapping}")
            return None, None, "Player session not found. Please reconnect."

        room = rooms_collection.find_one({"roomId": room_id})
        if not room:
            return None, None, "Room not found."

        player = next((p for p in room.get("players", []) if p["id"] == player_id), None)

        if not player:
            return None, room, "Player not in this room."

        return player, room, None

    except Exception as e:
        logger.error(f"[AUTH_ERROR] Exception in get_player_and_room: {e}")
        return None, None, "A server error occurred during authentication."
      


def update_and_broadcast_state(
    room_id: str,
    update_query: dict,
    new_phase: str,
    rooms_collection,
    socketio,
    json_safe,
    logger
):
    """
    Update game state in Mongo and broadcast new state to clients.
    """
    try:
        if "$set" not in update_query:
            update_query["$set"] = {}

        update_query["$set"]["gamePhase"] = new_phase
        update_query["$set"]["lastActivity"] = datetime.utcnow()

        rooms_collection.update_one({"roomId": room_id}, update_query)

        room = rooms_collection.find_one(
            {"roomId": room_id},
            {
                "roomId": 1,
                "players": 1,
                "gamePhase": 1,
                "currentRound": 1,
                "totalRounds": 1,
                "currentJudge": 1,
                "currentSentence": 1,
                "submissions": 1,
                "host": 1,
                "_id": 0,
                "availableMemes": 1
            }
        )

        if not room:
            logger.error(f"Failed to find room {room_id} after update")
            return

        socketio.emit("gameStateUpdate", json_safe(room), to=room_id)
        logger.info(f"[STATE_CHANGE] Room {room_id} advanced to {new_phase}")

    except Exception as e:
        logger.error(f"Error in update_and_broadcast_state: {e}")
        socketio.emit(
            "error",
            {"error": "A server error occurred", "code": "STATE_CHANGE_FAILED"},
            to=room_id
        )
        


def finalize_game(
    room_id: str,
    rooms_collection,
    game_results_collection,
    logger
) -> dict | None:
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
        host_id = host_data.get("id") if host_data else None

        result_doc = {
            "roomId": room_id,
            "host": host_data,
            "allJudges": [host_id] if host_id else [],
            "winners": winners,
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