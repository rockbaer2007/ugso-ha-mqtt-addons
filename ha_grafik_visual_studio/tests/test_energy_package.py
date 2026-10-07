import importlib.util
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'app'))
from energy_history import energy_history_plan,energy_history_data
from widget_packages import read_package_zip,validate_manifest
spec=importlib.util.spec_from_file_location('energy_build',ROOT/'packages/energy/build.py')
build=importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class EnergyTests(unittest.TestCase):
    def test_package_roundtrip_and_renderer(self):
        package=read_package_zip(build.build().read_bytes())
        self.assertEqual(len(package['widgets']),8)
        self.assertEqual(package['id'],'ugso.energy')
        self.assertTrue(all(w['iconData'].startswith('data:image/svg+xml') for w in package['widgets']))
        package=build.manifest();package['widgets'][0]['defaults']['energyKind']='executable'
        with self.assertRaises(ValueError):validate_manifest(package)

    def test_history_is_read_only_bounded_and_clamps_future_end(self):
        now=datetime(2026,10,7,tzinfo=timezone.utc)
        request={'entity_ids':['sensor.a'],'start':(now-timedelta(days=1)).isoformat(),'end':(now+timedelta(days=1)).isoformat()}
        command,start,end=energy_history_plan(request,now)
        self.assertEqual(command['type'],'history/history_during_period')
        self.assertEqual(end,now)
        for bad in [{**request,'entity_ids':['bad/url']},{**request,'entity_ids':['sensor.a']*7},{**request,'start':'2020-01-01T00:00:00Z'},{**request,'start':'2026-10-06'},{**request,'start':(now+timedelta(hours=1)).isoformat()}]:
            with self.assertRaises(ValueError):energy_history_plan(bad,now)

    def test_history_preserves_gaps_and_rejects_truncation(self):
        start=datetime(2026,10,6,tzinfo=timezone.utc);end=start+timedelta(days=1)
        raw={'sensor.a':[{'lu':start.timestamp(),'s':'10'},{'lu':start.timestamp()+10,'s':'unknown'},{'lu':end.timestamp(),'s':'12'}]}
        result=energy_history_data(['sensor.a'],raw,start,end)
        self.assertEqual([p['y'] for p in result['series']['sensor.a']],[10,None,12])
        with self.assertRaises(ValueError):energy_history_data(['sensor.a'],{'sensor.a':[{}]*20001},start,end)
if __name__=='__main__':unittest.main()
