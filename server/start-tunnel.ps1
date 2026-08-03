$cf = "C:\Users\fanso\AppData\Local\Temp\cloudflared.exe"
$proc = Start-Process -FilePath $cf -ArgumentList "tunnel","--url","http://localhost:3000" -WindowStyle Hidden -RedirectStandardOutput "C:\Users\fanso\AppData\Local\Temp\cf-out.txt" -RedirectStandardError "C:\Users\fanso\AppData\Local\Temp\cf-err.txt" -PassThru
Start-Sleep -Seconds 12
Write-Output "PID: $($proc.Id)"
Get-Content "C:\Users\fanso\AppData\Local\Temp\cf-err.txt" -ErrorAction SilentlyContinue | Select-String "trycloudflare" | Select-Object -First 1
