@echo off
setlocal
cd /d "%~dp0"
if exist "%CD%\.jdk\jdk-21.0.12.1+1\bin\java.exe" (
  set "JAVA_HOME=%CD%\.jdk\jdk-21.0.12.1+1"
  set "PATH=%JAVA_HOME%\bin;%PATH%"
)
if exist "%CD%\.android-sdk\cmdline-tools\latest\bin\sdkmanager.bat" (
  set "ANDROID_HOME=%CD%\.android-sdk"
  set "ANDROID_SDK_ROOT=%CD%\.android-sdk"
  set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"
)
echo.
echo FloristEver - criar pacote Android para enviar
echo ==============================================
echo.
npm.cmd run android:share:debug
echo.
pause
