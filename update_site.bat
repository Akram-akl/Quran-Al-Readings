@echo off
set "version=Akram-akl"
echo Updating %version% Version...

:: Auto-increment version in version.json
powershell -Command "$json = Get-Content 'version.json' | ConvertFrom-Json; $parts = $json.build -replace 'v', '' -split '\.'; $minor = [int]$parts[1] + 1; $json.build = 'v' + $parts[0] + '.' + $minor; $json | ConvertTo-Json | Set-Content 'version.json'"
echo Version incremented in version.json

git add .
git commit -m "Auto Update %version% - %date% %time%"
git push origin main
echo.
echo Version %version% Pushed Successfully!
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
