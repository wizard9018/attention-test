# -*- coding: utf-8 -*-
"""
清良思维 · 视听双通道综合专注力测评系统 - 腾讯云 COS 静态托管全量发布工具
将前端 HTML、少年音 Base64 离线音频包、静态资源及排行榜全量发布至腾讯云 COS 存储桶
并设置 ACL='public-read' 供全球公网极速直接访问
"""

import os
import sys
import mimetypes
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from tencent_cloud_db import get_cos_client, BUCKET, REGION, get_all_records

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

cos = get_cos_client()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 待上传的关键静态资源清单
FILES_TO_UPLOAD = [
    # 核心页面 (同时发布为 综合专注力测试.html 与 index.html)
    ("综合专注力测试.html", "综合专注力测试.html", "text/html; charset=utf-8"),
    ("综合专注力测试.html", "index.html", "text/html; charset=utf-8"),
    ("视觉专注力测试.html", "视觉专注力测试.html", "text/html; charset=utf-8"),
    ("听觉专注力测试.html", "听觉专注力测试.html", "text/html; charset=utf-8"),
    
    # 核心 JS 依赖 (拼音解析库 + 1MB 少年音 Base64 离线离线包)
    ("assets/pinyin-pro.js", "assets/pinyin-pro.js", "application/javascript; charset=utf-8"),
    ("assets/audio_pack.js", "assets/audio_pack.js", "application/javascript; charset=utf-8"),
    
    # UI 图标与等级徽章
    ("assets/level_5.png", "assets/level_5.png", "image/png"),
    ("assets/level_6.png", "assets/level_6.png", "image/png"),
    ("assets/level_7.png", "assets/level_7.png", "image/png"),
    ("assets/level_8.png", "assets/level_8.png", "image/png"),
    ("assets/level_9.png", "assets/level_9.png", "image/png"),
    ("assets/level_10.png", "assets/level_10.png", "image/png"),
    ("assets/stage1_sample.png", "assets/stage1_sample.png", "image/png"),
    ("assets/stage2_sample.png", "assets/stage2_sample.png", "image/png"),
]

# 自动收集 92 个汉字备用 MP3 音频 (保底静态直链)
audio_dir = os.path.join(BASE_DIR, "assets", "audio", "chars")
if os.path.isdir(audio_dir):
    for fname in os.listdir(audio_dir):
        if fname.endswith(".mp3"):
            rel_path = os.path.join("assets", "audio", "chars", fname).replace("\\", "/")
            FILES_TO_UPLOAD.append((rel_path, rel_path, "audio/mpeg"))

def upload_single_file(item):
    local_rel, cos_key, content_type = item
    local_abs = os.path.join(BASE_DIR, local_rel)
    if not os.path.isfile(local_abs):
        return False, cos_key, "File not found locally"

    try:
        with open(local_abs, "rb") as f:
            body = f.read()
        
        cos.put_object(
            Bucket=BUCKET,
            Body=body,
            Key=cos_key,
            ContentType=content_type,
            ACL="public-read"
        )
        return True, cos_key, f"{len(body)} bytes"
    except Exception as e:
        return False, cos_key, str(e)

def main():
    print(f"==================================================")
    print(f"🚀 开始上传全量测试系统至腾讯云 COS 托管")
    print(f"目标存储桶: {BUCKET} ({REGION})")
    print(f"总计待上传文件数: {len(FILES_TO_UPLOAD)} 个")
    print(f"==================================================")

    # 1. 首先确保云端 database/all_records.json 为 public-read
    try:
        import json
        records = get_all_records(200)
        cos.put_object(
            Bucket=BUCKET,
            Body=json.dumps(records, ensure_ascii=False, indent=2).encode('utf-8'),
            Key="database/all_records.json",
            ContentType="application/json; charset=utf-8",
            ACL="public-read"
        )
        print("✓ [CloudDB] database/all_records.json 已更新并设置公网读权限")
    except Exception as e:
        print(f"⚠️ [CloudDB] database/all_records.json 更新异常: {e}")

    # 2. 多线程并发上传静态文件
    success_count = 0
    fail_count = 0

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(upload_single_file, item): item for item in FILES_TO_UPLOAD}
        for fut in as_completed(futures):
            ok, key, info = fut.result()
            if ok:
                success_count += 1
                print(f"✓ 上传成功: {key} ({info})")
            else:
                fail_count += 1
                print(f"❌ 上传失败: {key} - {info}")

    print(f"\n==================================================")
    print(f"上传完成统计: 成功 {success_count} 个, 失败 {fail_count} 个")
    print(f"==================================================")

    # 3. 验证主要入口的公网直接访问 URL
    test_urls = [
        f"https://{BUCKET}.cos.{REGION}.myqcloud.com/index.html",
        f"https://{BUCKET}.cos.{REGION}.myqcloud.com/综合专注力测试.html",
        f"https://{BUCKET}.cos.{REGION}.myqcloud.com/assets/audio_pack.js",
        f"https://{BUCKET}.cos.{REGION}.myqcloud.com/database/all_records.json"
    ]

    print("\n🔍 正在验证腾讯云公网托管链接可用性:")
    for u in test_urls:
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"  [HTTP {resp.status}] 正常访问 ➔ {u}")
        except Exception as e:
            print(f"  [ERROR] {e} ➔ {u}")

    print(f"\n🎉 腾讯云全网托管公网访问地址:")
    print(f"👉 主入口 (index.html): https://{BUCKET}.cos.{REGION}.myqcloud.com/index.html")
    print(f"👉 命名入口 (综合专注力测试.html): https://{BUCKET}.cos.{REGION}.myqcloud.com/综合专注力测试.html")

if __name__ == "__main__":
    main()
