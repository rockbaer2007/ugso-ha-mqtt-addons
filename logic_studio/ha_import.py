"""Read-only, bounded HA import. Tags are data, never executed or resolved."""
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import yaml

class ImportLoader(yaml.SafeLoader):
    pass

ImportLoader.yaml_implicit_resolvers={k:[(tag,rx) for tag,rx in rules if tag not in ('tag:yaml.org,2002:timestamp','tag:yaml.org,2002:bool')] for k,rules in yaml.SafeLoader.yaml_implicit_resolvers.items()}
ImportLoader.add_implicit_resolver('tag:yaml.org,2002:bool',re.compile(r'^(?:true|false|True|False|TRUE|FALSE)$'),list('tTfF'))

def mapping(loader,node):
    result={}
    for key_node,value_node in node.value:
        key=loader.construct_object(key_node)
        if not isinstance(key,str) or key in result or key in ('__proto__','constructor','prototype'):
            raise ValueError('Doppelte oder ungültige YAML-Schlüssel.')
        result[key]=loader.construct_object(value_node)
    return result

ImportLoader.add_constructor('tag:yaml.org,2002:map',mapping)
def tagged(loader,tag,node):
    if not isinstance(node,yaml.ScalarNode) or not re.fullmatch(r'[a-zA-Z_][a-zA-Z0-9_]*',tag):
        raise ValueError('Nur skalare HA-Tags werden unterstützt.')
    return {'$haTag':tag,'value':loader.construct_scalar(node)}
ImportLoader.add_multi_constructor('!',tagged)

def bounded(value):
    count=0
    def walk(x,depth=0,ancestors=()):
        nonlocal count
        count+=1
        if count>15000 or depth>35:raise ValueError('Importstruktur zu groß oder zu tief.')
        if isinstance(x,(dict,list)):
            if id(x) in ancestors:raise ValueError('Zyklische YAML-Aliase nicht erlaubt.')
            chain=ancestors+(id(x),)
            if isinstance(x,list):return [walk(v,depth+1,chain) for v in x]
            if any(not isinstance(k,str) or k in ('__proto__','constructor','prototype') for k in x):raise ValueError('Ungültiger Schlüssel.')
            return {k:walk(v,depth+1,chain) for k,v in x.items()}
        if x is not None and type(x) not in (str,int,float,bool):raise ValueError('Nicht unterstützter YAML-Wert.')
        return x
    result=walk(value)
    if len(json.dumps(result,allow_nan=False))>900000:raise ValueError('Import zu groß.')
    return result

def parse_documents(text,kind='automation'):
    if not isinstance(text,str) or len(text.encode('utf-8'))>1000000:raise ValueError('Maximal 1 MB.')
    data=bounded(yaml.load(text,Loader=ImportLoader))
    if not data:return []
    if isinstance(data,dict) and 'blueprint' in data:return [{'name':data['blueprint'].get('name','Blueprint'),'kind':'blueprint','config':data}]
    if isinstance(data,dict) and 'automation' in data:data=data['automation'];kind='automation'
    elif isinstance(data,dict) and 'script' in data:data=data['script'];kind='script'
    if isinstance(data,list):entries=[(str(i),c) for i,c in enumerate(data)]
    elif isinstance(data,dict) and any(k in data for k in ('sequence','actions','action','triggers','trigger','use_blueprint')):entries=[('entry',data)]
    elif isinstance(data,dict):entries=list(data.items());kind='script'
    else:raise ValueError('HA-Konfiguration als Objekt oder Liste erwartet.')
    return [{'name':str(c.get('alias',key)),'kind':kind,'config':c} for key,c in entries if isinstance(c,dict)]

class SourceReader:
    def __init__(self,root,backup):self.root=Path(root).resolve();self.backup=Path(backup)
    def path(self,name):
        raw=self.root/name
        if any(p.is_symlink() for p in (raw,*raw.parents) if p!=self.root.parent):raise ValueError('Symbolische Importpfade nicht erlaubt.')
        path=raw.resolve()
        if not path.is_relative_to(self.root):raise ValueError('Ungültiger Importpfad.')
        return path
    def sources(self,kind):
        if kind in ('automation','script'):names=['automations.yaml' if kind=='automation' else 'scripts.yaml']
        elif kind=='blueprint':names=[p.relative_to(self.root).as_posix() for p in self.path('blueprints').glob('*/*/*.yaml')]+[p.relative_to(self.root).as_posix() for p in self.path('blueprints').glob('*/*.yaml')]
        else:raise ValueError('Ungültiger Importbereich.')
        results=[]
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        for name in sorted(names)[:250]:
            path=self.path(name)
            if not path.is_file():continue
            if path.stat().st_size>1000000:raise ValueError('Quelldatei überschreitet 1 MB.')
            # Copy bytes before parsing; original filename and relative path retained.
            saved=self.backup/stamp/name;saved.parent.mkdir(parents=True,exist_ok=True);saved.write_bytes(path.read_bytes())
            for i,item in enumerate(parse_documents(saved.read_text(encoding='utf-8'),kind)):
                results.append({**item,'source':name,'key':name+'#'+str(i)})
        return results
