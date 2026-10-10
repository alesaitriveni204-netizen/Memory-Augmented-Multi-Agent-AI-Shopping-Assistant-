#!/usr/bin/env python3

import os
import signal
import subprocess
from pathlib import Path

DIST_DIR = Path("./mini-services-dist")
PIDS: list[int] = []


def cleanup(signum=None, frame=None):
    print("")
    print("🛑 Shutting down all services...")
    for pid in list(PIDS):
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
    print("✅ All services shut down")
    raise SystemExit(0)


for signame in (signal.SIGINT, signal.SIGTERM):
    signal.signal(signame, cleanup)


def main() -> None:
    print("🚀 Starting all mini services...")
    if not DIST_DIR.is_dir():
        print(f"ℹ️  Directory {DIST_DIR} does not exist")
        return

    service_files = sorted(DIST_DIR.glob("mini-service-*.js"))
    service_count = len(service_files)
    if service_count == 0:
        print("ℹ️  No mini service files found")
        return

    print(f"📦 Found {service_count} service(s); starting them now...")
    print("")

    for file in service_files:
        service_name = file.name.replace("mini-service-", "").rsplit(".js", 1)[0]
        print(f"▶️  Starting service: {service_name}...")
        proc = subprocess.Popen(["bun", str(file)], start_new_session=True)
        PIDS.append(proc.pid)
        try:
            proc.wait(timeout=0.5)
        except subprocess.TimeoutExpired:
            print(f"✅ {service_name} started (PID: {proc.pid})")
        else:
            print(f"❌ {service_name} failed to start")
            if proc.pid in PIDS:
                PIDS.remove(proc.pid)

    running_count = len(PIDS)
    print("")
    print(f"🎉 All services started! {running_count} service(s) are running")
    print("")
    print("💡 Press Ctrl+C to stop all services")
    print("")
    while PIDS:
        for pid in list(PIDS):
            try:
                os.kill(pid, 0)
            except OSError:
                PIDS.remove(pid)
        if not PIDS:
            break
        try:
            os.waitpid(-1, 0)
        except ChildProcessError:
            break


if __name__ == "__main__":
    main()
