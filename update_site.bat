@echo off
set "version=Akram-akl"
echo Updating %version%...

git add .
git commit -m "Update %version% - %date% %time%"
git push origin main
echo.
echo Pushed Successfully!
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
