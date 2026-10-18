@echo off
chcp 65001 > nul
echo ========================================================
echo       KHỞI ĐỘNG FRONTEND WEB (PORT 5173)
echo ========================================================
echo.
cd frontend
"C:\Program Files\nodejs\npm.cmd" run dev
pause
