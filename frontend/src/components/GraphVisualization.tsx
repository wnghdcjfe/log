import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Edge,
  Node,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { RecordNode } from './RecordNode'
import type { RecordNode as RecordNodeType, GraphEdge } from '@/data/mockData'
import { useMemo } from 'react'

const nodeTypes: NodeTypes = {
  record: RecordNode,
}

/** 중앙 노드 기준 radial 레이아웃: 지도처럼 탐색 */
function toReactFlowNodes(
  records: RecordNodeType[],
  centralNodeId: string | null,
  _highlightedIds: string[] = [],
  expandedIds: string[] = []
): Node[] {
  const centerX = 500
  const centerY = 300
  const radius = 220

  const central = records.find((r) => r.id === centralNodeId)
  const others = records.filter((r) => r.id !== centralNodeId)

  const result: Node[] = []

  if (central) {
    result.push({
      id: central.id,
      type: 'record',
      position: { x: centerX - 140, y: centerY - 60 },
      data: { ...central },
      className: 'central-node',
    })
  }

  const angleStep = others.length > 0 ? (2 * Math.PI) / others.length : 0
  others.forEach((r, i) => {
    const angle = angleStep * i - Math.PI / 2
    const x = centerX + radius * Math.cos(angle) - 140
    const y = centerY + radius * 0.6 * Math.sin(angle) - 60
    result.push({
      id: r.id,
      type: 'record',
      position: { x, y },
      data: { ...r, isExpanded: expandedIds.includes(r.id) || r.isExpanded },
      className: expandedIds.includes(r.id) ? 'expanded-node' : '',
    })
  })

  return result
}

function toReactFlowEdges(
  edges: GraphEdge[],
  highlightedIds: string[] = []
): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: highlightedIds.includes(e.id),
    style: {
      stroke: highlightedIds.includes(e.id) ? '#f59e0b' : '#94a3b8',
      strokeWidth: highlightedIds.includes(e.id) ? 2 : 1,
    },
  }))
}

interface GraphVisualizationProps {
  nodes: RecordNodeType[]
  edges: GraphEdge[]
  centralNodeId?: string | null
  highlightedNodeIds?: string[]
  highlightedEdgeIds?: string[]
  expandedNodeIds?: string[]
  onNodeSelect?: (node: RecordNodeType | null) => void
  onNodeDoubleClick?: (node: RecordNodeType) => void
}

export function GraphVisualization({
  nodes,
  edges,
  centralNodeId = null,
  highlightedNodeIds = [],
  highlightedEdgeIds = [],
  expandedNodeIds = [],
  onNodeSelect,
  onNodeDoubleClick,
}: GraphVisualizationProps) {
  const flowNodes = useMemo(
    () =>
      toReactFlowNodes(
        nodes,
        centralNodeId ?? nodes[0]?.id ?? null,
        highlightedNodeIds,
        expandedNodeIds
      ),
    [nodes, centralNodeId, highlightedNodeIds, expandedNodeIds]
  )
  const flowEdges = useMemo(
    () => toReactFlowEdges(edges, highlightedEdgeIds),
    [edges, highlightedEdgeIds]
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setRfNodes(flowNodes)
    setRfEdges(flowEdges)
  }, [flowNodes, flowEdges, setRfNodes, setRfEdges])

  const onConnect = useCallback(
    (params: Connection) => setRfEdges((eds) => addEdge(params, eds)),
    [setRfEdges]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<RecordNodeType>) => {
      onNodeSelect?.(node.data)
    },
    [onNodeSelect]
  )

  const onNodeDoubleClickHandler = useCallback(
    (_: React.MouseEvent, node: Node<RecordNodeType>) => {
      onNodeDoubleClick?.(node.data)
    },
    [onNodeDoubleClick]
  )

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null)
  }, [onNodeSelect])

  return (
    <div className="w-full h-full bg-[#f8fafc] rounded-xl">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClickHandler}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as RecordNodeType
            const map: Record<string, string> = {
              기쁨: '#22c55e',
              슬픔: '#3b82f6',
              분노: '#ef4444',
              불안: '#f59e0b',
              번아웃: '#f97316',
              후회: '#06b6d4',
              무력감: '#6366f1',
              피로: '#78716c',
              체념: '#57534e',
            }
            return map[d.emotion ?? ''] ?? '#64748b'
          }}
        />
      </ReactFlow>
    </div>
  )
}
