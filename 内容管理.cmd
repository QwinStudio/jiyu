@echo off
setlocal
title JIYUGebit Content Manager
echo.
echo [1] Add video
echo [2] Add note
echo [3] Add travel album
echo [4] Sync albums and generate thumbnails
echo [5] Update search index
echo [6] Update site version
echo.
choice /C 123456 /N /M "Select an option"
if errorlevel 6 goto :version
if errorlevel 5 goto :index
if errorlevel 4 goto :cover
if errorlevel 3 goto :album
if errorlevel 2 goto :note
if errorlevel 1 goto :video

:video
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode video
goto :end

:note
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode note
goto :end

:album
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode album
goto :end

:cover
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode sync
goto :end

:index
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode index
goto :end

:version
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\content-manager.ps1" -Mode version

:end
echo.
pause
