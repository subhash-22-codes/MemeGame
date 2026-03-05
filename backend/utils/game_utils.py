import random
import string
import time

def generate_unique_room_id(rooms_collection):
    attempts = 0

    while attempts < 10:
        room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        if not rooms_collection.find_one({"roomId": room_id}):
            return room_id

        attempts += 1

    return str(int(time.time()))[-6:].upper()