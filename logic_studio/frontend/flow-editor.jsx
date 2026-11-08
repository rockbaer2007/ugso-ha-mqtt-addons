import React, {useState, useLayoutEffect, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {ReactFlow, ReactFlowProvider, Handle, Position, MiniMap, Background,
  BackgroundVariant, ConnectionMode, ConnectionLineType, applyNodeChanges,
  useUpdateNodeInternals, useConnection, useStoreApi} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './flow-editor.css';
import {handleId, connectionEndpoints, graphEdges} from '../web/flow-model.js';

// Existing property controls remain DOM based; only the canvas owns React state.
// Portals keep Handles within the React Flow node context, even in these controls.
function LogicNode({id, data}) {
  const host = useRef(null);
  const [ports, setPorts] = useState([]);
  const updateInternals = useUpdateNodeInternals();
  const connection = useConnection();
  useLayoutEffect(() => {
    host.current.replaceChildren(data.element);
    setPorts([...data.element.querySelectorAll('.pin')]);
  }, [data.element]);
  useLayoutEffect(() => { updateInternals(id); }, [id, ports, updateInternals]);
  return <div className="logic-flow-node">
    <div ref={host}/>
    {ports.map(port => {
      const side = port.dataset.side;
      let validity = '';
      if (connection.inProgress && connection.fromHandle) {
        const start = {block: connection.fromNode.id, handle: connection.fromHandle.id};
        if (start.block !== id || start.handle !== handleId(side, port.dataset.pin)) {
          try {
            data.validate({source: start.block, sourceHandle: start.handle,
              target: id, targetHandle: handleId(side, port.dataset.pin)});
            validity = ' compatible';
          } catch { validity = ' incompatible'; }
        }
      }
      return createPortal(<Handle id={handleId(side, port.dataset.pin)}
        type={side === 'outputs' ? 'source' : 'target'}
        position={side === 'outputs' ? Position.Right : Position.Left}
        className={'logic-handle' + validity} style={{background: port.style.getPropertyValue('--pin')}}
        aria-label={port.getAttribute('aria-label')} tabIndex={-1}/>, port, handleId(side, port.dataset.pin));
    })}
  </div>;
}
const nodeTypes = {logic: LogicNode};

export function mountFlow(element, callbacks) {
  let receive = null, instance = null;
  let latest = {nodes: [], links: [], grid: true};
  const validate = c => callbacks.validate(...connectionEndpoints(c));
  const controller = {
    render(model) { latest = model; receive?.(model); },
    point(clientX, clientY) { return instance?.screenToFlowPosition({x: clientX, y: clientY}) || {x: 80, y: 70}; },
    center() { const r = element.getBoundingClientRect(); return controller.point(r.left + 80, r.top + 70); },
    zoom(delta) { if (instance) instance.zoomTo(Math.max(.25, Math.min(2, instance.getZoom() + delta))); },
    fit() { instance?.fitView({padding: .2, maxZoom: 1}); },
  };
  function Editor() {
    const store = useStoreApi();
    const cancelled = useRef(false);
    const dragging = useRef(false);
    const [model, setModel] = useState(latest);
    const [nodes, setNodes] = useState([]);
    useLayoutEffect(() => { receive = setModel; setModel(latest); return () => { receive = null; }; }, []);
    useLayoutEffect(() => { setNodes(model.nodes.map(n => ({...n, data: {...n.data, validate}}))); }, [model]);
    useEffect(() => {
      const cancel = event => {
        if (event.key === 'Escape') {
          cancelled.current = true;
          store.getState().cancelConnection();
        }
      };
      const drop = e => {
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;
        e.preventDefault(); callbacks.drop(type, controller.point(e.clientX, e.clientY));
      };
      const over = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
      document.addEventListener('keydown', cancel);
      element.addEventListener('drop', drop); element.addEventListener('dragover', over);
      return () => { document.removeEventListener('keydown', cancel); element.removeEventListener('drop', drop); element.removeEventListener('dragover', over); };
    }, [store]);
    return <ReactFlow nodes={nodes} edges={graphEdges(model.links)} nodeTypes={nodeTypes}
      onInit={flow => { instance = flow; }}
      onNodesChange={changes => {
        setNodes(current => applyNodeChanges(changes, current));
        for (const change of changes) {
          if (change.type === 'position' && change.position && !change.dragging && !dragging.current) callbacks.keyboardMove(change.id, change.position);
          if (change.type === 'select' && change.selected) callbacks.select(change.id);
        }
      }}
      onNodeDragStart={(_, node) => { dragging.current = true; callbacks.dragStart(node.id); }}
      onNodeDragStop={(_, node) => { callbacks.move(node.id, node.position); dragging.current = false; }}
      onNodeClick={(_, node) => callbacks.select(node.id)} onPaneClick={() => callbacks.select(null)}
      onEdgeClick={(_, edge) => callbacks.removeEdge(edge.data.index)}
      onConnectStart={() => { cancelled.current = false; }}
      onConnect={c => { if (cancelled.current) return; try { callbacks.connect(validate(c)); } catch (error) { callbacks.report(error.message); } }}
      isValidConnection={c => { try { validate(c); return true; } catch { return false; } }}
      onConnectEnd={(_, state) => {
        if (!cancelled.current && !state.isValid && state.fromHandle && state.toHandle) {
          try { validate({source: state.fromNode.id, sourceHandle: state.fromHandle.id,
            target: state.toNode.id, targetHandle: state.toHandle.id}); }
          catch (error) { callbacks.report(error.message); }
        }
      }}
      onMove={(_, viewport) => callbacks.zoom(viewport.zoom)}
      connectionMode={ConnectionMode.Loose} connectionLineType={ConnectionLineType.SmoothStep}
      connectionRadius={24} connectOnClick={false} edgesReconnectable={false}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionOnDrag={false}
      snapToGrid={model.grid} snapGrid={[10, 10]} minZoom={.25} maxZoom={2}
      defaultViewport={{x: 20, y: 20, zoom: 1}} nodeExtent={[[10, 10], [12210, 61000]]}
      panOnScroll zoomOnDoubleClick={false} colorMode="system"
      ariaLabelConfig={{'minimap.ariaLabel': 'Planübersicht', 'node.a11yDescription.default': 'Baustein mit Pfeiltasten verschieben. Eigenschaften über das Baustein-Menü öffnen.'}}
      onNodeContextMenu={(event, node) => { event.preventDefault(); callbacks.properties(node.id); }}>
      {model.grid && <Background variant={BackgroundVariant.Lines} gap={20} color="var(--grid)"/>}
      <MiniMap pannable zoomable nodeColor={node => node.data.accent || '#578cff'}
        bgColor="var(--panel)" maskColor="var(--overview-mask)" position="bottom-right"/>
    </ReactFlow>;
  }
  createRoot(element).render(<ReactFlowProvider><Editor/></ReactFlowProvider>);
  return controller;
}
