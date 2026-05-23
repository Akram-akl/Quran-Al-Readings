@echo off
set "version=Akram-akl"
echo Updating %version% Version...

:: Auto-increment version in version.json and update app.js in one PowerShell command
powershell -Command "$json = Get-Content 'version.json' | ConvertFrom-Json; $parts = $json.build -replace 'v', '' -split '\.'; $minor = [int]$parts[1] + 1; $newVersion = 'v' + $parts[0] + '.' + $minor; $json.build = $newVersion; $json | ConvertTo-Json | Set-Content 'version.json'; (Get-Content 'js\app.js') -replace 'const APP_BUILD = .*', \"const APP_BUILD = '$newVersion'\" | Set-Content 'js\app.js'; Write-Host 'Version updated to:' $newVersion"
echo Version updated successfully

git add .
git commit -m "Auto Update %version% - %date% %time%"
git push origin main
echo.
echo Version Pushed Successfully!
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
