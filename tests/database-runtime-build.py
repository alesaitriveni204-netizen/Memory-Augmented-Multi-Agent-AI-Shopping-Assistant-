#!/usr/bin/env python3

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = (Path(__file__).resolve().parent / ".." / ".zscripts").resolve()
TEST_ROOT = Path(tempfile.mkdtemp())

try:
    fake_bin = TEST_ROOT / "bin"
    fake_bin.mkdir()
    bun = fake_bin / "bun"
    bun.write_text(
        "#!/bin/bash\n"
        "set -euo pipefail\n"
        "if [ \"$#\" -ne 2 ] || [ \"$1\" != \"run\" ] || [ \"$2\" != \"db:push\" ]; then\n"
        "  echo \"unexpected bun invocation: $*\" >&2\n"
        "  exit 1\n"
        "fi\n"
        "case \"${DATABASE_URL:-}\" in\n"
        "  file:*) db_path=\"${DATABASE_URL#file:}\" ;;\n"
        "  *)\n"
        "    echo \"DATABASE_URL must be an absolute SQLite file URL\" >&2\n"
        "    exit 1\n"
        "    ;;\n"
        "esac\n"
        "case \"$db_path\" in\n"
        "  /*) ;;\n"
        "  *)\n"
        "    echo \"database path must be absolute: $db_path\" >&2\n"
        "    exit 1\n"
        "    ;;\n"
        "esac\n"
        "mkdir -p \"$(dirname \"$db_path\")\"\n"
        "if [ ! -f \"$db_path\" ]; then\n"
        "  printf 'initialized\\n' >\"$db_path\"\n"
        "fi\n"
        "printf '%s\\n' \"$DATABASE_URL\" >>\"${DB_PUSH_CALLS:?}\"\n",
        encoding="utf-8",
    )
    bun.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}{os.pathsep}{env['PATH']}"
    env["DB_PUSH_CALLS"] = str(TEST_ROOT / "db-push-calls")

    EMPTY_PROJECT = TEST_ROOT / "empty-project"
    EMPTY_BUILD = TEST_ROOT / "empty-build"
    EMPTY_PROJECT.mkdir()
    env_empty = env.copy(); env_empty["PROJECT_DIR"] = str(EMPTY_PROJECT); env_empty["BUILD_DIR"] = str(EMPTY_BUILD)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "database-runtime-build.py")], check=True, env=env_empty)

    assert (EMPTY_BUILD / "db" / "custom.db").is_file()
    assert (EMPTY_BUILD / "db" / "custom.db").read_text(encoding="utf-8") == "initialized"
    assert not (EMPTY_PROJECT / "db" / "custom.db").exists()

    EXISTING_PROJECT = TEST_ROOT / "existing-project"
    EXISTING_BUILD = TEST_ROOT / "existing-build"
    (EXISTING_PROJECT / "db").mkdir(parents=True)
    (EXISTING_PROJECT / "db" / "custom.db").write_text("preview-data\n", encoding="utf-8")
    (EXISTING_PROJECT / "db" / "README.txt").write_text("sidecar\n", encoding="utf-8")
    env_existing = env.copy(); env_existing["PROJECT_DIR"] = str(EXISTING_PROJECT); env_existing["BUILD_DIR"] = str(EXISTING_BUILD)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "database-runtime-build.py")], check=True, env=env_existing)

    assert (EXISTING_BUILD / "db" / "custom.db").read_text(encoding="utf-8") == "preview-data"
    assert (EXISTING_BUILD / "db" / "README.txt").read_text(encoding="utf-8") == "sidecar"
    call_count = sum(1 for _ in open(env["DB_PUSH_CALLS"], encoding="utf-8"))
    assert call_count == 2
    with open(env["DB_PUSH_CALLS"], encoding="utf-8") as fh:
        calls = [line.strip() for line in fh if line.strip()]
    assert f"file:{EMPTY_BUILD / 'db' / 'custom.db'}" in calls
    assert f"file:{EXISTING_BUILD / 'db' / 'custom.db'}" in calls

    print("database runtime build tests passed")
finally:
    shutil.rmtree(TEST_ROOT, ignore_errors=True)
