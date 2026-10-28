from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


APP_DIR = Path(__file__).resolve().parent
CONFIG_FILE = APP_DIR / "config.json"
MAX_REQUEST_BYTES = 64 * 1024
CARD_CODE = re.compile(r"^[0-9]+$")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")

STATIC_FILES = {
    "/": APP_DIR / "index.html",
    "/index.html": APP_DIR / "index.html",
    "/assets/styles.css": APP_DIR / "assets" / "styles.css",
    "/assets/app.mjs": APP_DIR / "assets" / "app.mjs",
    "/assets/core.mjs": APP_DIR / "assets" / "core.mjs",
    "/assets/monte-carlo-worker.mjs": APP_DIR / "assets" / "monte-carlo-worker.mjs",
    "/assets/game-simulation.mjs": APP_DIR / "assets" / "game-simulation.mjs",
    "/assets/game-simulation-worker.mjs": APP_DIR / "assets" / "game-simulation-worker.mjs",
}

_config_lock = threading.Lock()
_picker_lock = threading.Lock()


def _read_config() -> dict[str, str]:
    with _config_lock:
        if not CONFIG_FILE.is_file():
            return {"root_path": "", "pics_path": ""}
        try:
            data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"root_path": "", "pics_path": ""}

    return {
        "root_path": str(data.get("root_path", "")),
        "pics_path": str(data.get("pics_path", "")),
    }


def _write_config(config: dict[str, str]) -> None:
    payload = {
        "root_path": str(config.get("root_path", "")),
        "pics_path": str(config.get("pics_path", "")),
    }
    temporary = CONFIG_FILE.with_suffix(".json.tmp")
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    with _config_lock:
        temporary.write_text(encoded, encoding="utf-8")
        os.replace(temporary, CONFIG_FILE)


def _directory_is_valid(value: str) -> bool:
    if not value:
        return False
    try:
        return Path(value).expanduser().is_dir()
    except (OSError, ValueError):
        return False


def _config_payload(config: dict[str, str] | None = None) -> dict[str, object]:
    current = config or _read_config()
    root_ok = _directory_is_valid(current["root_path"])
    pics_ok = _directory_is_valid(current["pics_path"])
    return {
        **current,
        "root_valid": root_ok,
        "pics_valid": pics_ok,
        "ready": root_ok and pics_ok,
    }


def _find_pics_directory(root_path: str) -> str:
    root = Path(root_path)
    direct = root / "pics"
    if direct.is_dir():
        return str(direct.resolve())

    try:
        for child in root.iterdir():
            if child.is_dir() and child.name.casefold() == "pics":
                return str(child.resolve())
    except OSError:
        pass
    return ""


def _choose_directory(title: str, initial_directory: str = "") -> str:
    # Tkinter is part of the standard Windows Python distribution and gives this
    # local web app a native folder picker without granting the browser broad disk access.
    import tkinter as tk
    from tkinter import filedialog

    with _picker_lock:
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.update()
        options: dict[str, object] = {"title": title, "mustexist": True}
        if _directory_is_valid(initial_directory):
            options["initialdir"] = initial_directory
        selected = filedialog.askdirectory(**options)
        root.destroy()
    return str(Path(selected).resolve()) if selected else ""


def _resolve_card_image(code: str, pics_path: str) -> Path | None:
    if not CARD_CODE.fullmatch(code) or not _directory_is_valid(pics_path):
        return None
    directory = Path(pics_path).resolve()
    for extension in IMAGE_EXTENSIONS:
        candidate = directory / f"{code}{extension}"
        if candidate.is_file():
            return candidate
    return None


class AppHandler(BaseHTTPRequestHandler):
    server_version = "DeckStarterLocal/1.0"

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {format_string % args}")

    def _send_security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' data:; style-src 'self'; "
            "script-src 'self'; worker-src 'self'; connect-src 'self'; "
            "base-uri 'none'; frame-ancestors 'none'",
        )

    def _send_json(self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, cache: bool = False) -> None:
        try:
            body = path.read_bytes()
        except OSError:
            self._send_json({"error": "找不到檔案。"}, HTTPStatus.NOT_FOUND)
            return

        mime, _ = mimetypes.guess_type(path.name)
        if path.suffix == ".mjs":
            mime = "text/javascript"
        self.send_response(HTTPStatus.OK)
        self._send_security_headers()
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Cache-Control", "public, max-age=86400" if cache else "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict[str, object]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("無效的請求長度。") from error
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError("請求內容過大。")
        if length == 0:
            return {}
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("無效的 JSON。") from error
        if not isinstance(value, dict):
            raise ValueError("請求內容必須是物件。")
        return value

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/health":
            self._send_json({"ok": True})
            return
        if path == "/api/config":
            self._send_json(_config_payload())
            return
        if path.startswith("/api/card/"):
            code = path.removeprefix("/api/card/")
            config = _read_config()
            image = _resolve_card_image(code, config["pics_path"])
            if image is None:
                self._send_json({"error": "找不到卡圖。", "code": code}, HTTPStatus.NOT_FOUND)
                return
            self._send_file(image, cache=True)
            return
        if path in STATIC_FILES:
            self._send_file(STATIC_FILES[path])
            return
        self._send_json({"error": "找不到頁面。"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        parsed = urlparse(self.path)
        try:
            data = self._read_json_body()
        except ValueError as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
            return

        if parsed.path == "/api/pick-directory":
            kind = str(data.get("kind", ""))
            if kind not in {"root", "pics"}:
                self._send_json({"error": "未知的資料夾類型。"}, HTTPStatus.BAD_REQUEST)
                return
            config = _read_config()
            initial = config["root_path"] if kind == "root" else config["pics_path"]
            try:
                selected = _choose_directory(
                    "選擇 YGOPro 主目錄" if kind == "root" else "選擇卡圖（pics）目錄",
                    initial,
                )
            except Exception as error:  # Native dialog failures should become a useful UI message.
                self._send_json(
                    {"error": f"無法開啟資料夾選擇器：{error}"},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
                return
            if not selected:
                self._send_json({"cancelled": True, **_config_payload(config)})
                return

            if kind == "root":
                config["root_path"] = selected
                detected = _find_pics_directory(selected)
                if detected:
                    config["pics_path"] = detected
                elif not _directory_is_valid(config["pics_path"]):
                    config["pics_path"] = ""
            else:
                config["pics_path"] = selected
            _write_config(config)
            self._send_json({"cancelled": False, **_config_payload(config)})
            return

        if parsed.path == "/api/config":
            root_path = str(data.get("root_path", "")).strip()
            pics_path = str(data.get("pics_path", "")).strip()
            if not _directory_is_valid(root_path):
                self._send_json({"error": "YGOPro 主目錄不存在。"}, HTTPStatus.BAD_REQUEST)
                return
            if not _directory_is_valid(pics_path):
                self._send_json({"error": "卡圖目錄不存在。"}, HTTPStatus.BAD_REQUEST)
                return
            config = {
                "root_path": str(Path(root_path).resolve()),
                "pics_path": str(Path(pics_path).resolve()),
            }
            _write_config(config)
            self._send_json(_config_payload(config))
            return

        self._send_json({"error": "找不到 API。"}, HTTPStatus.NOT_FOUND)


def main() -> None:
    parser = argparse.ArgumentParser(description="YGOPro 卡組啟動機率計算器")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    try:
        server = ThreadingHTTPServer((args.host, args.port), AppHandler)
    except OSError:
        server = ThreadingHTTPServer((args.host, 0), AppHandler)

    host, port = server.server_address[:2]
    url = f"http://{host}:{port}/"
    print(f"YGOPro 卡組啟動機率計算器已啟動：{url}")
    print("關閉此視窗即可停止程式。")
    if not args.no_browser:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
