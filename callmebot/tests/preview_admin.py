"""Loopback fixture. Provider is mocked; no real messages can be sent."""
import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(sys.argv[1]).resolve()/'app'))
import server
from core import Gateway
server.Gateway=lambda directory:Gateway(directory,sender=lambda profile,message:None)
os.environ['CALLMEBOT_NO_MQTT']='1'
server.main()
