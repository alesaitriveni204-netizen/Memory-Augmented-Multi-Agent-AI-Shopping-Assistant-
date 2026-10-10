#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path

ROOT_DIR = Path("/home/z/my-project/mini-services")


def main() -> None:
    print("🚀 Starting batch dependency installation...")
    if not ROOT_DIR.is_dir():
        print(f"ℹ️  Directory {ROOT_DIR} does not exist; skipping installation")
        return

    success_count = 0
    fail_count = 0
    failed_projects = []

    for service_dir in sorted(ROOT_DIR.iterdir()):
        if not service_dir.is_dir():
            continue
        if not (service_dir / "package.json").is_file():
            continue

        project_name = service_dir.name
        print("")
        print(f"📦 Installing dependencies for: {project_name}...")

        try:
            subprocess.run(["bun", "install"], cwd=str(service_dir), check=True)
            print(f"✅ {project_name} dependencies installed successfully")
            success_count += 1
        except subprocess.CalledProcessError:
            print(f"❌ {project_name} dependency installation failed")
            fail_count += 1
            failed_projects.append(project_name)

    print("")
    print("==================================================")
    if success_count > 0 or fail_count > 0:
        print("🎉 Installation complete!")
        print(f"✅ Success: {success_count} project(s)")
        if fail_count > 0:
            print(f"❌ Failed: {fail_count} project(s)")
            print("")
            print("Failed projects:")
            for project in failed_projects:
                print(f"  - {project}")
    else:
        print("ℹ️  No projects containing package.json were found")
    print("==================================================")


if __name__ == "__main__":
    main()
