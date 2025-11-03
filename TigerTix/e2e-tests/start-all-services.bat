@echo off
title TigerTix Service Launcher
color 0B

echo.
echo   ████████╗██╗ ██████╗ ███████╗██████╗ ████████╗██╗██╗ ██╗
echo   ╚══██╔══╝██║██╔════╝ ██╔════╝██╔══██╗╚══██╔══╝██║╚██╗██╔╝
echo      ██║   ██║██║  ███╗█████╗  ██████╔╝   ██║   ██║ ╚███╔╝ 
echo      ██║   ██║██║   ██║██╔══╝  ██╔══██╗   ██║   ██║ ██╔██╗ 
echo      ██║   ██║╚██████╔╝███████╗██║  ██║   ██║   ██║██╔╝ ██╗
echo      ╚═╝   ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═╝
echo.
echo                     🎫 Automated Service Launcher 🎫
echo.

set "PROJECT_ROOT=c:\Users\Rayan Ahmed\Desktop\College Files\CPSC-3720\CPSC-3720-Project\TigerTix"
set "BACKEND_PATH=%PROJECT_ROOT%\backend"
set "FRONTEND_PATH=%PROJECT_ROOT%\frontend"

echo 🚀 Starting all TigerTix services in separate windows...
echo.

:: Check if paths exist
if not exist "%BACKEND_PATH%\admin-service" (
    echo ❌ Error: Admin service path not found!
    echo Path: %BACKEND_PATH%\admin-service
    pause
    exit /b 1
)

if not exist "%BACKEND_PATH%\client-service" (
    echo ❌ Error: Client service path not found!
    echo Path: %BACKEND_PATH%\client-service
    pause
    exit /b 1
)

if not exist "%BACKEND_PATH%\llm-driven-booking" (
    echo ❌ Error: LLM service path not found!
    echo Path: %BACKEND_PATH%\llm-driven-booking
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%" (
    echo ❌ Error: Frontend path not found!
    echo Path: %FRONTEND_PATH%
    pause
    exit /b 1
)

:: Start Admin Service (Port 5002)
echo 🟢 Starting Admin Service on port 5002...
start "TigerTix Admin Service (Port 5002)" cmd /k "cd /d "%BACKEND_PATH%\admin-service" && set PORT=5002 && echo 🎫 Admin Service Starting... && echo Port: 5002 && echo Path: %BACKEND_PATH%\admin-service && echo Press Ctrl+C to stop && echo ================================= && node server.js"

timeout /t 3 /nobreak > nul

:: Start Client Service (Port 6001)
echo 🔵 Starting Client Service on port 6001...
start "TigerTix Client Service (Port 6001)" cmd /k "cd /d "%BACKEND_PATH%\client-service" && set PORT=6001 && echo 🎫 Client Service Starting... && echo Port: 6001 && echo Path: %BACKEND_PATH%\client-service && echo Press Ctrl+C to stop && echo ================================= && node server.js"

timeout /t 3 /nobreak > nul

:: Start LLM Service (Port 5003)
echo 🟣 Starting LLM Service on port 5003...
start "TigerTix LLM Service (Port 5003)" cmd /k "cd /d "%BACKEND_PATH%\llm-driven-booking" && set PORT=5003 && echo 🎫 LLM Service Starting... && echo Port: 5003 && echo Path: %BACKEND_PATH%\llm-driven-booking && echo Press Ctrl+C to stop && echo ================================= && node server.js"

timeout /t 3 /nobreak > nul

:: Start Frontend (Port 3000)
echo 🟡 Starting Frontend on port 3000...
start "TigerTix Frontend (Port 3000)" cmd /k "cd /d "%FRONTEND_PATH%" && echo 🎫 Frontend Starting... && echo Port: 3000 && echo Path: %FRONTEND_PATH% && echo Press Ctrl+C to stop && echo ================================= && npm start"

echo.
echo ✨ All service windows have been opened!
echo.
echo 📋 Services started:
echo   • Admin Service:  http://localhost:5002
echo   • Client Service: http://localhost:6001  
echo   • LLM Service:    http://localhost:5003
echo   • Frontend:       http://localhost:3000
echo.
echo ⏳ Waiting 20 seconds for all services to initialize...

timeout /t 20 /nobreak > nul

echo.
echo 🧪 Ready to run integration tests!
echo.
echo To run tests, open a new terminal window and run:
echo   cd "%PROJECT_ROOT%\e2e-tests"
echo   npm run test:integration-only    (API tests only)
echo   npm run test:browser             (Browser E2E tests)
echo   npm run test:all                 (All tests)
echo.
echo 🛑 To stop all services: Close each terminal window or press Ctrl+C in each
echo.
echo Press any key to close this launcher window...
pause > nul