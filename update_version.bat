@echo off
set "version=Akram-akl"
echo Updating %version% Version...

:: Auto-increment version in version.json
powershell -Command "$json = Get-Content 'version.json' | ConvertFrom-Json; $parts = $json.build -replace 'v', '' -split '\.'; $minor = [int]$parts[1] + 1; $json.build = 'v' + $parts[0] + '.' + $minor; $json | ConvertTo-Json | Set-Content 'version.json'"
echo Version incremented in version.json

:: Get new version from version.json
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content 'version.json' | ConvertFrom-Json).build"') do set NEW_VERSION=%%i

:: Update APP_BUILD in app.js
powershell -Command "(Get-Content 'js\app.js') -replace 'const APP_BUILD = .*', 'const APP_BUILD = ''%NEW_VERSION%''' | Set-Content 'js\app.js'"
echo APP_BUILD updated in app.js to %NEW_VERSION%

git add .
git commit -m "Auto Update %version% - %date% %time%"
git push origin main
echo.
echo Version %NEW_VERSION% Pushed Successfully!
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
