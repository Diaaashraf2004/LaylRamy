@echo off
chcp 65001 > nul
title تشغيل نظام المحاسبة (Local ERP Server)
color 0A
echo ====================================================
echo   جاري تشغيل خادم المحاسبة المحلي على:
echo   http://localhost:8080
echo ====================================================
echo.
start http://localhost:8080
node server.js
pause
