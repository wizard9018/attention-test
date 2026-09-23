@echo off
chcp 65001 >nul
echo 正在启动听觉专注训练本地测试环境...
echo.

start "网页服务器 (8931)" cmd /k "cd /d "%~dp0" && py -3 -m http.server 8931"

timeout /t 2 >nul
start http://localhost:8931/concentration_v1.html

echo 网页服务窗口已经打开，关掉那个黑色窗口就是停止服务。
pause
