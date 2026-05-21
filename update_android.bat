@echo off
echo Updating Android project from PWA...
cd /d "%~dp0..\Quran_Android"
call npx cap copy android
if errorlevel 1 (
    echo FAILED. Run: npm install   inside Quran_Android folder first.
    pause
    exit /b 1
)
echo Done! Open folder: Quran_Android\android   in Android Studio, then Build APK.
pause
