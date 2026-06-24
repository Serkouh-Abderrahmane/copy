@echo off
title Luon Vuituoi - Local Server
cd /d "%~dp0.."
echo ========================================
echo   LUON VUI TUOI - Local Development
echo ========================================
echo.
echo [..] Checking MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>nul | find /I "mysqld.exe" >nul
if errorlevel 1 goto start_mysql
echo [OK] MySQL is running
goto start_node
:start_mysql
if not exist "C:\xampp\mysql\bin\mysqld.exe" goto no_mysql
echo [..] Starting MySQL...
start "MySQL" /MIN "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
echo [OK] MySQL started
timeout /t 3 /nobreak >nul
goto start_node
:no_mysql
echo [WARN] MySQL not found
:start_node
echo [..] Starting Node.js...
start "Node Server" /MIN node server.js
timeout /t 3 /nobreak >nul
echo [..] Opening browser...
start http://localhost:5000
echo.
echo ========================================
echo   http://localhost:5000
echo   http://localhost:5000/admin
echo   Admin: admin / admin123
echo ========================================
echo.
:wait
timeout /t 30 /nobreak >nul
goto wait
