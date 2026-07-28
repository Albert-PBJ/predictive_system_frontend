@echo off
REM ============================================================================
REM  Maescar frontend - modo TUNNEL (produccion / sitio publico)
REM  Compila el frontend y lo sirve en http://localhost:4173, que es lo que el
REM  Cloudflare Tunnel "maescar" publica en  https://imaescar.xyz
REM
REM  Necesita que el tunnel este corriendo (lo abre backend\run-tunnel.cmd).
REM  Orden recomendado:  1) backend\run-tunnel.cmd   2) este script.
REM
REM  Uso:  run-tunnel.cmd           -> compila y sirve
REM        run-tunnel.cmd nobuild   -> sirve el dist\ que ya existe (mas rapido)
REM
REM  Para APAGAR: Ctrl+C en esta ventana.
REM ============================================================================
cd /d "%~dp0"

if /i "%~1"=="nobuild" goto :serve

echo.
echo  === Compilando el frontend (usa .env.production -^> API publica) ===
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la compilacion. No se levanta el servidor.
    pause
    exit /b 1
)

:serve
if not exist "dist\index.html" (
    echo.
    echo  [ERROR] No existe dist\index.html. Ejecuta este script sin "nobuild".
    pause
    exit /b 1
)

echo.
echo  === FRONTEND EN MODO TUNNEL (publico via https://imaescar.xyz) ===
echo  Local: http://localhost:4173     Backend: https://api.api-maescar123.xyz
echo.

call npm run preview
