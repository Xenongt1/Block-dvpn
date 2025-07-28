import jwt
import os
from datetime import datetime, timedelta

class AuthService:
    def __init__(self):
        self.secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key')

    def verify_token(self, token):
        """Verify JWT token and return user data"""
        try:
            data = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return data
        except jwt.ExpiredSignatureError:
            raise Exception('Token has expired')
        except jwt.InvalidTokenError:
            raise Exception('Invalid token')

    def generate_token(self, user_data):
        """Generate a new JWT token"""
        payload = {
            **user_data,
            'exp': datetime.utcnow() + timedelta(days=1)
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256') 