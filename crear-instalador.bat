@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "OUTPUT_DIR=installer-pdf-fields"
set "BUILD_OUTPUT_DIR=%OUTPUT_DIR%"
set "BUILDER_CMD=%PROJECT_DIR%\node_modules\.bin\electron-builder.cmd"
set "BUILDER_JS=%PROJECT_DIR%\node_modules\electron-builder\cli.js"
set "TAILWIND_CLI=%PROJECT_DIR%\node_modules\tailwindcss\lib\cli.js"
set "VITE_CLI=%PROJECT_DIR%\node_modules\vite\bin\vite.js"
set "DM_SCREEN_BUILD_SCRIPT=%PROJECT_DIR%\scripts\ensure-dm-screen-build.js"
set "PORTABLE_NODE=%PROJECT_DIR%\.tools\node-v20.19.0-win-x64\node.exe"
set "PORTABLE_NPM_CMD=%PROJECT_DIR%\.tools\node-v20.19.0-win-x64\npm.cmd"

echo.
echo === Planilla DnD - Crear instalador ===
echo Carpeta: %PROJECT_DIR%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro node. Instala Node.js y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

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

for /f "usebackq delims=" %%v in (`node -p "process.versions.node.split('.')[0]"`) do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR (
  echo ERROR: No se pudo detectar la version de Node.
  echo.
  pause
  exit /b 1
)

set "BUILD_NODE=node"
set "NPM_CMD=npm.cmd"
if %NODE_MAJOR% LSS 20 (
  if exist "%PORTABLE_NODE%" if exist "%PORTABLE_NPM_CMD%" (
    set "BUILD_NODE=%PORTABLE_NODE%"
    set "NPM_CMD=%PORTABLE_NPM_CMD%"
    echo Node del sistema es v%NODE_MAJOR%. Se usara Node portable 20 para instalar, compilar y empaquetar.
  ) else (
    echo ERROR: Node del sistema es v%NODE_MAJOR%, pero electron-builder requiere Node moderno.
    echo Instala Node 20+ o deja el portable en ".tools\node-v20.19.0-win-x64".
    echo.
    pause
    exit /b 1
  )
)

for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do set "CURRENT_VERSION=%%v"
if not defined CURRENT_VERSION (
  echo ERROR: No se pudo leer la version actual desde package.json.
  echo.
  pause
  exit /b 1
)

echo Version actual: %CURRENT_VERSION%
set "APP_VERSION="
set /p APP_VERSION=Numero de version para este instalador [Enter = %CURRENT_VERSION%]: 
if not defined APP_VERSION set "APP_VERSION=%CURRENT_VERSION%"

call :NormalizeVersion "%APP_VERSION%"
if errorlevel 1 (
  echo.
  echo ERROR: La version debe tener formato 1.0 o 1.0.1
  pause
  exit /b 1
)

if defined APP_VERSION if not "%APP_VERSION%"=="%NORMALIZED_VERSION%" (
  echo Version normalizada: %NORMALIZED_VERSION%
)
set "APP_VERSION=%NORMALIZED_VERSION%"

echo.
echo Actualizando version a %APP_VERSION%...
call "%NPM_CMD%" version "%APP_VERSION%" --no-git-tag-version --allow-same-version >nul
if errorlevel 1 (
  echo ERROR: La version indicada no es valida o no se pudo actualizar package.json.
  echo.
  pause
  exit /b 1
)

set "NEED_NPM_INSTALL="
if not exist "node_modules" set "NEED_NPM_INSTALL=1"
if not exist "%BUILDER_CMD%" set "NEED_NPM_INSTALL=1"
if not exist "%BUILDER_JS%" set "NEED_NPM_INSTALL=1"
if not exist "%TAILWIND_CLI%" set "NEED_NPM_INSTALL=1"
if not exist "%VITE_CLI%" set "NEED_NPM_INSTALL=1"

if not defined NEED_NPM_INSTALL (
  node -e "const pkg=require('./package.json'); const deps=[...Object.keys(pkg.dependencies||{}), ...Object.keys(pkg.devDependencies||{})]; const missing=deps.filter((name)=>{ try { require.resolve(name, { paths: [process.cwd()] }); return false; } catch (_error) { return true; } }); if (missing.length) { console.error('Faltan dependencias instaladas: ' + missing.join(', ')); process.exit(1); }"
  if errorlevel 1 set "NEED_NPM_INSTALL=1"
)

if defined NEED_NPM_INSTALL (
  echo Instalando dependencias...
  call "%NPM_CMD%" install
  if errorlevel 1 (
    echo.
    echo ERROR: Fallo npm install.
    pause
    exit /b 1
  )
)

node -e "const pkg=require('./package.json'); const deps=[...Object.keys(pkg.dependencies||{}), ...Object.keys(pkg.devDependencies||{})]; const missing=deps.filter((name)=>{ try { require.resolve(name, { paths: [process.cwd()] }); return false; } catch (_error) { return true; } }); if (missing.length) { console.error('Faltan dependencias instaladas: ' + missing.join(', ')); process.exit(1); }"
if errorlevel 1 (
  echo.
  echo ERROR: Faltan dependencias despues de npm install.
  echo.
  pause
  exit /b 1
)

if not exist "%BUILDER_CMD%" (
  echo ERROR: No se encontro electron-builder en node_modules.
  echo Ejecuta npm install y vuelve a intentar.
  echo.
  pause
  exit /b 1
)

if not exist "%BUILDER_JS%" (
  echo ERROR: No se encontro electron-builder\cli.js en node_modules.
  echo Ejecuta npm install y vuelve a intentar.
  echo.
  pause
  exit /b 1
)

if not exist "%DM_SCREEN_BUILD_SCRIPT%" (
  echo ERROR: No se encontro scripts\ensure-dm-screen-build.js.
  echo.
  pause
  exit /b 1
)

echo.
echo Compilando DM Screen...
call "%BUILD_NODE%" "%DM_SCREEN_BUILD_SCRIPT%" --force
if errorlevel 1 (
  echo.
  echo ERROR: Fallo la compilacion del DM Screen.
  echo Si el error menciona Node, instala Node 20+ o deja el portable en ".tools\node-v20.19.0-win-x64".
  echo.
  pause
  exit /b 1
)

echo.
echo Preparando carpeta de salida...
if exist "%OUTPUT_DIR%" (
  rmdir /s /q "%OUTPUT_DIR%" 2>nul
  if exist "%OUTPUT_DIR%" (
    set "BUILD_OUTPUT_DIR=%OUTPUT_DIR%-temp-%RANDOM%"
  )
)
if not "%BUILD_OUTPUT_DIR%"=="%OUTPUT_DIR%" (
  echo AVISO: "%OUTPUT_DIR%" esta en uso. Se generara el instalador en "%BUILD_OUTPUT_DIR%".
)

echo.
echo Revisando firma digital...
if defined CSC_LINK (
  echo Se usara el certificado indicado por CSC_LINK.
) else if exist "build\codigo-firma.pfx" (
  echo Certificado encontrado: build\codigo-firma.pfx
  set "CSC_LINK=%PROJECT_DIR%\build\codigo-firma.pfx"
  if not defined CSC_KEY_PASSWORD (
    set /p CSC_KEY_PASSWORD=Password del certificado PFX: 
  )
) else (
  echo AVISO: No se encontro certificado de firma.
  echo El instalador se creara sin firma digital.
  set "CSC_IDENTITY_AUTO_DISCOVERY=false"
)

echo.
echo Creando instalador...
set "ELECTRON_RUN_AS_NODE="
if defined CSC_LINK (
  call "%BUILD_NODE%" "%BUILDER_JS%" --win nsis -c.directories.output=%BUILD_OUTPUT_DIR%
) else (
  call "%BUILD_NODE%" "%BUILDER_JS%" --win nsis -c.directories.output=%BUILD_OUTPUT_DIR% -c.win.signAndEditExecutable=false
)
if errorlevel 1 (
  echo.
  echo ERROR: Fallo la creacion del instalador.
  echo Si el error menciona archivos en uso, cierra la app o cualquier ejecutable abierto desde "%OUTPUT_DIR%".
  echo.
  pause
  exit /b 1
)

set "SETUP_EXE="
for /f "delims=" %%f in ('dir /b /a-d "%BUILD_OUTPUT_DIR%\*.exe" 2^>nul') do if not defined SETUP_EXE set "SETUP_EXE=%BUILD_OUTPUT_DIR%\%%f"

echo.
if defined SETUP_EXE (
  echo Instalador creado: %SETUP_EXE%
) else (
  echo Instalador creado en: %BUILD_OUTPUT_DIR%
)
echo.
pause
exit /b 0

:NormalizeVersion
setlocal EnableDelayedExpansion
set "RAW_VERSION=%~1"
set "RAW_VERSION=!RAW_VERSION: =!"
if not defined RAW_VERSION set "RAW_VERSION=%CURRENT_VERSION%"
set "PART1="
set "PART2="
set "PART3="
set "PART4="

for /f "tokens=1-4 delims=." %%a in ("!RAW_VERSION!") do (
  set "PART1=%%a"
  set "PART2=%%b"
  set "PART3=%%c"
  set "PART4=%%d"
)

if not defined PART1 exit /b 1
if not defined PART2 exit /b 1
if defined PART4 exit /b 1
echo(!PART1!| findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 exit /b 1
echo(!PART2!| findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 exit /b 1
if defined PART3 (
  echo(!PART3!| findstr /R "^[0-9][0-9]*$" >nul
  if errorlevel 1 exit /b 1
)
if defined PART3 (
  endlocal & set "NORMALIZED_VERSION=%RAW_VERSION%" & exit /b 0
)
endlocal & set "NORMALIZED_VERSION=%RAW_VERSION%.0" & exit /b 0
