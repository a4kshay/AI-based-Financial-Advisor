import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from database import init_db, create_user, get_user_by_email, verify_password

def test_flow():
    # Remove existing db if any to start fresh locally
    db_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'users.db')
    if os.path.exists(db_file):
        os.remove(db_file)
        
    init_db()
    
    # Create user
    email = "test@example.com"
    username = "testuser"
    password = "password123"
    
    success = create_user(username, email, password)
    print(f"User creation: {success}")
    
    # Try creating duplicate
    duplicate = create_user(username, email, password)
    print(f"Duplicate creation: {duplicate} (should be False)")
    
    # Retrieve user
    user = get_user_by_email(email)
    if user:
        print(f"Retrieved user: id={user['id']}, username={user['username']}, email={user['email']}")
        print(f"Verify correct password: {verify_password(password, user['hashed_password'])}")
        print(f"Verify incorrect password: {verify_password('wrongpass', user['hashed_password'])}")
    else:
        print("User not found!")

if __name__ == '__main__':
    test_flow()
