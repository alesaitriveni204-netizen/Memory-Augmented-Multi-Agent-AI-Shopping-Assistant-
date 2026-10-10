#!/usr/bin/env python3

import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent


def log_step_start(step_name: str) -> None:
    print("==========================================")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting: {step_name}")
    print("==========================================")


def log_step_end(step_name: str) -> None:
    print("==========================================")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Completed: {step_name}")
    print("==========================================")
    print("")


DEV_PID: int | None = None


def cleanup(signum=None, frame=None):
    global DEV_PID
    if DEV_PID is not None:
        try:
            os.kill(DEV_PID, signal.SIGTERM)
        except OSError:
            pass
    raise SystemExit(0)


def main() -> None:
    global DEV_PID
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    os.chdir(PROJECT_DIR)

    if not shutil.which("bun"):
        raise SystemExit("ERROR: bun is not installed or not in PATH")

    log_step_start("bun install")
    print("[BUN] Installing dependencies...")
    subprocess.run(["bun", "install"], cwd=str(PROJECT_DIR), check=True)
    log_step_end("bun install")

    log_step_start("bun run db:push")
    print("[BUN] Setting up database...")
    subprocess.run(["bun", "run", "db:push"], cwd=str(PROJECT_DIR), check=True)
    log_step_end("bun run db:push")

    log_step_start("Starting Next.js dev server")
    print("[BUN] Starting development server...")
    proc = subprocess.Popen(["bun", "run", "dev"], cwd=str(PROJECT_DIR), stdout=None, stderr=None)
    DEV_PID = proc.pid
    log_step_end("Starting Next.js dev server")

    log_step_start("Waiting for Next.js dev server")
    print("Waiting for Next.js dev server to be ready on localhost:3000...")
    for _ in range(60):
        try:
            with urllib.request.urlopen("http://localhost:3000", timeout=2):
                break
        except Exception:
            time.sleep(1)
    else:
        raise SystemExit("ERROR: Next.js dev server failed to start within 60 seconds")
    print("Next.js dev server is ready!")
    log_step_end("Waiting for Next.js dev server")

    log_step_start("Health check")
    print("[BUN] Performing health check...")
    with urllib.request.urlopen("http://localhost:3000", timeout=5) as resp:
        resp.read()
    print("[BUN] Health check passed")
    log_step_end("Health check")

    mini_dir = PROJECT_DIR / "mini-services"
    if mini_dir.exists():
        print("Found mini-services directory, scanning for sub-services...")
        for service_dir in sorted(mini_dir.iterdir()):
            if not service_dir.is_dir():
                continue
            package_json = service_dir / "package.json"
            if not package_json.exists():
                print(f"[{service_dir.name}] No package.json found, skipping...")
                continue
            try:
                package_text = package_json.read_text(encoding="utf-8")
            except Exception:
                package_text = ""
            if '"dev"' not in package_text:
                print(f"[{service_dir.name}] No dev script found, skipping...")
                continue
            log_path = PROJECT_DIR / ".zscripts" / f"mini-service-{service_dir.name}.log"
            print(f"Starting {service_dir.name} in background...")
            with log_path.open("w", encoding="utf-8") as log_file:
                subprocess.Popen(["bun", "run", "dev"], cwd=str(service_dir), stdout=log_file, stderr=subprocess.STDOUT, start_new_session=True)
            print(f"[{service_dir.name}] Started in background")
            print(f"[{service_dir.name}] Log: {log_path}")

    print("Next.js dev server is running in background (PID: %s)." % DEV_PID)
    print("Use 'kill %s' to stop it." % DEV_PID)

    try:
        proc.wait()
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
