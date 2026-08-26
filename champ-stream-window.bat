@echo off
rem ============================================================
rem  Champ Words - Studio Stream Window (540x960)
rem  Opens the game in a clean Chrome app window, sized exactly
rem  for the TikTok Live Studio canvas. Screen-share or window-
rem  capture this window as your game source.
rem ============================================================

set URL=https://champ-words.onrender.com/game?auto=1

rem Try the standard Chrome install paths first
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=540,990 --window-position=200,50
  exit /b
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=540,990 --window-position=200,50
  exit /b
)

rem Fallback: rely on Chrome being in PATH
start chrome --app="%URL%" --window-size=540,990 --window-position=200,50
