#!/usr/bin/env python3

import os
import signal
import subprocess
import sys
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
BUILD_DIR = SCRIPT_DIR
PIDS: list[int] = []


def cleanup(signum=None, frame=None):
    print("")
    print("🛑 Shutting down all services...")
    for pid in list(PIDS):
        try:
            os.kill(pid, 0)
            proc_name = "unknown"
            try:
                proc_name = Path(f"/proc/{pid}/comm").read_text(encoding="utf-8").strip() or "unknown"
            except Exception:
                pass
            print(f"   Stopping process {pid} ({proc_name})...")
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
    time.sleep(1)
    for pid in list(PIDS):
        try:
            os.kill(pid, 0)
            timeout = 4
            while timeout > 0:
                try:
                    os.kill(pid, 0)
                except OSError:
                    break
                time.sleep(1)
                timeout -= 1
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
        except OSError:
            pass
    print("✅ All services shut down")
    raise SystemExit(0)


for signame in (signal.SIGINT, signal.SIGTERM):
    signal.signal(signame, cleanup)

print("🚀 Starting all services...")
print("")

os.chdir(BUILD_DIR)
print(os.listdir(BUILD_DIR))

DEFAULT_PACKAGED_DB_PATH = "/app/db/custom.db"
DEFAULT_PACKAGED_DATABASE_URL = f"file:{DEFAULT_PACKAGED_DB_PATH}"

env = os.environ.copy()
if (Path("/app/python-runtime/site-packages")).is_dir():
    env["PYTHONPATH"] = "/app/python-runtime/site-packages" + (":" + env["PYTHONPATH"] if env.get("PYTHONPATH") else "") + ":/app/next-service-dist"
    env["PATH"] = "/app/python-runtime/site-packages/bin:" + env.get("PATH", "")
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONUNBUFFERED"] = "1"
    print(f"🐍 Embedded Python runtime activated: {subprocess.run(['python', '--version'], capture_output=True, text=True, env=env, check=False).stdout.strip()}")

next_server = BUILD_DIR / "next-service-dist" / "server.js"
if next_server.is_file():
    print("🚀 Starting the Next.js server...")
    next_dir = BUILD_DIR / "next-service-dist"
    next_env = env.copy()
    next_env["NODE_ENV"] = "production"
    next_env["PORT"] = os.environ.get("PORT", "3000")
    next_env["HOSTNAME"] = os.environ.get("HOSTNAME", "0.0.0.0")
    next_env["DATABASE_URL"] = os.environ.get("DATABASE_URL", DEFAULT_PACKAGED_DATABASE_URL)

    if next_env["DATABASE_URL"] == DEFAULT_PACKAGED_DATABASE_URL and not Path(DEFAULT_PACKAGED_DB_PATH).is_file():
        raise SystemExit("❌ Packed database file /app/db/custom.db was not found\n   To avoid starting with an empty production database, startup has been aborted")
    if next_env["DATABASE_URL"] == DEFAULT_PACKAGED_DATABASE_URL:
        print("🗄️  Using packaged database: /app/db/custom.db")
    else:
        print(f"🗄️  Using externally supplied database: {next_env['DATABASE_URL']}")

    proc = subprocess.Popen(["bun", "server.js"], cwd=str(next_dir), env=next_env, start_new_session=True)
    PIDS.append(proc.pid)
    time.sleep(1)
    if proc.poll() is not None:
        raise SystemExit("❌ Next.js server startup failed")
    print(f"✅ Next.js server started (PID: {proc.pid}, Port: {next_env['PORT']})")
else:
    print("⚠️  Next.js server file not found: ./next-service-dist/server.js")

mini_service_script = BUILD_DIR / "mini-services-start.py"
if mini_service_script.is_file():
    print("🚀 Starting mini-services...")
    proc = subprocess.Popen([sys.executable, str(mini_service_script)], cwd=str(BUILD_DIR), env=env, start_new_session=True)
    PIDS.append(proc.pid)
    time.sleep(1)
    if proc.poll() is None:
        print(f"✅ mini-services started (PID: {proc.pid})")
    else:
        print("⚠️  mini-services may have failed to start, but the process will continue...")
elif (BUILD_DIR / "mini-services-dist").is_dir():
    print("⚠️  mini-services startup script not found, but the directory exists")
else:
    print("ℹ️  mini-services directory not found; skipping")

print("🚀 Starting Caddy...")
print("✅ Caddy started (foreground process)")
print("")
print("🎉 All services started!")
print("")
print("💡 Press Ctrl+C to stop all services")
print("")

os.execvp("caddy", ["caddy", "run", "--config", "Caddyfile", "--adapter", "caddyfile"])
