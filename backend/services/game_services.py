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
      


def get_client_safe_room(room: dict, target_player_id: str | None = None) -> dict:
    if not room:
        return room

    if room.get("gamePhase") == "voting":
        safe_room = dict(room)
        submissions = room.get("submissions", [])
        filtered_subs = []
        for s in submissions:
            # 1) A player must never receive their own meme in the voting payload
            if target_player_id and s.get("playerId") == target_player_id:
                continue
            # 2) Strip playerId from outbound payload for anonymity
            sub_copy = {k: v for k, v in s.items() if k != "playerId"}
            filtered_subs.append(sub_copy)
        safe_room["submissions"] = filtered_subs
        if target_player_id and "playerMemes" in room and target_player_id in room.get("playerMemes", {}):
            safe_room["availableMemes"] = room["playerMemes"][target_player_id]
        return safe_room

    if target_player_id and "playerMemes" in room and target_player_id in room.get("playerMemes", {}):
        safe_room = dict(room)
        safe_room["availableMemes"] = room["playerMemes"][target_player_id]
        return safe_room

    return room


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
        old_room = rooms_collection.find_one({"roomId": room_id}, {"gamePhase": 1})
        old_phase = old_room.get("gamePhase") if old_room else None

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
                "promptCreator": 1,
                "creatorOrder": 1,
                "creatorHistory": 1,
                "wheelSpinnerId": 1,
                "wheelSpun": 1,
                "spinStartTime": 1,
                "votedPlayerIds": 1,
                "currentSentence": 1,
                "submissions": 1,
                "host": 1,
                "_id": 0,
                "availableMemes": 1,
                "playerMemes": 1,
                "rerollTokensUsed": 1,
                "customPrompts": 1
            }
        )

        if not room:
            logger.error(f"Failed to find room {room_id} after update")
            return

        if new_phase == "voting" or room.get("gamePhase") == "voting":
            players = room.get("players", [])
            for p in players:
                pid = p.get("id")
                if pid:
                    safe_room = get_client_safe_room(room, pid)
                    socketio.emit("gameStateUpdate", json_safe(safe_room), to=f"player_{pid}")
        else:
            socketio.emit("gameStateUpdate", json_safe(room), to=room_id)
            
        if old_phase != new_phase:
            logger.info(f"[STATE_CHANGE] Room {room_id} advanced from {old_phase} to {new_phase}")
        else:
            logger.info(f"[STATE_UPDATE] Room {room_id} updated in phase {new_phase}")

    except Exception as e:
        logger.error(f"Error in update_and_broadcast_state: {e}")
        socketio.emit(
            "error",
            {"error": "A server error occurred", "code": "STATE_CHANGE_FAILED"},
            to=room_id
        )
        