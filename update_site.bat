@echo off
echo Updating Quran Al-Readings on GitHub...
git add .
set /p msg="Enter commit message (or press enter for 'Update'): "
if "%msg%"=="" set msg="Update"
git commit -m "%msg%"
git push origin main
echo.
echo DONE! Your changes are being deployed to:
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
