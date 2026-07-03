@echo off
title KodiFlow
cd /d "%~dp0"
echo Starting KodiFlow...
echo.
echo Open http://127.0.0.1:4174 in your browser.
echo Keep this window open while using KodiFlow.
echo.
node server.mjs
pause
