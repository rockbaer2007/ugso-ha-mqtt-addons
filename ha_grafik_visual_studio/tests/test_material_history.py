import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from material_history import material_history_plan, material_history_data

class HistoryTests(unittest.TestCase):
    def test_bounds(self):
        for request in [{'entity_ids': [], 'hours':24}, {'entity_ids':['sensor.x'],'hours':169}, {'entity_ids':['sensor.x'],'hours':True}, {'entity_ids':['sensor.x/../secret'],'hours':24}]:
            with self.assertRaises(ValueError): material_history_plan(request)
    def test_read_only_command(self):
        command,start,end=material_history_plan({'entity_ids':['sensor.x','sensor.x'],'hours':24})
        self.assertEqual(command['entity_ids'],['sensor.x'])
        self.assertEqual(command['type'],'history/history_during_period')
        self.assertEqual(end-start,timedelta(days=1))
    def test_gaps_and_invalid_dates(self):
        start=datetime(2026,10,4,tzinfo=timezone.utc)
        raw={'sensor.x':[{'lu':start.timestamp(),'s':'1'},{'lu':start.timestamp()+60,'s':'unavailable'},{'lu':start.timestamp()+120,'s':'3'},{'lu':'garbage','s':'4'}]}
        data=material_history_data(['sensor.x'],raw,start,start+timedelta(days=1))
        self.assertEqual(data['datasets'][0]['data'],[1,None,3])
    def test_bounded_result(self):
        start=datetime(2026,10,4,tzinfo=timezone.utc)
        raw={'sensor.x':[{'lu':start.timestamp()+i,'s':str(i)} for i in range(2000)]}
        data=material_history_data(['sensor.x'],raw,start,start+timedelta(days=1))
        self.assertEqual(len(data['labels']),720)
        self.assertEqual(data['datasets'][0]['data'][-1],1999)

if __name__=='__main__': unittest.main()
