@echo off
echo Updating Quran Al-Readings (akram-akl Version) on GitHub...
git add .
set /p msg="Enter commit message for akram-akl version (or press enter for 'Update'): "
if "%msg%"=="" set msg="Update akram-akl version"
git commit -m "%msg%"
git push origin main
echo.
echo DONE! The akram-akl version is being deployed to:
echo https://akram-akl.github.io/Quran-Al-Readings/
pause
