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
    PROJECT_DIR = TEST_ROOT / "project"
    BUILD_DIR = TEST_ROOT / "build"
    PROJECT_DIR.joinpath("scripts").mkdir(parents=True)
    PROJECT_DIR.joinpath(".venv").mkdir(parents=True)
    BUILD_DIR.joinpath("next-service-dist").mkdir(parents=True)

    (PROJECT_DIR / "requirements.txt").write_text("", encoding="utf-8")
    (PROJECT_DIR / "scripts" / "report.py").write_text('print("report")\n', encoding="utf-8")
    (PROJECT_DIR / ".venv" / "should-not-copy.py").write_text("ignored\n", encoding="utf-8")

    env = os.environ.copy()
    env["PROJECT_DIR"] = str(PROJECT_DIR)
    env["BUILD_DIR"] = str(BUILD_DIR)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "python-runtime-build.py")], check=True, env=env)

    assert (BUILD_DIR / "next-service-dist" / "scripts" / "report.py").is_file()
    assert not (BUILD_DIR / "next-service-dist" / ".venv" / "should-not-copy.py").exists()

    PYPROJECT_DIR = TEST_ROOT / "pyproject-app"
    PYPROJECT_BUILD = TEST_ROOT / "pyproject-build"
    PYPROJECT_DIR.mkdir()
    PYPROJECT_BUILD.joinpath("next-service-dist").mkdir(parents=True)
    (PYPROJECT_DIR / "pyproject.toml").write_text(
        "[project]\nname = \"deploy-test\"\nversion = \"0.1.0\"\nrequires-python = \">=3.12\"\ndependencies = []\n",
        encoding="utf-8",
    )
    (PYPROJECT_DIR / "app.py").write_text('print("pyproject app")\n', encoding="utf-8")

    env = os.environ.copy()
    env["PROJECT_DIR"] = str(PYPROJECT_DIR)
    env["BUILD_DIR"] = str(PYPROJECT_BUILD)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "python-runtime-build.py")], check=True, env=env)
    assert (PYPROJECT_BUILD / "next-service-dist" / "app.py").is_file()
    assert (PYPROJECT_BUILD / "python-runtime" / "requirements.txt").is_file()

    NODE_ONLY_PROJECT = TEST_ROOT / "node-only"
    NODE_ONLY_BUILD = TEST_ROOT / "node-only-build"
    NODE_ONLY_PROJECT.joinpath("mini-services", "python-worker").mkdir(parents=True)
    NODE_ONLY_BUILD.mkdir()
    (NODE_ONLY_PROJECT / "package.json").write_text('{"name": "node-only"}\n', encoding="utf-8")
    (NODE_ONLY_PROJECT / "mini-services" / "python-worker" / "main.py").write_text('print("unsupported preview-only service")\n', encoding="utf-8")

    env = os.environ.copy()
    env["PROJECT_DIR"] = str(NODE_ONLY_PROJECT)
    env["BUILD_DIR"] = str(NODE_ONLY_BUILD)
    subprocess.run([sys.executable, str(SCRIPT_DIR / "python-runtime-build.py")], check=True, env=env)
    assert not (NODE_ONLY_BUILD / "python-runtime").exists()

    print("python runtime build tests passed")
finally:
    shutil.rmtree(TEST_ROOT, ignore_errors=True)
