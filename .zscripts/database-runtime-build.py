#!/usr/bin/env python3

import os
import shutil
import subprocess
from pathlib import Path


PROJECT_DIR = Path(os.environ.get("PROJECT_DIR", "/home/z/my-project")).resolve()
BUILD_DIR = Path(os.environ.get("BUILD_DIR", "/tmp/build_fullstack")).resolve()
SOURCE_DB_DIR = PROJECT_DIR / "db"
SOURCE_DB_PATH = SOURCE_DB_DIR / "custom.db"
TARGET_DB_DIR = BUILD_DIR / "db"
TARGET_DB_PATH = TARGET_DB_DIR / "custom.db"

TARGET_DB_DIR.mkdir(parents=True, exist_ok=True)

if SOURCE_DB_PATH.exists():
    print("🗄️  Copying the preview database into the build artifact...")
    for item in SOURCE_DB_DIR.iterdir():
        target = TARGET_DB_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)
else:
    print("ℹ️  Preview database db/custom.db not found; initializing an empty production database")

print("🗄️  Synchronizing the database schema in the build artifact...")
env = os.environ.copy()
env["DATABASE_URL"] = f"file:{TARGET_DB_PATH}"
subprocess.run(["bun", "run", "db:push"], cwd=str(PROJECT_DIR), check=True, env=env)

if not TARGET_DB_PATH.exists():
    raise SystemExit(f"❌ The database initialization command succeeded, but {TARGET_DB_PATH} was not created")

print("✅ Build artifact database is ready")
print(TARGET_DB_DIR)
