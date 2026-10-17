@echo off
chcp 65001 > nul
echo ========================================================
echo       KHỞI ĐỘNG BACKEND API (PORT 3000)
echo ========================================================
echo.
cd backend
"C:\Program Files\nodejs\npm.cmd" run dev
pause
