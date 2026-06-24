import subprocess
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

has_mysql = os.path.exists(r"C:\xampp\mysql\bin\mysqld.exe")

if has_mysql:
    subprocess.Popen(
        ["cmd", "/k", "title MySQL && cd /d " + BASE_DIR + " && echo MySQL starting... && \"C:\\xampp\\mysql\\bin\\mysqld.exe\" --defaults-file=\"C:\\xampp\\mysql\\bin\\my.ini\" --standalone"],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

subprocess.Popen(
    ["cmd", "/k", "title Node Server && cd /d " + BASE_DIR + " && node server.js"],
    creationflags=subprocess.CREATE_NEW_CONSOLE
)

import time
time.sleep(2)

import urllib.request
try:
    urllib.request.urlopen("http://localhost:5000", timeout=5)
    print("Server is running on http://localhost:5000")
except Exception:
    print("Waiting for server...")
    time.sleep(3)
    try:
        urllib.request.urlopen("http://localhost:5000", timeout=5)
        print("Server is running on http://localhost:5000")
    except Exception:
        print("Warning: Server may not be ready yet")

subprocess.Popen(
    ["cmd", "/c", "start http://localhost:5000"],
    shell=True
)

print("Development servers launched.")
print("  Frontend: http://localhost:5000")
print("  Admin:    http://localhost:5000/admin")
print("  Admin login: admin / admin123")
