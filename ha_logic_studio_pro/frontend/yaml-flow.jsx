import React from 'react';
import {createRoot} from 'react-dom/client';
import {Background, Handle, MarkerType, MiniMap, Position, ReactFlow, useReactFlow} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function Step({data}) {
  return <details className="yaml-flow-card nodrag nopan" data-role={data.role}>
    {data.incoming && <Handle type="target" position={Position.Left} isConnectable={false}/>}
    <summary title={[data.kind, data.name, data.detail].filter(Boolean).join(' · ')}>
      <span className="yaml-flow-icon" aria-hidden="true">{{trigger: 'ϟ', choice: '⑂', branch: '⑂', condition: '?', action: '▶'}[data.role]}</span>
      <span className="yaml-flow-copy">
        <small>{data.kind}</small>
        {data.name && <strong>{data.name}</strong>}
        {data.detail && <span>{data.detail}</span>}
      </span>
    </summary>
    <pre className="nowheel">{data.yaml}</pre>
    {data.ports && <div className="yaml-flow-ports">
      {data.ports.map(({title, detail}, index) => <div key={index} title={[title, detail].filter(Boolean).join(' · ')}>
        <span>{title}</span>
        <Handle id={String(index)} type="source" position={Position.Right} isConnectable={false}/>
      </div>)}
    </div>}
    {!data.ports && data.outgoing && <Handle type="source" position={Position.Right} isConnectable={false}/>}
  </details>;
}

const nodeTypes = {step: Step};

function ViewControls({labels}) {
  const {zoomIn, zoomOut, fitView} = useReactFlow();
  return <div className="yaml-flow-controls">
    <button type="button" aria-label={labels.zoomIn} title={labels.zoomIn} onClick={() => zoomIn()}>+</button>
    <button type="button" aria-label={labels.zoomOut} title={labels.zoomOut} onClick={() => zoomOut()}>−</button>
    <button type="button" onClick={() => fitView({padding: .16})}>{labels.fit}</button>
  </div>;
}

export function mountYamlFlow(host, nodes, links, labels) {
  const edges = links.map(([source, target], index) => ({
    id: String(index), source: source.id ?? source, sourceHandle: source.handle, target,
    markerEnd: {type: MarkerType.ArrowClosed},
  }));
  const outgoing = new Set(edges.map(({source}) => source));
  for (const item of nodes) item.data.outgoing = outgoing.has(item.id);
  const root = createRoot(host);
  root.render(<ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView
    nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
    deleteKeyCode={null} panOnDrag zoomOnScroll minZoom={.12} maxZoom={2}>
    <Background gap={14} size={1}/>
    <MiniMap pannable zoomable nodeColor={node => ({trigger: '#c89018', action: '#28a36a'}[node.data.role] ?? '#818cf8')}/>
    <ViewControls labels={labels}/>
  </ReactFlow>);
  return () => root.unmount();
}
