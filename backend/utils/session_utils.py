import time
import random
import string

def generate_session_id():
    """Generate a unique session ID"""
    return 'session-' + str(int(time.time())) + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))