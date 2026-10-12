"""Real packaged upgrade, old settings and build reproducibility checks."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
import main
from widget_packages import read_package_zip,validate_additive_update

PACKAGE=Path(__file__).resolve().parents[3]/'ha-grafik-visual-studio-materialdesign'

class MaterialPackageUpgradeTests(unittest.TestCase):
    @unittest.skipUnless((PACKAGE/'dist/ugso.materialdesign-1.1.0.wg').exists(),'external Material package not present')
    def test_all_old_defaults_preserved_in_real_zip_update(self):
        old_bytes=(PACKAGE/'dist/ugso.materialdesign-1.0.1.wg').read_bytes()
        new_bytes=(PACKAGE/'dist/ugso.materialdesign-1.1.0.wg').read_bytes()
        old,new=read_package_zip(old_bytes),read_package_zip(new_bytes)
        validate_additive_update(old,new)
        self.assertEqual(len(new['widgets']),49)
        for previous,current in zip(old['widgets'],new['widgets']):
            for key,value in previous['defaults'].items():self.assertEqual(current['defaults'][key],value)
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            with patch.object(main,'PROJECTS_DIR',root/'projects'),patch.object(main,'PROJECT_FILE',root/'project.json'),patch.object(main,'WIDGET_PACKAGES_DIR',root/'packages'):
                project=json.loads(json.dumps(main.DEFAULT_PROJECT))
                project['pages'][0]['widgets']=[{**widget['defaults'],'type':widget['type'],'id':f'old-{i}','title':'Meine Beschriftung','enabledPropertyGroups':{'saved-option':False}} for i,widget in enumerate(old['widgets'])]
                main.Handler.write_project('main',project)
                before=(root/'projects/main.json').read_bytes()
                server=ThreadingHTTPServer(('127.0.0.1',0),main.Handler)
                thread=Thread(target=server.serve_forever,daemon=True);thread.start()
                try:
                    endpoint=f'http://127.0.0.1:{server.server_port}/api/widget-packages'
                    for data,status in [(old_bytes,201),(new_bytes,200)]:
                        with urlopen(Request(endpoint,data=data,method='POST',headers={'X-Package-Name':'material.wg'})) as response:self.assertEqual(response.status,status)
                    self.assertEqual((root/'projects/main.json').read_bytes(),before,'install and update must not rewrite old projects')
                    with urlopen(endpoint) as response:
                        package=json.load(response)['packages'][0]
                        self.assertEqual(package['version'],'1.1.0')
                        self.assertEqual(package['name'],'Material Design')
                    reopened=main.Handler.read_project_file(root/'projects/main.json')
                    self.assertEqual(reopened['pages'][0]['widgets'],project['pages'][0]['widgets'])
                finally:server.shutdown();server.server_close();thread.join(timeout=2)

if __name__=='__main__':unittest.main()
