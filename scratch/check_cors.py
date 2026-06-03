import urllib.request

def check_headers():
    url = "https://ai-financial-advisor-api.onrender.com/"
    req = urllib.request.Request(
        url,
        headers={
            'Origin': 'https://example-frontend.vercel.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        },
        method='OPTIONS'  # CORS preflight check
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("CORS Preflight (OPTIONS) Headers:")
            for header, value in response.getheaders():
                print(f"  {header}: {value}")
    except Exception as e:
        print(f"CORS OPTIONS request failed: {e}")

    # Standard GET request check
    req_get = urllib.request.Request(url, headers={'Origin': 'https://example-frontend.vercel.app'})
    try:
        with urllib.request.urlopen(req_get) as response:
            print("\nGET Request Headers:")
            for header, value in response.getheaders():
                print(f"  {header}: {value}")
    except Exception as e:
        print(f"GET request failed: {e}")

if __name__ == '__main__':
    check_headers()
