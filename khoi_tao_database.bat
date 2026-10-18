@echo off
echo ========================================================
echo    KHOI TAO CO SO DU LIEU AUTOMOTIVE WORKSHOP
echo ========================================================
echo.
"C:\Program Files\nodejs\node.exe" backend/src/scripts/setupDb.js %*
echo.
pause
