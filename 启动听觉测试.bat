@echo off
chcp 65001 >nul
title 听觉专注力测试系统 - 本地服务启动器
echo ===================================================
echo     清良思维 · 听觉专注力测试系统 (WebAssembly ASR)
echo ===================================================
echo.
echo 正在检查本地环境并启动 HTTP 服务 (端口 8080)...
echo 提示：通过 localhost 访问可永久免除麦克风重复弹框，并完整支持 WebAssembly！
echo.

cd /d "%~dp0"

:: 优先检测 Python 3
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 检测到 Python，正在启动微服务...
    start http://localhost:8080/听觉专注力测试.html
    python -m http.server 8080
    goto end
)

:: 次选检测 Node.js
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 检测到 Node.js，正在启动微服务...
    start http://localhost:8080/听觉专注力测试.html
    npx --yes http-server -p 8080 -c-1
    goto end
)

:: 若均无，直接唤起默认浏览器打开本地文件
echo [提示] 未检测到 Python 或 Node，正在直接唤起浏览器...
start "" "听觉专注力测试.html"

:end
pause
