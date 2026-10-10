#!/usr/bin/env python3

import os
import re
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path


def log(message: str) -> None:
    print(message)


SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_PROJECT_DIR = Path("/home/z/my-project")

if not NEXTJS_PROJECT_DIR.is_dir():
    raise SystemExit(f"❌ Error: Next.js project directory does not exist: {NEXTJS_PROJECT_DIR}")

os.environ.setdefault("NEXT_TELEMETRY_DISABLED", "1")
BUILD_ID = os.environ.get("BUILD_ID", "")
BUILD_DIR = Path(f"/tmp/build_fullstack_{BUILD_ID}") if BUILD_ID else Path("/tmp/build_fullstack")
BUILD_DIR.mkdir(parents=True, exist_ok=True)

log("🚀 Starting build for the Next.js app and mini-services...")
log(f"📁 Next.js project path: {NEXTJS_PROJECT_DIR}")

project_dir = NEXTJS_PROJECT_DIR
subprocess.run(["bun", "install"], cwd=str(project_dir), check=True, env=os.environ.copy())
subprocess.run(["bun", "run", "build"], cwd=str(project_dir), check=True, env=os.environ.copy())

standalone_server = project_dir / ".next" / "standalone" / "server.js"
if not standalone_server.is_file():
    log("⚠️  Build did not produce .next/standalone/server.js; repairing the next.config output setting...")
    config_candidates = [
        project_dir / "next.config.ts",
        project_dir / "next.config.js",
        project_dir / "next.config.mjs",
        project_dir / "next.config.cjs",
    ]
    next_config = next((p for p in config_candidates if p.exists()), None)
    if next_config is None:
        raise SystemExit("❌ Build failed: next.config.* was not found, so the standalone deployment artifact could not be generated.")

    text = next_config.read_text(encoding="utf-8")
    if re.search(r'output\s*:\s*[\'\"]standalone[\'\"]', text):
        raise SystemExit(
            f"❌ Build failed: {next_config} already contains output:\"standalone\", but .next/standalone/server.js is still missing."
        )
    if re.search(r'output\s*:\s*[\'\"]', text):
        raise SystemExit(
            f"❌ Build failed: {next_config} declares a non-standalone output (for example, \"export\" static export), which is incompatible with the current deployment model."
        )

    log(f"🔧 Detected that {next_config} is missing output:\"standalone\"; injecting it and rebuilding...")
    backup = next_config.with_suffix(next_config.suffix + ".zbak")
    shutil.copy2(next_config, backup)
    pattern = r'((?:const\s+\w+[^=]*=\s*|export\s+default\s+|module\.exports\s*=\s*)\{)'
    new_text, count = re.subn(pattern, r'\1\n  output: "standalone",', text, count=1)
    if count == 0 or not re.search(r'output\s*:\s*[\'\"]standalone[\'\"]', new_text):
        log("❌ Could not find a writable config object; the next.config format is unusual and must be updated manually to include output:\"standalone\".")
        log(f"   Current {next_config} contents:")
        print(next_config.read_text(encoding="utf-8"))
        if backup.exists():
            backup.replace(next_config)
        raise SystemExit(1)

    next_config.write_text(new_text, encoding="utf-8")
    subprocess.run(["bun", "run", "build"], cwd=str(project_dir), check=True, env=os.environ.copy())
    if not standalone_server.is_file():
        raise SystemExit("❌ After injecting output:\"standalone\" and rebuilding, .next/standalone/server.js is still missing.")
    log("✅ Self-healing succeeded: the standalone server entry has been generated.")

mini_services_dir = project_dir / "mini-services"
if mini_services_dir.is_dir():
    log("🔨 Building mini-services...")
    subprocess.run([sys.executable, str(SCRIPT_DIR / "mini-services-install.py")], check=True, env=os.environ.copy())
    subprocess.run([sys.executable, str(SCRIPT_DIR / "mini-services-build.py")], check=True, env=os.environ.copy())
    source = SCRIPT_DIR / "mini-services-start.py"
    target = BUILD_DIR / "mini-services-start.py"
    shutil.copy2(source, target)
    target.chmod(0o755)
else:
    log("ℹ️  mini-services directory not found; skipping")

log("📦 Collecting build artifacts into %s..." % BUILD_DIR)
next_service_dist = BUILD_DIR / "next-service-dist"
next_service_dist.mkdir(parents=True, exist_ok=True)

standalone_src = project_dir / ".next" / "standalone"
if standalone_src.is_dir():
    log("  - Copying .next/standalone")
    shutil.copytree(standalone_src, next_service_dist / "standalone", dirs_exist_ok=True)

static_src = project_dir / ".next" / "static"
if static_src.is_dir():
    log("  - Copying .next/static")
    target_static = next_service_dist / ".next"
    target_static.mkdir(parents=True, exist_ok=True)
    shutil.copytree(static_src, target_static / "static", dirs_exist_ok=True)

public_src = project_dir / "public"
if public_src.is_dir():
    log("  - Copying public")
    shutil.copytree(public_src, next_service_dist / "public", dirs_exist_ok=True)

env = os.environ.copy()
env["PROJECT_DIR"] = str(project_dir)
env["BUILD_DIR"] = str(BUILD_DIR)
subprocess.run([sys.executable, str(SCRIPT_DIR / "python-runtime-build.py")], check=True, env=env)
subprocess.run([sys.executable, str(SCRIPT_DIR / "database-runtime-build.py")], check=True, env=env)

caddyfile = project_dir / "Caddyfile"
if caddyfile.is_file():
    log("  - Copying Caddyfile")
    shutil.copy2(caddyfile, BUILD_DIR / "Caddyfile")
else:
    log("ℹ️  Caddyfile not found; skipping")

start_script = SCRIPT_DIR / "start.py"
if start_script.is_file():
    log("  - Copying start.py to %s" % BUILD_DIR)
    shutil.copy2(start_script, BUILD_DIR / "start.py")
    (BUILD_DIR / "start.py").chmod(0o755)

package_file = Path(f"{BUILD_DIR}.tar.gz")
log("")
log(f"📦 Packaging build artifacts into {package_file}...")
with tarfile.open(package_file, "w:gz") as tar:
    for item in BUILD_DIR.iterdir():
        tar.add(item, arcname=item.name)

log("")
log("✅ Build complete! All artifacts have been packaged into %s" % package_file)
log("📊 Package size:")
print(package_file.stat().st_size)
