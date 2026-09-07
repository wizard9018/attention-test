@echo off
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
title 中文 3 字 / 5 字三大离线语音识别模型评测台

echo ======================================================================
echo       中文 3 字 / 5 字三大开源离线模型评测台 (100%% 本地开源/免GPU)
echo ======================================================================
echo 包含 3 大中文模型：
echo   1. SenseVoice-Small (阿里达摩院多语言富文本极速模型)
echo   2. Sherpa-onnx + Zipformer-PPN (新一代 Kaldi 拼音声学模型)
echo   3. FunASR - FSMN-CTC (阿里达摩院非自回归 CTC 预测模型)
echo.
echo 特性：
echo   - 每次录音额外多给 2 秒缓冲时间，发音从容不截断
echo   - 自动生成本轮正确率与累计总成绩排行榜 (Scoreboard)
echo ======================================================================
echo.

cd /d "%~dp0asr_benchmark"
python interactive_test.py

pause
