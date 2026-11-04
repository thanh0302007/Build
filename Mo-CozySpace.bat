@echo off
set ELECTRON_RUN_AS_NODE=
if exist "%~dp0release\win-unpacked\CozySpace.exe" (
  start "" "%~dp0release\win-unpacked\CozySpace.exe"
) else (
  cd /d "%~dp0"
  npm run electron:dev
)

