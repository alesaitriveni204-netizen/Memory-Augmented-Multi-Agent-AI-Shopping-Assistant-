#!/usr/bin/env python3

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


PROJECT_DIR = Path(os.environ.get("PROJECT_DIR", "/home/z/my-project")).resolve()
BUILD_DIR = Path(os.environ.get("BUILD_DIR", "/tmp/build_fullstack")).resolve()
PYTHON_VERSION = os.environ.get("PYTHON_VERSION", "3.12")
NEXT_DIST_DIR = BUILD_DIR / "next-service-dist"
PYTHON_RUNTIME_DIR = BUILD_DIR / "python-runtime"
PYTHON_PACKAGES_DIR = PYTHON_RUNTIME_DIR / "site-packages"


def has_python_sources() -> bool:
    excluded = {".git", ".next", ".venv", "node_modules", "__pycache__", "mini-services", "upload", "download"}
    for root, dirs, files in os.walk(PROJECT_DIR):
        dir_rel = Path(root).relative_to(PROJECT_DIR)
        dirs[:] = [d for d in dirs if d not in excluded and d != ".git"]
        if any(f.endswith((".py", ".pyi")) for f in files):
            return True
    return False


if not has_python_sources() and not (PROJECT_DIR / "requirements.txt").exists() and not (PROJECT_DIR / "pyproject.toml").exists():
    print("ℹ️  No Python source or dependency manifest detected; skipping Python runtime build")
    raise SystemExit(0)

if shutil.which("uv") is None:
    raise SystemExit("❌ Python project detected, but uv is not installed in the build environment")

print(f"🐍 Python runtime detected; target version: {PYTHON_VERSION}")
NEXT_DIST_DIR.mkdir(parents=True, exist_ok=True)
PYTHON_PACKAGES_DIR.mkdir(parents=True, exist_ok=True)


def install_requirements(requirements_file: str, target_dir: str):
    req_path = Path(requirements_file)
    if not req_path.exists() or req_path.stat().st_size == 0:
        print("ℹ️  Python dependency list is empty; skipping installation")
        return
    print(f"📦 Locking Python production dependencies from {req_path.name}...")
    subprocess.run([
        "uv", "pip", "install",
        "--python", PYTHON_VERSION,
        "--target", target_dir,
        "--requirements", str(req_path),
    ], check=True)
    bin_dir = Path(target_dir) / "bin"
    if bin_dir.exists():
        for script in bin_dir.iterdir():
            if not script.is_file():
                continue
            lines = script.read_text(encoding="utf-8", errors="surrogateescape").splitlines()
            if lines and lines[0].startswith("#!"):
                lines[0] = "#!/usr/bin/env python"
                script.write_text("\n".join(lines) + "\n", encoding="utf-8", errors="surrogateescape")


def install_pyproject(project_dir: Path, target_dir: Path, output_name: str):
    requirements_file = PYTHON_RUNTIME_DIR / output_name
    if (project_dir / "uv.lock").exists():
        subprocess.run([
            "uv", "export",
            "--project", str(project_dir),
            "--frozen",
            "--no-dev",
            "--no-emit-project",
            "--format", "requirements.txt",
            "--output-file", str(requirements_file),
        ], check=True)
    else:
        subprocess.run([
            "uv", "pip", "compile",
            str(project_dir / "pyproject.toml"),
            "--python-version", PYTHON_VERSION,
            "--output-file", str(requirements_file),
        ], check=True)
    install_requirements(str(requirements_file), str(target_dir))


if (PROJECT_DIR / "pyproject.toml").exists() and (PROJECT_DIR / "uv.lock").exists():
    print("🔒 Exporting production dependencies from pyproject.toml + uv.lock...")
    install_pyproject(PROJECT_DIR, PYTHON_PACKAGES_DIR, "requirements.lock.txt")
elif (PROJECT_DIR / "requirements.txt").exists():
    shutil.copy2(PROJECT_DIR / "requirements.txt", PYTHON_RUNTIME_DIR / "requirements.txt")
    install_requirements(str(PYTHON_RUNTIME_DIR / "requirements.txt"), str(PYTHON_PACKAGES_DIR))
elif (PROJECT_DIR / "pyproject.toml").exists():
    print("📦 pyproject.toml is present without uv.lock; resolving production dependencies...")
    install_pyproject(PROJECT_DIR, PYTHON_PACKAGES_DIR, "requirements.txt")
else:
    print("⚠️  Python source detected, but neither requirements.txt nor pyproject.toml is present; standard library only support")

if has_python_sources():
    print("📄 Copying Python source into the deployment project while preserving relative paths...")
    excluded = {".git", ".next", ".venv", "node_modules", "__pycache__", "mini-services", "upload", "download"}
    for root, dirs, files in os.walk(PROJECT_DIR):
        dirs[:] = [d for d in dirs if d not in excluded]
        rel_root = Path(root).relative_to(PROJECT_DIR)
        for file_name in files:
            if file_name.endswith((".py", ".pyi")):
                src = Path(root) / file_name
                dst = NEXT_DIST_DIR / rel_root / file_name
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

print("✅ Python runtime has been packaged into the deployment artifact")
