@echo off
REM Script to test the auto-close issues workflow locally

setlocal enabledelayedexpansion

cd /d "c:\Users\leenny\Documents\codicini\lol-profile-editor"

echo.
echo ========================================
echo Testing Auto-Close Issues Workflow
echo ========================================
echo.

echo [1/3] Setting up environment variables...

REM Get the PR number from user or use default
if "%1"=="" (
    set PR_NUMBER=1
    echo Using default PR number: 1
) else (
    set PR_NUMBER=%1
    echo Using PR number: %PR_NUMBER%
)

echo [2/3] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)

echo.
echo [3/3] Running auto-close issues script...
echo.

REM Test with local commit messages
git log --oneline -10

echo.
echo To use the auto-close feature:
echo.
echo 1. Add this to your commit message:
echo    Fixes #123
echo    Closes #456
echo.
echo 2. Or add it to your PR description:
echo    This PR fixes issues #123 and #456
echo.
echo 3. The workflow will automatically:
echo    - Detect the issue numbers
echo    - Add comments to the issues
echo    - Close the issues
echo.
echo For manual testing, run:
echo    set GITHUB_TOKEN=your_token
echo    set PR_NUMBER=123
echo    node .github\scripts\close-resolved-issues.js
echo.
