#!/usr/bin/env python3

import os
import shutil
import subprocess
from pathlib import Path

ROOT_DIR = Path("/home/z/my-project/mini-services")
BUILD_ID = os.environ.get("BUILD_ID", "")
DIST_DIR = Path(f"/tmp/build_fullstack_{BUILD_ID}/mini-services-dist") if BUILD_ID else Path("/tmp/build_fullstack/mini-services-dist")


def main() -> None:
    print("🚀 Starting batch build...")
    if not ROOT_DIR.is_dir():
        print(f"ℹ️  Directory {ROOT_DIR} does not exist; skipping build")
        return

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    success_count = 0
    fail_count = 0

    for service_dir in sorted(ROOT_DIR.iterdir()):
        if not service_dir.is_dir():
            continue
        package_json = service_dir / "package.json"
        if not package_json.is_file():
            continue

        project_name = service_dir.name
        entry_path = None
        for candidate in ["src/index.ts", "index.ts", "src/index.js", "index.js"]:
            path = service_dir / candidate
            if path.is_file():
                entry_path = path
                break

        if entry_path is None:
            print(f"⚠️  Skipping {project_name}: entry file not found (index.ts/js)")
            continue

        print("")
        print(f"📦 Building: {project_name}...")
        output_file = DIST_DIR / f"mini-service-{project_name}.js"

        try:
            subprocess.run([
                "bun", "build", str(entry_path),
                "--outfile", str(output_file),
                "--target", "bun",
                "--minify",
            ], check=True)
            print(f"✅ {project_name} built successfully -> {output_file}")
            success_count += 1
        except subprocess.CalledProcessError:
            print(f"❌ {project_name} build failed")
            fail_count += 1

    script_src = Path(".zscripts/mini-services-start.py")
    if script_src.is_file():
        shutil.copy2(script_src, DIST_DIR / "mini-services-start.py")
        (DIST_DIR / "mini-services-start.py").chmod(0o755)

    print("")
    print("🎉 All tasks completed!")
    if success_count > 0 or fail_count > 0:
        print(f"✅ Success: {success_count} project(s)")
        if fail_count > 0:
            print(f"❌ Failed: {fail_count} project(s)")


if __name__ == "__main__":
    main()
