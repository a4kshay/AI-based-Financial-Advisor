import os
import re

frontend_dir = r"c:\Users\Akshay\Desktop\project22\frontend\src"

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If it has a constant like const API_BASE = 'http://localhost:8000';
    if "const API_BASE = 'http://localhost:8000';" in content:
        content = content.replace(
            "const API_BASE = 'http://localhost:8000';",
            "const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';"
        )
    
    # If it has inline axios calls like axios.post('http://localhost:8000/api/...
    # Find all occurrences of 'http://localhost:8000/api/...
    # We replace 'http://localhost:8000...' with `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}...`
    pattern = r"'http://localhost:8000([^']+)'"
    replacement = r"`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}\1`"
    content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.jsx', '.js')):
            replace_in_file(os.path.join(root, file))

# Fix vite.config.js
vite_conf = r"c:\Users\Akshay\Desktop\project22\frontend\vite.config.js"
if os.path.exists(vite_conf):
    with open(vite_conf, 'r', encoding='utf-8') as f:
        content = f.read()
    # It probably doesn't need to change if it's just a proxy for local dev.
    # We'll leave vite config alone, proxy is only for dev server.
