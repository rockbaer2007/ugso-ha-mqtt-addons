"""Package the shipped app and task tests without local data, dependencies or secrets."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
target = Path(sys.argv[1]).resolve()
target.parent.mkdir(parents=True, exist_ok=True)
tracked = subprocess.check_output(['git', 'ls-files', '-z', '--', '.'], cwd=root).decode().split('\0')
extra = ['docs/sensor-state.md', 'runtime/sensor-state.mjs', 'runtime/sensor-state-bridge.mjs',
         'tests/new-flow.test.mjs', 'tests/sensor-state.test.mjs', 'web/sensor-state-block.js',
         'tools/extend-sensor-blocks.mjs', 'tools/package-local.py', 'TESTREPORT-0.1.133.md']
files = sorted({name for name in tracked + extra if name and (root / name).is_file()})
for name in files:
    assert not set(Path(name).parts) & {'node_modules', 'userdata', '.git', '__pycache__', 'source-frontend'}
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, 'ha_logic_studio_pro/' + name)
with ZipFile(target) as archive:
    assert archive.testzip() is None
    packed = json.loads(archive.read('ha_logic_studio_pro/package.json'))
    assert packed['version'] == version
digest = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix(target.suffix + '.sha256').write_text(digest + '  ' + target.name + '\n', encoding='ascii')
print(target)
print('Version:', version, 'Files:', len(files), 'SHA256:', digest)
