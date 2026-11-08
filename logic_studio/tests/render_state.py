"""Cross-check generated Jinja scans against the independent JavaScript engine."""
import json, sys
from jinja2.nativetypes import NativeEnvironment
env = NativeEnvironment()
requests = json.load(sys.stdin)
json.dump([env.from_string(item['template']).render(mem0=item['previous'], logic_now=item['now'], logic_boot=item['boot']) for item in requests], sys.stdout)
