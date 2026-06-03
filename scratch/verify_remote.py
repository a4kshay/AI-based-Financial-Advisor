import urllib.request
import json
import random

def test_remote_flow():
    base_url = "https://ai-financial-advisor-api.onrender.com"
    
    # Generate unique test user credentials
    rand_num = random.randint(10000, 99999)
    username = f"user_{rand_num}"
    email = f"test_{rand_num}@example.com"
    password = "password123"
    
    print(f"Testing with unique credentials:")
    print(f"Username: {username}")
    print(f"Email: {email}")
    
    # 1. Signup Request
    signup_url = f"{base_url}/api/signup"
    signup_data = json.dumps({
        "username": username,
        "email": email,
        "password": password
    }).encode('utf-8')
    
    req_signup = urllib.request.Request(
        signup_url, 
        data=signup_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req_signup) as response:
            res_body = response.read().decode('utf-8')
            print(f"Signup response: {res_body}")
    except urllib.error.HTTPError as e:
        print(f"Signup HTTPError: {e.code} - {e.read().decode('utf-8')}")
        return
    except Exception as e:
        print(f"Signup Exception: {e}")
        return

    # 2. Login Request
    login_url = f"{base_url}/api/login"
    login_data = json.dumps({
        "email": email,
        "password": password
    }).encode('utf-8')
    
    req_login = urllib.request.Request(
        login_url, 
        data=login_data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req_login) as response:
            res_body = response.read().decode('utf-8')
            print(f"Login response: {res_body}")
    except urllib.error.HTTPError as e:
        print(f"Login HTTPError: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Login Exception: {e}")

if __name__ == '__main__':
    test_remote_flow()
