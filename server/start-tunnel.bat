@echo off
title Champ Words - Public Tunnel
echo ========================================
echo  Starting public tunnel...
echo  COPY THE https:// URL SHOWN BELOW
echo  Keep this window OPEN while playing!
echo ========================================
"C:\Users\fanso\AppData\Local\Temp\cloudflared.exe" tunnel --url http://localhost:3000
pause
