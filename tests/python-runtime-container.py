#!/usr/bin/env python3

import os
import subprocess
import sys
import tempfile
from pathlib import Path

RUNNER_IMAGE = os.environ.get("RUNNER_IMAGE", "z-ai-python-deploy-runner:test")
SCRIPT_DIR = (Path(__file__).resolve().parent / ".." / ".zscripts").resolve()
TEST_ROOT = Path(tempfile.mkdtemp())

try:
    PROJECT_DIR = TEST_ROOT / "project"
    BUILD_DIR = TEST_ROOT / "build"
    PROJECT_DIR.mkdir()
    BUILD_DIR.joinpath("next-service-dist").mkdir(parents=True)

    (PROJECT_DIR / "requirements.txt").write_text("idna==3.10\n", encoding="utf-8")
    (PROJECT_DIR / "check_runtime.py").write_text(
        "import idna\n\nassert idna.__version__ == \"3.10\"\nprint(\"python artifact import passed\")\n",
        encoding="utf-8",
    )

    env = os.environ.copy()
    env["PROJECT_DIR"] = str(PROJECT_DIR)
    env["BUILD_DIR"] = str(BUILD_DIR)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "python-runtime-build.py")], check=True, env=env)

    subprocess.run([
        "docker", "run", "--rm",
        "--entrypoint", "sh",
        "-v", f"{BUILD_DIR}:/app",
        RUNNER_IMAGE,
        "-c",
        "PYTHONPATH=/app/python-runtime/site-packages:/app/next-service-dist python /app/next-service-dist/check_runtime.py",
    ], check=True)
finally:
    import shutil
    shutil.rmtree(TEST_ROOT, ignore_errors=True)
