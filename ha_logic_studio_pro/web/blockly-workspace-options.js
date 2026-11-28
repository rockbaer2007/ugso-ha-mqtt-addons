// Shared view controls for Blocks A and Blocks JS. These affect the viewport,
// never block coordinates, saved projects or runtime behaviour.
export function blockWorkspaceOptions() {
  return {
    grid: {spacing: 20, length: 1, colour: '#697586', snap: false},
    move: {scrollbars: true, drag: true, wheel: true},
    zoom: {controls: true, wheel: true, pinch: true, startScale: 1, minScale: 0.25, maxScale: 2, scaleSpeed: 1.2},
  };
}
