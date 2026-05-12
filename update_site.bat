@echo off
set "version=Akram-akl"
echo Updating %version% Version...
git add .
git commit -m "Auto Update %version% - %date% %time%"
git push origin main
echo.
echo Version %version% Pushed Successfully!
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
