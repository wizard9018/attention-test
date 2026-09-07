# -*- coding: utf-8 -*-
"""
清良思维 · 视听双通道专注力测评系统 - 腾讯云数据库同步模块
支持 SQLite 本地持久化 + 腾讯云 (Tencent Cloud) 数据同步
"""

import os
import sys
import json
import sqlite3
import datetime
from qcloud_cos import CosConfig, CosS3Client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 自动加载本地 .env 环境变量文件 (若存在)
_env_file = os.path.join(BASE_DIR, ".env")
if os.path.isfile(_env_file):
    try:
        with open(_env_file, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())
    except Exception:
        pass

# 腾讯云凭据配置 (优先从环境变量读取，安全合规)
SECRET_ID = os.environ.get("TENCENT_SECRET_ID", "")
SECRET_KEY = os.environ.get("TENCENT_SECRET_KEY", "")
REGION = os.environ.get("TENCENT_REGION", "ap-beijing")
BUCKET = os.environ.get("TENCENT_BUCKET", "asr-1322227270")

DB_DIR = os.path.join(BASE_DIR, "database")
os.makedirs(DB_DIR, exist_ok=True)
SQLITE_PATH = os.path.join(DB_DIR, "records.sqlite")

def get_cos_client():
    try:
        config = CosConfig(Region=REGION, SecretId=SECRET_ID, SecretKey=SECRET_KEY, Token=None, Scheme='https')
        return CosS3Client(config)
    except Exception as e:
        print(f"[TencentCloud] COS client init error: {e}")
        return None

def get_db():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_local_db():
    with get_db() as conn:
        conn.execute('''
        CREATE TABLE IF NOT EXISTS student_attention_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id TEXT UNIQUE,
            player_name TEXT NOT NULL,
            player_school TEXT NOT NULL,
            auditory_score INTEGER NOT NULL,
            visual_score INTEGER NOT NULL,
            total_score INTEGER NOT NULL,
            test_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            raw_details TEXT
        )
        ''')

init_local_db()

def save_record(player_name, player_school, auditory_score, visual_score, raw_details=None):
    """
    保存单次测试结果：
    1. 写入 SQLite (上下文安全写入)
    2. 同步上传至腾讯云 COS (单条 JSON 文档 + 汇总 all_records.json)
    """
    now = datetime.datetime.now()
    created_at = now.isoformat()
    test_date = now.strftime("%Y-%m-%d")
    record_id = f"rec_{now.strftime('%Y%m%d_%H%M%S')}_{os.urandom(3).hex()}"
    
    aud_s = int(auditory_score)
    vis_s = int(visual_score)
    tot_s = aud_s * vis_s
    name = (player_name or "未命名考生").strip()
    school = (player_school or "未填写学校").strip()
    raw_str = json.dumps(raw_details or {}, ensure_ascii=False) if isinstance(raw_details, dict) else str(raw_details or "{}")

    # 1. 本地 SQLite 写入
    with get_db() as conn:
        conn.execute('''
        INSERT INTO student_attention_records 
        (record_id, player_name, player_school, auditory_score, visual_score, total_score, test_date, created_at, raw_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (record_id, name, school, aud_s, vis_s, tot_s, test_date, created_at, raw_str))

    doc = {
        "record_id": record_id,
        "player_name": name,
        "player_school": school,
        "auditory_score": aud_s,
        "visual_score": vis_s,
        "total_score": tot_s,
        "test_date": test_date,
        "created_at": created_at,
        "details": raw_details or {}
    }

    # 2. 上传腾讯云
    cloud_synced = False
    cos = get_cos_client()
    if cos:
        try:
            # A. 保存单记录文件
            key = f"database/records/{record_id}.json"
            cos.put_object(
                Bucket=BUCKET,
                Body=json.dumps(doc, ensure_ascii=False, indent=2).encode('utf-8'),
                Key=key,
                ContentType='application/json; charset=utf-8'
            )
            
            # B. 更新汇总文件 (用于排行榜与列表全览)
            all_records = get_all_records(limit=200)
            summary_key = "database/all_records.json"
            cos.put_object(
                Bucket=BUCKET,
                Body=json.dumps(all_records, ensure_ascii=False, indent=2).encode('utf-8'),
                Key=summary_key,
                ContentType='application/json; charset=utf-8',
                ACL='public-read'
            )
            cloud_synced = True
            print(f"[TencentCloud] Successfully synced record {record_id} to {BUCKET}")
        except Exception as e:
            print(f"[TencentCloud] Upload failed: {e}")

    return {
        "success": True,
        "record_id": record_id,
        "player_name": name,
        "player_school": school,
        "auditory_score": aud_s,
        "visual_score": vis_s,
        "total_score": tot_s,
        "test_date": test_date,
        "created_at": created_at,
        "cloud_synced": cloud_synced
    }

def get_all_records(limit=100):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
        SELECT record_id, player_name, player_school, auditory_score, visual_score, total_score, test_date, created_at
        FROM student_attention_records
        ORDER BY total_score DESC, created_at DESC
        LIMIT ?
        ''', (limit,))
        return [dict(r) for r in cursor.fetchall()]

if __name__ == "__main__":
    test_res = save_record("测试学生", "清华附小", 8, 7, {"test": True})
    print("Test Save Result:", test_res)
    print("Top Records:", get_all_records(5))
