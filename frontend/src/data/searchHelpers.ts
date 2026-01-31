import type { SearchResult } from './mockData'
import { mockSearchResults } from './mockData'

/** 검색어로 결과 찾기 (데모: 키워드 매칭) */
export function findSearchResult(query: string): SearchResult | null {
  const q = query.trim().toLowerCase()
  const exact = mockSearchResults.find((r) => r.query.toLowerCase() === q)
  if (exact) return exact
  const partial = mockSearchResults.find((r) =>
    r.query.toLowerCase().includes(q) || q.includes(r.query.toLowerCase())
  )
  return partial ?? mockSearchResults[0]
}
