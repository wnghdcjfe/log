import { createContext, useContext, type ReactNode } from 'react'
import { useDiaries } from '@/hooks/useDiaries'
import type { RecordNode, GraphEdge, TimelineEvent, SearchResult, QuestionResult } from '@/data/mockData'

interface DiariesContextValue {
  nodes: RecordNode[]
  edges: GraphEdge[]
  timelineEvents: TimelineEvent[]
  questionResults: QuestionResult[]
  findSearchResult: (query: string) => SearchResult | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const DiariesContext = createContext<DiariesContextValue | null>(null)

export function DiariesProvider({ children }: { children: ReactNode }) {
  const value = useDiaries()
  return (
    <DiariesContext.Provider value={value}>
      {children}
    </DiariesContext.Provider>
  )
}

export function useDiariesContext() {
  const ctx = useContext(DiariesContext)
  if (!ctx) throw new Error('useDiariesContext must be used within DiariesProvider')
  return ctx
}
