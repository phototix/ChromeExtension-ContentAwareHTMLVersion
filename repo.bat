@echo off
echo Running git commands in current directory...
echo.

REM Set commit message from first argument or default to "Update"
setlocal EnableExtensions
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update"

REM Change to the directory where the batch file is located
cd /d "%~dp0"

REM Check if git is available
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in PATH.
    pause
    exit /b 1
)

REM Check if current directory is a git repository
git status >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Current directory is not a git repository.
    pause
    exit /b 1
)

REM Run git commands
echo Adding changes...
git add .
if %errorlevel% neq 0 (
    echo Error: Failed to add changes.
    pause
    exit /b 1
)

echo Committing changes...
echo Commit message: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo Error: Failed to commit changes.
    pause
    exit /b 1
)

echo Pushing changes...
git push
if %errorlevel% neq 0 (
    echo Error: Failed to push changes.
    pause
    exit /b 1
)

echo.
echo All git commands completed successfully!