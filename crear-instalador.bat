@echo off
setlocal

cd /d "%~dp0"

echo.
echo === Planilla DnD - Crear instalador ===
echo Carpeta: %CD%
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro npm. Instala Node.js y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: No se encontro package.json en esta carpeta.
  echo.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%v in (`node -e "console.log(require('./package.json').version)"`) do set "CURRENT_VERSION=%%v"

echo Version actual: %CURRENT_VERSION%
set /p APP_VERSION=Numero de version para este instalador [Enter = %CURRENT_VERSION%]: 
if "%APP_VERSION%"=="" set "APP_VERSION=%CURRENT_VERSION%"

call node -e "process.exit(/^[0-9]+\.[0-9]+\.[0-9]+$/.test(process.argv[1]) ? 0 : 1)" "%APP_VERSION%"
if errorlevel 1 (
  echo.
  echo ERROR: La version debe tener formato semver, por ejemplo 1.0.1
  pause
  exit /b 1
)

echo Actualizando version a %APP_VERSION%...
call node -e "const fs=require('fs'); const p='package.json'; const data=JSON.parse(fs.readFileSync(p,'utf8')); data.version=process.argv[1]; fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');" "%APP_VERSION%"
if errorlevel 1 (
  echo.
  echo ERROR: No se pudo actualizar package.json.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: Fallo npm install.
    pause
    exit /b 1
  )
)

echo.
echo Revisando firma digital...
if defined CSC_LINK (
  echo Se usara el certificado indicado por CSC_LINK.
) else if exist "build\codigo-firma.pfx" (
  echo Certificado encontrado: build\codigo-firma.pfx
  set "CSC_LINK=%CD%\build\codigo-firma.pfx"
  if not defined CSC_KEY_PASSWORD (
    set /p CSC_KEY_PASSWORD=Password del certificado PFX: 
  )
) else (
  echo AVISO: No se encontro certificado de firma.
  echo Para firmar el instalador, guarda tu certificado PFX en build\codigo-firma.pfx
  echo o define CSC_LINK y CSC_KEY_PASSWORD antes de ejecutar este script.
  echo El instalador se creara sin firma digital.
)

echo.
echo Creando instalador...
call npx -p node@20 node node_modules/electron-builder/cli.js --win nsis
if errorlevel 1 (
  echo.
  echo ERROR: Fallo la creacion del instalador.
  pause
  exit /b 1
)

echo.
echo Instalador creado en: installer-pdf-fields
echo.
pause
