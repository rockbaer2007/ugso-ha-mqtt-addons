"""Build and validate the installable data-only Colorpicker package."""
import sys
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

source = Path(__file__).resolve().parent
sys.path.insert(0, str(source.parents[1] / "app"))
from tool_packages import read_tool_package_zip

destination = Path(sys.argv[1]) if len(sys.argv) > 1 else source / "dist"
destination.mkdir(parents=True, exist_ok=True)
version = json.loads((source / "manifest.json").read_text(encoding="utf-8"))["version"]
package = destination / f"ugso-colorpicker-{version}.tp"
with ZipFile(package, "w", compression=ZIP_DEFLATED) as archive:
    for relative in ["manifest.json", "icons/wheel.svg"]:
        archive.write(source / relative, relative)
read_tool_package_zip(package.read_bytes())
print(package.resolve())
