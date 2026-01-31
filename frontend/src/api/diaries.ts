import type { RecordNode, GraphEdge, TimelineEvent, SearchResult, QuestionResult } from '@/data/mockData'

export interface ApiDiary {
  id: string
  title: string
  date: string
  feel: string[]
  content: string
}

function toRecordNode(d: ApiDiary): RecordNode {
  const date = typeof d.date === 'string' ? d.date : new Date(d.date).toISOString()
  const dateOnly = date.split('T')[0]
  return {
    id: d.id,
    type: 'record',
    label: d.title,
    timestamp: date.includes('T') ? date : `${dateOnly}T12:00:00`,
    emotion: (d.feel?.[0] ?? undefined) as RecordNode['emotion'],
    people: [],
    originalText: d.content,
    importance: 8,
  }
}

function buildEdges(nodes: RecordNode[]): GraphEdge[] {
  const edges: GraphEdge[] = []
  const sorted = [...nodes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  for (let i = 0; i < sorted.length - 1; i++) {
    edges.push({
      id: `e-${sorted[i].id}-${sorted[i + 1].id}`,
      source: sorted[i].id,
      target: sorted[i + 1].id,
      relationType: 'similar_to',
      label: '시간순',
    })
  }
  return edges
}

function buildTimelineEvents(nodes: RecordNode[]): TimelineEvent[] {
  return nodes.map((n) => ({
    id: `tl-${n.id}`,
    date: n.timestamp.split('T')[0],
    label: n.label,
    nodeIds: [n.id],
    summary: n.originalText.slice(0, 80) + '...',
  }))
}

function matchNode(node: RecordNode, q: string): boolean {
  const nq = q.trim().toLowerCase()
  if (!nq) return true
  const hay = [
    node.label,
    node.timestamp,
    node.originalText,
    node.emotion ?? '',
    ...(node.people ?? []),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(nq)
}

function buildSearchResult(query: string, nodes: RecordNode[], edges: GraphEdge[]): SearchResult {
  const matches = nodes.filter((n) => matchNode(n, query))
  const centralId = matches[0]?.id ?? nodes[0]?.id
  const edgeIds = edges
    .filter((e) => matches.some((m) => m.id === e.source) && matches.some((m) => m.id === e.target))
    .map((e) => e.id)
  return {
    query: query.trim(),
    centralNodeId: centralId,
    nodeIds: matches.map((m) => m.id),
    edgeIds,
  }
}

export async function fetchDiaries(): Promise<ApiDiary[]> {
  const res = await fetch('/api/diaries')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function transformDiaries(apiDiaries: ApiDiary[]) {
  const nodes = apiDiaries.map((d) => toRecordNode(d))
  const edges = buildEdges(nodes)
  const timelineEvents = buildTimelineEvents(nodes)

  const findSearchResult = (query: string): SearchResult =>
    buildSearchResult(query, nodes, edges)

  const questionResults: QuestionResult[] = [
    {
      questionId: 'q1',
      question: '퇴사를 고민한 적은?',
      nodeIds: nodes.filter((n) => matchNode(n, '퇴사')).map((n) => n.id),
      edgeIds: edges
        .filter((e) => {
          const src = nodes.find((n) => n.id === e.source)!
          const tgt = nodes.find((n) => n.id === e.target)!
          return matchNode(src, '퇴사') && matchNode(tgt, '퇴사')
        })
        .map((e) => e.id),
    },
    {
      questionId: 'q2',
      question: '태움이나 갈굼 경험',
      nodeIds: nodes.filter((n) => matchNode(n, '태움') || matchNode(n, '갈굼')).map((n) => n.id),
      edgeIds: [],
    },
    {
      questionId: 'q3',
      question: '번아웃·피로가 느껴진 순간들',
      nodeIds: nodes.filter((n) => matchNode(n, '번아웃') || matchNode(n, '피로')).map((n) => n.id),
      edgeIds: [],
    },
  ]

  return {
    nodes,
    edges,
    timelineEvents,
    findSearchResult,
    questionResults,
  }
}
