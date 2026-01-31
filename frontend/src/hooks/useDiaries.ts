import { useState, useEffect, useCallback } from 'react'
import { fetchDiaries, transformDiaries } from '@/api/diaries'
import {
  mockNodes,
  mockEdges,
  mockTimelineEvents,
  mockQuestionResults,
} from '@/data/mockData'
import { findSearchResult as mockFindSearchResult } from '@/data/searchHelpers'
import type {
  RecordNode,
  GraphEdge,
  TimelineEvent,
  SearchResult,
  QuestionResult,
} from '@/data/mockData'

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

export function useDiaries() {
  const [nodes, setNodes] = useState<RecordNode[]>(mockNodes)
  const [edges, setEdges] = useState<GraphEdge[]>(mockEdges)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(mockTimelineEvents)
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>(mockQuestionResults)
  const [useMock, setUseMock] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDiaries()
      .then((apiDiaries) => {
        const transformed = transformDiaries(apiDiaries)
        setNodes(transformed.nodes)
        setEdges(transformed.edges)
        setTimelineEvents(transformed.timelineEvents)
        setQuestionResults(transformed.questionResults)
        setUseMock(false)
      })
      .catch(() => {
        setError('API 연결 실패, 목업 데이터 사용 중')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const findSearchResult = useCallback(
    (query: string): SearchResult | null => {
      if (useMock) return mockFindSearchResult(query)
      const matches = nodes.filter((n) => matchNode(n, query))
      if (matches.length === 0) return null
      const edgeIds = edges
        .filter(
          (e) =>
            matches.some((m) => m.id === e.source) && matches.some((m) => m.id === e.target)
        )
        .map((e) => e.id)
      return {
        query: query.trim(),
        centralNodeId: matches[0].id,
        nodeIds: matches.map((m) => m.id),
        edgeIds,
      }
    },
    [nodes, edges, useMock]
  )

  return {
    nodes,
    edges,
    timelineEvents,
    questionResults,
    findSearchResult,
    loading,
    error,
  }
}
