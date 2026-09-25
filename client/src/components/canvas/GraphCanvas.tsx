import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  Position,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppStore } from '../../store/useAppStore';
import type { AnalysisResult, FileNodeData, ViewMode } from '../../types';
import { getLayoutedElements } from '../../utils/dagreLayout';
import { FileNode } from './nodes/FileNode';
import { ModuleGroupNode } from './nodes/ModuleGroupNode';
import { ServiceNode } from './nodes/ServiceNode';
import { StartHereNode } from './nodes/StartHereNode';
import {
  Layers,
  GitFork,
  Server,
  Compass,
  Maximize2,
  ArrowRightLeft,
  ArrowUpDown,
  Focus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Play,
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Map,
} from 'lucide-react';

const nodeTypes = {
  file: FileNode,
  module: ModuleGroupNode,
  service: ServiceNode,
  startHere: StartHereNode,
};

const COLORS = {
  coral: '#E35336',
  cyan: '#38BDF8',
  amber: '#F59E0B',
  sand: '#F4A460',
  module: '#A0522D',
  emerald: '#10B981',
} as const;

const NODE_CLASS = 'nopan';
const DEFAULT_FIT_OPTIONS = { padding: 0.24, maxZoom: 1 };

function fileIsVisible(file: FileNodeData, hideTests: boolean, hideConfig: boolean): boolean {
  if (
    (file.language === 'markdown' || file.language === 'plaintext' || file.path.startsWith('docs/')) &&
    file.inDegree === 0 && file.outDegree === 0
  ) {
    return false;
  }
  if (hideTests && (file.fileType === 'test' || file.path.includes('.test.') || file.path.includes('.spec.'))) {
    return false;
  }
  if (hideConfig && (file.fileType === 'config' || file.path.endsWith('.json') || file.path.includes('.config.'))) {
    return false;
  }
  return true;
}

function buildGraphLayout(
  analysis: AnalysisResult,
  viewMode: ViewMode,
  direction: 'LR' | 'TB',
  hideTests: boolean,
  hideConfig: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (viewMode === 'architecture') {
    const modules = analysis.modules || [];
    const validIds = new Set(modules.map(m => m.id));
    modules.forEach(m => {
      nodes.push({
        id: m.id,
        type: 'module',
        className: NODE_CLASS,
        position: { x: 0, y: 0 },
        data: { module: m, width: 250, height: 90 },
      });
      m.dependencies.filter(dep => validIds.has(dep)).forEach(dep => {
        edges.push({
          id: `mod:${m.id}->${dep}`,
          source: m.id,
          target: dep,
        });
      });
    });
  } else if (viewMode === 'services') {
    const services = analysis.services || [];
    const validNames = new Set(services.map(s => s.name));
    services.forEach(s => {
      nodes.push({
        id: s.name,
        type: 'service',
        className: NODE_CLASS,
        position: { x: 0, y: 0 },
        data: { service: s, width: 250, height: 90 },
      });
      (s.dependsOn || []).filter(dep => validNames.has(dep)).forEach(dep => {
        edges.push({
          id: `srv:${s.name}->${dep}`,
          source: s.name,
          target: dep,
        });
      });
    });
  } else if (viewMode === 'start-here') {
    const order = analysis.readingOrder || [];
    const NODE_WIDTH = 340;
    const NODE_HEIGHT = 130;
    const VERTICAL_GAP = 70;

    order.forEach((item, idx) => {
      nodes.push({
        id: item.path,
        type: 'startHere',
        className: NODE_CLASS,
        position: { x: 0, y: idx * (NODE_HEIGHT + VERTICAL_GAP) },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        data: {
          item: { ...item, rank: idx + 1 },
          file: analysis.nodes.find(n => n.id === item.path),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
      });
      if (idx > 0) {
        edges.push({
          id: `reading:${idx - 1}->${idx}`,
          source: order[idx - 1].path,
          target: item.path,
        });
      }
    });

    return { nodes, edges };
  } else {
    // file-flow MODE
    const files = (analysis.nodes || []).filter(f => fileIsVisible(f, hideTests, hideConfig));
    const validIds = new Set(files.map(f => f.id));
    files.forEach(f => {
      nodes.push({
        id: f.id,
        type: 'file',
        className: NODE_CLASS,
        position: { x: 0, y: 0 },
        data: { file: f, width: 240, height: 92 },
      });
    });
    (analysis.edges || [])
      .filter(e => validIds.has(e.source) && validIds.has(e.target))
      .forEach(e => {
        edges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          data: { isCycle: e.isCycle },
        });
      });
  }

  if (nodes.length === 0) return { nodes, edges };

  return getLayoutedElements(nodes, edges, {
    direction,
    nodesep: 45,
    ranksep: 120,
  });
}

function matchesSearch(node: Node, query: string): boolean {
  if (!query) return true;
  const data = node.data as Record<string, any>;
  const file = data.file as FileNodeData | undefined;
  const module = data.module as { id: string; name: string } | undefined;
  const service = data.service as { name: string } | undefined;
  const item = data.item as { path: string; reason?: string } | undefined;

  if (file) {
    return file.path.toLowerCase().includes(query) || file.label.toLowerCase().includes(query);
  }
  if (module) {
    return module.id.toLowerCase().includes(query) || module.name.toLowerCase().includes(query);
  }
  if (service) {
    return service.name.toLowerCase().includes(query);
  }
  if (item) {
    return item.path.toLowerCase().includes(query) || Boolean(item.reason && item.reason.toLowerCase().includes(query));
  }
  return false;
}

const GraphCanvasInner: React.FC = () => {
  // Fine-grained Zustand selectors to prevent unnecessary re-renders
  const analysis = useAppStore(s => s.analysis);
  const viewMode = useAppStore(s => s.viewMode);
  const layoutDirection = useAppStore(s => s.layoutDirection);
  const toggleLayoutDirection = useAppStore(s => s.toggleLayoutDirection);
  const selectedNodeId = useAppStore(s => s.selectedNodeId);
  const setSelectedNodeId = useAppStore(s => s.setSelectedNodeId);
  const filters = useAppStore(s => s.filters);
  const theme = useAppStore(s => s.theme);

  const { fitView } = useReactFlow();
  const fittedGraphRef = useRef<string | null>(null);

  // Interactive File Flow state
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [isolateConnected, setIsolateConnected] = useState(false);
  const [hopDepth, setHopDepth] = useState<1 | 2>(1);
  const [callerIndex, setCallerIndex] = useState(0);
  const [importIndex, setImportIndex] = useState(0);
  const [copiedPath, setCopiedPath] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);

  // 1. Stable Graph Layout (Positioning only; never re-runs on node selection or hover)
  const graph = useMemo(() => {
    if (!analysis) return { nodes: [], edges: [] };
    return buildGraphLayout(analysis, viewMode, layoutDirection, filters.hideTests, filters.hideConfig);
  }, [analysis, viewMode, layoutDirection, filters.hideTests, filters.hideConfig]);

  // Unique identifier for the layouted graph structure
  const graphKey = useMemo(() => [
    analysis?._id || analysis?.id || analysis?.commitSha || 'none',
    viewMode,
    layoutDirection,
    filters.hideTests,
    filters.hideConfig,
    graph.nodes.length,
  ].join(':'), [analysis, viewMode, layoutDirection, filters.hideTests, filters.hideConfig, graph.nodes.length]);

  // 2. Auto-fit to the centered default position ONLY when base graph structure changes
  useEffect(() => {
    if (graph.nodes.length === 0 || fittedGraphRef.current === graphKey) return;
    fittedGraphRef.current = graphKey;

    const runDefaultFit = (duration = 0) => {
      fitView({ padding: 0.24, duration, maxZoom: 1 });
    };

    // Immediate fit pass
    runDefaultFit(0);

    // Follow-up passes once the canvas container size is fully calculated by the browser
    const timer1 = window.setTimeout(() => runDefaultFit(0), 40);
    const timer2 = window.setTimeout(() => runDefaultFit(0), 160);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, [fitView, graph.nodes.length, graphKey]);

  // Reset isolation and stepper indices on view change or selection change
  useEffect(() => {
    if (viewMode !== 'file-flow') {
      setIsolateConnected(false);
    }
  }, [viewMode]);

  useEffect(() => {
    setCallerIndex(0);
    setImportIndex(0);
  }, [selectedNodeId]);

  // Derived selected file & helper collections
  const selectedFile = useMemo(() => {
    if (!analysis || !selectedNodeId) return null;
    return analysis.nodes.find(f => f.id === selectedNodeId) || null;
  }, [analysis, selectedNodeId]);

  const entryFiles = useMemo(() => (analysis?.nodes || []).filter(f => f.fileType === 'entry'), [analysis]);
  const cycleFiles = useMemo(() => (analysis?.nodes || []).filter(f => f.isCycleMember), [analysis]);

  // In architecture view, find the module ID that contains the selected file
  const selectedCanvasId = useMemo(() => {
    if (!selectedNodeId || !analysis) return null;
    if (viewMode === 'architecture') {
      return analysis.modules.find(m => m.files.includes(selectedNodeId))?.id || null;
    }
    return selectedNodeId;
  }, [analysis, selectedNodeId, viewMode]);

  const isolationActive = viewMode === 'file-flow' && Boolean(selectedFile) && isolateConnected;

  // Active callers, imports, and neighborhood for directional highlights
  const relatedIds = useMemo(() => {
    const incoming = new Set(selectedFile?.importedBy || []);
    const outgoing = new Set(selectedFile?.imports || []);
    const neighborhood = new Set<string>();

    if (isolationActive && selectedFile && analysis) {
      neighborhood.add(selectedFile.id);
      incoming.forEach(id => neighborhood.add(id));
      outgoing.forEach(id => neighborhood.add(id));
      if (hopDepth === 2) {
        [...neighborhood].forEach(id => {
          const file = analysis.nodes.find(f => f.id === id);
          file?.importedBy.forEach(neighbor => neighborhood.add(neighbor));
          file?.imports.forEach(neighbor => neighborhood.add(neighbor));
        });
      }
    }
    return { incoming, outgoing, neighborhood };
  }, [analysis, selectedFile, isolationActive, hopDepth]);

  // Node selection handler: camera position stays 100% frozen
  const selectGraphNode = useCallback((nodeId: string) => {
    if (viewMode === 'architecture') {
      const module = analysis?.modules.find(m => m.id === nodeId);
      setSelectedNodeId(module?.files[0] || null);
      return;
    }
    setSelectedNodeId(nodeId);
  }, [analysis, setSelectedNodeId, viewMode]);

  const focusFile = useCallback((fileId: string) => {
    setSelectedNodeId(fileId);
    setIsolateConnected(true);
  }, [setSelectedNodeId]);

  // 3. Dynamic Node Styling (In-place on top of stable coordinates)
  const nodes = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();

    return graph.nodes.map(node => {
      const file = (node.data as Record<string, any>).file as FileNodeData | undefined;
      const isSearchMatch = matchesSearch(node, query);
      const isSelected = node.id === selectedCanvasId;
      const isIncoming = viewMode === 'file-flow' && relatedIds.incoming.has(node.id);
      const isOutgoing = viewMode === 'file-flow' && relatedIds.outgoing.has(node.id);
      const isDimmed = Boolean(query && !isSearchMatch) || Boolean(isolationActive && !relatedIds.neighborhood.has(node.id));

      return {
        ...node,
        data: {
          ...node.data,
          isSelected,
          isIncoming,
          isOutgoing,
          isHighlighted: isSelected || isIncoming || isOutgoing || isSearchMatch,
          isSearchMatch: Boolean(query) && isSearchMatch,
          isDimmed,
          onFocusNeighborhood: file ? focusFile : undefined,
          onHighlightCallers: file ? setSelectedNodeId : undefined,
          onHighlightImports: file ? setSelectedNodeId : undefined,
        },
      } as Node;
    });
  }, [
    filters.searchQuery,
    focusFile,
    graph.nodes,
    isolationActive,
    relatedIds,
    selectedCanvasId,
    setSelectedNodeId,
    viewMode,
  ]);

  // 4. Dynamic Edge Styling (Directional colors and active state; hover handled via CSS)
  const edges = useMemo(() => {
    return graph.edges.map(edge => {
      const isCycle = Boolean((edge.data as Record<string, any> | undefined)?.isCycle);
      const isOutgoing = viewMode === 'file-flow' && edge.source === selectedFile?.id;
      const isIncoming = viewMode === 'file-flow' && edge.target === selectedFile?.id;

      let stroke = theme === 'dark' ? 'rgba(245,245,220,0.25)' : 'rgba(42,33,29,0.22)';
      let strokeWidth = 1.25;
      let opacity = 0.55;
      let animated = false;

      if (viewMode === 'architecture') {
        stroke = COLORS.coral;
        opacity = 0.7;
        animated = true;
      } else if (viewMode === 'services') {
        stroke = COLORS.sand;
        opacity = 0.75;
        animated = true;
      } else if (viewMode === 'start-here') {
        stroke = COLORS.coral;
        strokeWidth = 2;
        opacity = 0.75;
        animated = true;
      } else {
        // file-flow MODE
        if (isCycle) {
          stroke = COLORS.amber;
          strokeWidth = 2;
          opacity = 1;
          animated = true;
        }
        if (isOutgoing) {
          stroke = COLORS.coral; // Outgoing imports
          strokeWidth = 2.5;
          opacity = 1;
          animated = true;
        } else if (isIncoming) {
          stroke = COLORS.cyan; // Incoming callers
          strokeWidth = 2.5;
          opacity = 1;
          animated = true;
        } else if (selectedFile) {
          opacity = 0.2;
        }

        if (isolationActive && (!relatedIds.neighborhood.has(edge.source) || !relatedIds.neighborhood.has(edge.target))) {
          opacity = 0.06;
        }
      }

      return {
        ...edge,
        type: viewMode === 'start-here' ? 'straight' : 'default',
        animated,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
        },
        style: {
          stroke,
          strokeWidth,
          opacity,
          transition: 'stroke 150ms, stroke-width 150ms, opacity 150ms',
        },
      } as Edge;
    });
  }, [
    graph.edges,
    isolationActive,
    relatedIds.neighborhood,
    selectedFile,
    theme,
    viewMode,
  ]);

  // Stepper handlers
  const stepCaller = (delta: number) => {
    if (!selectedFile || selectedFile.importedBy.length === 0) return;
    const len = selectedFile.importedBy.length;
    const nextIdx = (callerIndex + delta + len) % len;
    setCallerIndex(nextIdx);
    setSelectedNodeId(selectedFile.importedBy[nextIdx]);
  };

  const stepImport = (delta: number) => {
    if (!selectedFile || selectedFile.imports.length === 0) return;
    const len = selectedFile.imports.length;
    const nextIdx = (importIndex + delta + len) % len;
    setImportIndex(nextIdx);
    setSelectedNodeId(selectedFile.imports[nextIdx]);
  };

  const jumpToNextFile = (files: FileNodeData[]) => {
    if (!files.length) return;
    const currentIndex = files.findIndex(f => f.id === selectedNodeId);
    setSelectedNodeId(files[(currentIndex + 1) % files.length].id);
  };

  const copyPath = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1500);
  };

  const openGitHub = () => {
    if (!analysis || !selectedFile) return;
    const branch = analysis.branch || 'main';
    const url = `https://github.com/${analysis.owner}/${analysis.repo}/blob/${branch}/${selectedFile.path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const viewInfo = {
    architecture: {
      title: 'Architecture',
      description: 'Module groupings and cross-module dependencies',
      icon: Layers,
      countLabel: `${analysis?.modules?.length || 0} modules`,
    },
    'file-flow': {
      title: 'File Flow',
      description: 'AST dependency graph — click to trace callers and imports',
      icon: GitFork,
      countLabel: `${graph.nodes.length} files · ${graph.edges.length} edges`,
    },
    services: {
      title: 'Services',
      description: 'Container and workspace topology',
      icon: Server,
      countLabel: `${analysis?.services?.length || 0} services`,
    },
    'start-here': {
      title: 'Start Here',
      description: 'Guided code-reading sequence based on centrality',
      icon: Compass,
      countLabel: `${analysis?.readingOrder?.length || 0} reading steps`,
    },
  }[viewMode];

  const ViewIcon = viewInfo.icon;
  const dark = theme === 'dark';

  // Hovered edge chip data
  const hoveredEdge = useMemo(() => {
    if (!hoveredEdgeId) return null;
    return graph.edges.find(e => e.id === hoveredEdgeId) || null;
  }, [graph.edges, hoveredEdgeId]);

  return (
    <section
      id="flow-canvas-container"
      className="relative flex-1 overflow-hidden select-none"
      style={{
        backgroundColor: dark ? '#11100F' : '#F5F5DC',
        height: 'calc(100vh - 3.5rem)',
      }}
    >
      {/* ========================================================================= */}
      {/* TOP LEFT: VIEW BADGE & METRICS */}
      {/* ========================================================================= */}
      <div
        className="absolute top-4 left-4 z-10 flex items-center gap-3 px-3.5 py-2 rounded-xl border shadow-sm backdrop-blur-md transition-all"
        style={{
          backgroundColor: dark ? 'rgba(24,22,20,0.92)' : 'rgba(255,253,247,0.92)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'rgba(227,83,54,0.12)',
            border: '1px solid rgba(227,83,54,0.25)',
          }}
        >
          <ViewIcon className="w-3.5 h-3.5" style={{ color: COLORS.coral }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              {viewInfo.title}
            </h2>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              {viewInfo.countLabel}
            </span>
          </div>
          <p className="text-[10px] mt-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>
            {viewInfo.description}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP CENTER: EDGE HOVER PREVIEW CHIP */}
      {/* ========================================================================= */}
      {hoveredEdge && (
        <div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono shadow-xl backdrop-blur-md animate-fade-in"
          style={{
            backgroundColor: dark ? 'rgba(24,22,20,0.95)' : 'rgba(255,253,247,0.95)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          <span className="text-[#38BDF8] font-bold truncate max-w-[150px]">
            {hoveredEdge.source.split('/').pop()}
          </span>
          <span className="text-gray-400 text-[10px]">&mdash; imports &rarr;</span>
          <span className="text-[#E35336] font-bold truncate max-w-[150px]">
            {hoveredEdge.target.split('/').pop()}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP RIGHT: CANVAS CONTROLS (Direction & Fit) */}
      {/* ========================================================================= */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleLayoutDirection}
          title="Toggle layout direction"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all duration-150 backdrop-blur-md hover:border-[#E35336]"
          style={{
            backgroundColor: dark ? 'rgba(24,22,20,0.92)' : 'rgba(255,253,247,0.92)',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = COLORS.coral)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {layoutDirection === 'LR' ? (
            <ArrowRightLeft className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline font-medium">
            {layoutDirection === 'LR' ? 'Horizontal' : 'Vertical'}
          </span>
        </button>

        <button
          onClick={() => fitView({ padding: 0.24, duration: 300, maxZoom: 1 })}
          title="Fit graph to viewport"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all duration-150 backdrop-blur-md hover:border-[#E35336]"
          style={{
            backgroundColor: dark ? 'rgba(24,22,20,0.92)' : 'rgba(255,253,247,0.92)',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = COLORS.coral)}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Fit</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REACT FLOW CANVAS (Canva/Figma Navigation Engine) */}
      {/* ========================================================================= */}
      <ReactFlow
        fitView
        fitViewOptions={DEFAULT_FIT_OPTIONS}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(event, node) => {
          event.stopPropagation();
          selectGraphNode(node.id);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          selectGraphNode(edge.source);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setIsolateConnected(false);
        }}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={false}
        selectNodesOnDrag={false}
        autoPanOnNodeFocus={false}
        nodeClickDistance={6}
        paneClickDistance={6}
        minZoom={0.25}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={dark ? 'rgba(245,245,220,0.07)' : 'rgba(42,33,29,0.08)'}
          gap={24}
          size={1}
        />
        <Controls
          showInteractive={false}
          className="!bottom-5 !left-4 !rounded-xl !border !shadow-md overflow-hidden"
        />
        {showMiniMap && (
          <MiniMap
            nodeColor={n => {
              if (n.type === 'service') return COLORS.sand;
              if (n.type === 'module') return COLORS.module;
              if (n.type === 'startHere') return COLORS.coral;
              const f = (n.data as any)?.file;
              if (f?.isCycleMember) return COLORS.amber;
              if (f?.fileType === 'entry') return COLORS.coral;
              return dark ? 'rgba(245,245,220,0.15)' : 'rgba(42,33,29,0.15)';
            }}
            maskColor={dark ? 'rgba(17,16,15,0.75)' : 'rgba(245,245,220,0.75)'}
            className="!bottom-16 !right-4 !rounded-xl !border !shadow-2xl animate-fade-in"
          />
        )}
      </ReactFlow>

      {/* ========================================================================= */}
      {/* BOTTOM RIGHT: MINIMAP TOGGLE BUTTON */}
      {/* ========================================================================= */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center">
        <button
          onClick={() => setShowMiniMap(prev => !prev)}
          title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border shadow-sm backdrop-blur-md transition-all duration-150 hover:border-[#E35336]"
          style={{
            backgroundColor: dark ? 'rgba(24,22,20,0.92)' : 'rgba(255,253,247,0.92)',
            borderColor: showMiniMap ? COLORS.coral : 'var(--border)',
            color: showMiniMap ? COLORS.coral : 'var(--text-muted)',
          }}
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Map</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING INTERACTIVE DOCK (File Flow View) */}
      {/* ========================================================================= */}
      {viewMode === 'file-flow' && (
        dockCollapsed ? (
          <button
            onClick={() => setDockCollapsed(false)}
            className="floating-center-dock flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs shadow-xl backdrop-blur-md transition-all hover:scale-105"
            style={{
              backgroundColor: dark ? 'rgba(24,22,20,0.95)' : 'rgba(255,253,247,0.95)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
            title="Expand File Flow tools"
          >
            <GitFork className="w-3.5 h-3.5" style={{ color: COLORS.coral }} />
            <span className="font-medium">Flow Tools</span>
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          </button>
        ) : (
          <div className="floating-center-dock flex flex-col items-center gap-2 max-w-[95%] pointer-events-auto">
            {/* Active Selected File Quick Stepper Card */}
            {selectedFile && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-xl backdrop-blur-md transition-all"
                style={{
                  backgroundColor: dark ? 'rgba(22,25,31,0.96)' : 'rgba(255,253,247,0.96)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                {/* File Label & Indicator */}
                <div className="flex items-center gap-1.5 pr-2 border-r" style={{ borderColor: 'var(--border)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.coral }} />
                  <span
                    className="font-mono font-bold truncate max-w-[130px] sm:max-w-[200px]"
                    title={selectedFile.path}
                  >
                    {selectedFile.label}
                  </span>
                </div>

                {/* Callers Stepper */}
                {selectedFile.importedBy.length > 0 ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[#38BDF8]">
                    <ArrowDownLeft className="w-3 h-3" />
                    <span className="text-[10px] font-semibold">{selectedFile.importedBy.length} Callers</span>
                    <button
                      onClick={() => stepCaller(-1)}
                      className="p-0.5 hover:bg-sky-500/20 rounded transition-colors"
                      title="Previous caller"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => stepCaller(1)}
                      className="p-0.5 hover:bg-sky-500/20 rounded transition-colors"
                      title="Next caller"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">
                    Root
                  </span>
                )}

                {/* Imports Stepper */}
                {selectedFile.imports.length > 0 ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E35336]/10 border border-[#E35336]/20 text-[#E35336]">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-[10px] font-semibold">{selectedFile.imports.length} Imports</span>
                    <button
                      onClick={() => stepImport(-1)}
                      className="p-0.5 hover:bg-[#E35336]/20 rounded transition-colors"
                      title="Previous import"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => stepImport(1)}
                      className="p-0.5 hover:bg-[#E35336]/20 rounded transition-colors"
                      title="Next import"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">
                    Leaf
                  </span>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1 pl-1 border-l" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={copyPath}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: copiedPath ? COLORS.emerald : 'var(--text-muted)' }}
                    title="Copy relative file path"
                  >
                    {copiedPath ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={openGitHub}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5 hover:text-[#F4A460]" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNodeId(null);
                      setIsolateConnected(false);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    title="Deselect"
                  >
                    <X className="w-3.5 h-3.5 hover:text-red-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Interactive File Flow Toolbar Dock */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-lg backdrop-blur-md"
              style={{
                backgroundColor: dark ? 'rgba(24,22,20,0.94)' : 'rgba(255,253,247,0.94)',
                borderColor: 'var(--border)',
              }}
            >
              {/* Isolate Neighborhood Toggle */}
              <button
                onClick={() => setIsolateConnected(!isolateConnected)}
                disabled={!selectedFile}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: isolationActive ? 'rgba(227,83,54,0.16)' : 'transparent',
                  borderColor: isolationActive ? COLORS.coral : 'var(--border)',
                  borderWidth: 1,
                  color: isolationActive ? COLORS.coral : 'var(--text-secondary)',
                }}
                title={selectedFile ? "Isolate selected file's immediate subgraph" : 'Select a file to isolate'}
              >
                <Focus className="w-3.5 h-3.5" />
                <span>{isolationActive ? 'Focus Active' : 'Focus Subgraph'}</span>
              </button>

              {/* Hop Depth Toggle */}
              {isolationActive && (
                <div
                  className="flex items-center rounded-md border p-0.5"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)' }}
                >
                  <button
                    onClick={() => setHopDepth(1)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors"
                    style={{
                      backgroundColor: hopDepth === 1 ? COLORS.coral : 'transparent',
                      color: hopDepth === 1 ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    1-hop
                  </button>
                  <button
                    onClick={() => setHopDepth(2)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors"
                    style={{
                      backgroundColor: hopDepth === 2 ? COLORS.coral : 'transparent',
                      color: hopDepth === 2 ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    2-hop
                  </button>
                </div>
              )}

              {/* Entry Points Quick Jumper */}
              {entryFiles.length > 0 && (
                <button
                  onClick={() => jumpToNextFile(entryFiles)}
                  className="flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'rgba(227,83,54,0.08)',
                    borderColor: 'rgba(227,83,54,0.3)',
                    color: COLORS.coral,
                  }}
                  title="Jump to next entry file"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>Entry ({entryFiles.length})</span>
                </button>
              )}

              {/* Circular Dependencies Detector */}
              {cycleFiles.length > 0 && (
                <button
                  onClick={() => jumpToNextFile(cycleFiles)}
                  className="flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold animate-pulse"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.12)',
                    borderColor: COLORS.amber,
                    color: COLORS.amber,
                  }}
                  title="Cycle member files"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Cycles ({cycleFiles.length})</span>
                </button>
              )}

              {/* Directional Color Legend */}
              <div
                className="hidden md:flex items-center gap-2.5 pl-2 border-l text-[10px]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.cyan }} />
                  <span>Caller</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.coral }} />
                  <span>Import</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.amber }} />
                  <span>Cycle</span>
                </div>
              </div>

              {/* Minimize Dock Button */}
              <button
                onClick={() => setDockCollapsed(true)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-1"
                title="Minimize toolbar"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* BOTTOM LEFT LEGEND FOR OTHER VIEW MODES */}
      {/* ========================================================================= */}
      {viewMode !== 'file-flow' && (
        <div
          className="absolute bottom-5 right-28 z-10 flex items-center gap-3.5 px-3 py-1.5 rounded-xl border text-[11px] shadow-sm backdrop-blur-md"
          style={{
            backgroundColor: dark ? 'rgba(24,22,20,0.92)' : 'rgba(255,253,247,0.92)',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          {viewMode === 'architecture' && [
            { label: 'Module Group', color: COLORS.coral },
            { label: 'Dependency Edge', color: 'rgba(227,83,54,0.6)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}

          {viewMode === 'services' && [
            { label: 'Container Service', color: COLORS.sand },
            { label: 'Service Link', color: 'rgba(244,164,96,0.6)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}

          {viewMode === 'start-here' && [
            { label: 'Central Reading Step', color: COLORS.coral },
            { label: 'Sequential Flow', color: 'rgba(227,83,54,0.6)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const GraphCanvas: React.FC = () => (
  <ReactFlowProvider>
    <GraphCanvasInner />
  </ReactFlowProvider>
);
