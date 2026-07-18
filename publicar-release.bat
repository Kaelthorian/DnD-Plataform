@echo off
setlocal
title Publicar release de GitHub

cd /d "%~dp0"

echo ==========================================
echo   Publicar release de DnD Platform
echo ==========================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$secureToken = Read-Host 'Introduce tu GitHub Token' -AsSecureString; ^
   $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken); ^
   try { ^
       $env:GH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr); ^
       Write-Host ''; ^
       Write-Host 'Iniciando compilacion y publicacion...'; ^
       npm run publish:win; ^
       $exitCode = $LASTEXITCODE; ^
       Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue; ^
       exit $exitCode ^
   } finally { ^
       [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) ^
   }"

if errorlevel 1 (
    echo.
    echo ==========================================
    echo   ERROR: no se pudo publicar el release
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo   Release publicado correctamente
    echo ==========================================
)

echo.
pause
endlocal