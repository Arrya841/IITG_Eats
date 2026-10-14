@echo off
cd /d "%~dp0"
echo IITG Eats portal preview: http://localhost:8080
start "" "http://localhost:8080/index.html"
py -m http.server 8080
if errorlevel 1 (
  echo Python launcher 'py' is not available. Trying 'python'.
  python -m http.server 8080
)
pause
