# -*- coding: utf-8 -*-
"""
清良思维 · 视听双通道专注力测评系统 - 本地服务与腾讯云数据库同步网关
提供静态页面托管 + /api/records 数据持久化与腾讯云双向存取
"""

import os
import sys
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
import tencent_cloud_db

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class AttentionAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # 统一注入允许跨域与无缓存策略 (防止音频或数据缓存)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status, payload):
        resp_bytes = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(resp_bytes)))
        self.end_headers()
        self.wfile.write(resp_bytes)

    def do_GET(self):
        parsed_path = self.path.split('?')[0]
        if parsed_path == '/api/records':
            try:
                records = tencent_cloud_db.get_all_records(limit=100)
                self.send_json(200, {"success": True, "records": records})
            except Exception as e:
                self.send_json(500, {"success": False, "error": str(e)})
            return

        # 针对音频文件的 HTTP 206 Partial Content (Range) 支持 (满足 Chrome/Edge 音频播放规范)
        range_header = self.headers.get('Range')
        local_path = self.translate_path(self.path)
        if range_header and os.path.isfile(local_path):
            try:
                file_size = os.path.getsize(local_path)
                ranges = range_header.replace('bytes=', '').split('-')
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if ranges[1] else file_size - 1
                if start >= file_size:
                    self.send_error(416, "Requested Range Not Satisfiable")
                    return
                end = min(end, file_size - 1)
                length = end - start + 1

                content_type = self.guess_type(local_path)
                self.send_response(206)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                self.send_header('Content-Length', str(length))
                self.send_header('Accept-Ranges', 'bytes')
                self.end_headers()

                with open(local_path, 'rb') as f:
                    f.seek(start)
                    self.wfile.write(f.read(length))
                return
            except Exception as e:
                pass

        super().do_GET()

    def do_POST(self):
        parsed_path = self.path.split('?')[0]
        if parsed_path == '/api/records':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(body) if body else {}

                name = payload.get("name") or payload.get("playerName") or "考生"
                school = payload.get("school") or payload.get("playerSchool") or "未填写学校"
                auditory_score = payload.get("auditoryScore") or payload.get("auditory_score") or 0
                visual_score = payload.get("visualScore") or payload.get("visual_score") or 0
                details = payload.get("details") or {}

                result = tencent_cloud_db.save_record(
                    player_name=name,
                    player_school=school,
                    auditory_score=auditory_score,
                    visual_score=visual_score,
                    raw_details=details
                )

                self.send_json(200, {"success": True, "data": result})
                print(f"[API] Record saved: {name} ({school}) -> 听:{auditory_score} 视:{visual_score} 总:{int(auditory_score)*int(visual_score)} | 腾讯云同步: {result.get('cloud_synced')}")
            except Exception as e:
                print(f"[API] Error saving record: {e}")
                self.send_json(500, {"success": False, "error": str(e)})
            return

        self.send_response(404)
        self.end_headers()

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, AttentionAppHandler)
    print(f"==================================================")
    print(f"清良思维 · 视听双通道综合专注力测评系统网关已启动")
    print(f"本地访问地址: http://localhost:{PORT}/综合专注力测试.html")
    print(f"腾讯云数据库接口: http://localhost:{PORT}/api/records")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down.")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
