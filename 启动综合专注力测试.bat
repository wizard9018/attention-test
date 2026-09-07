@echo off
chcp 65001 >nul
title 视听双通道综合专注力测评系统 - 本地服务启动器
echo ===================================================
echo     清良思维 · 视听双通道综合专注力测评系统
echo     (先测听觉后测视觉 · 乘积总分与六维认知雷达图)
echo ===================================================
echo.
echo 正在检查本地环境并启动 HTTP 服务 (端口 8080)...
echo.

cd /d "%~dp0"

:: 优先检测 Python 3
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 检测到 Python，正在启动测评网关与腾讯云数据库同步服务...
    start http://localhost:8080/综合专注力测试.html
    python server.py
    goto end
)

:: 次选检测 Node.js
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 检测到 Node.js，正在启动服务并打开综合测试...
    start http://localhost:8080/综合专注力测试.html
    npx --yes http-server -p 8080 -c-1
    goto end
)

:: 若均无，直接唤起默认浏览器打开本地文件
echo [提示] 正在直接唤起浏览器...
start "" "综合专注力测试.html"

:end
pause
