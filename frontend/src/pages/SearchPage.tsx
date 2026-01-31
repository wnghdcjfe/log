import { useState, useMemo, useEffect } from 'react'
import { useDiariesContext } from '../context/DiariesContext'
import { KeywordGraph } from '../components/KeywordGraph'
import { GraphDetailPanel } from '../components/GraphDetailPanel'
import { SearchBar } from '../components/SearchBar'
import { QuestionUI } from '../components/QuestionUI'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { Timeline } from '../components/Timeline'
import type { RecordNode, SearchResult, QuestionResult } from '../data/mockData'

export function SearchPage() {
  const { nodes, timelineEvents, questionResults, findSearchResult, loading } = useDiariesContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [, setSearchHistory] = useState<SearchResult[]>([])
  const [selectedSearch, setSelectedSearch] = useState<SearchResult | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionResult | null>(null)
  const [selectedNode, setSelectedNode] = useState<RecordNode | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [onlyMatches, setOnlyMatches] = useState(true)
  const [, _setTimelineNodeIds] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    const result = findSearchResult(query)
    if (result) {
      setSelectedSearch(result)
      setSearchHistory((prev) => {
        const next = prev.filter((r) => r.query !== result.query)
        return [result, ...next].slice(0, 5)
      })
    }
    setSearchQuery(query)
  }

  useEffect(() => {
    if (loading) return
    const result = findSearchResult('번아웃')
    if (result) {
      setSelectedSearch(result)
      setSearchQuery('번아웃')
    }
  }, [loading, findSearchResult])

  const matchedNodeIds = useMemo(
    () => selectedSearch?.nodeIds ?? [],
    [selectedSearch]
  )

  const displayNodes = useMemo(() => {
    if (onlyMatches && selectedSearch) {
      return nodes.filter((n) => matchedNodeIds.includes(n.id))
    }
    return nodes
  }, [onlyMatches, selectedSearch, matchedNodeIds, nodes])

  const graphOpened = selectedSearch !== null

  return (
    <div className="flex-1 flex flex-col">
      <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: '#FFDAB9' }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-[#8b6355]">로딩 중...</p>
          </div>
        ) : !graphOpened ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <p className="text-[#8b6355] text-lg mb-2">
                내 기억 구조를 직접 들여다보는 앱
              </p>
              <p className="text-[#8b6355]/70 text-sm">
                위 검색창에 키워드나 자연어를 입력하면
                <br />
                관련된 사건 묶음이 그래프로 열립니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden max-w-[1200px] w-full mx-auto px-4 py-4">
            <div className="flex gap-3 items-center mb-3">
              <label className="flex gap-2 items-center select-none text-[#8b6355] text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyMatches}
                  onChange={(e) => setOnlyMatches(e.target.checked)}
                  className="rounded"
                />
                매칭만 표시
              </label>
              <span className="text-[#8b6355] text-sm">
                결과: <b className="text-[#e89580]">{matchedNodeIds.length}</b>개
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 flex-1 min-h-0">
              <div
                className="border rounded-xl overflow-hidden min-h-[520px]"
                style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
              >
                <div className="px-3 py-2.5 border-b text-[#8b6355] text-sm" style={{ borderColor: '#FFDAB9' }}>
                  드래그로 노드 이동, 휠로 줌, 빈 공간 드래그로 이동 가능합니다.
                </div>
                <KeywordGraph
                  query={searchQuery}
                  nodes={displayNodes}
                  matchedNodeIds={matchedNodeIds}
                  onlyMatches={onlyMatches}
                  onNodeSelect={(n) => {
                    setSelectedNode(n)
                    setShowOriginal(false)
                  }}
                />
              </div>

              <div
                className="border rounded-xl overflow-hidden p-4 min-h-[520px]"
                style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
              >
                <h3 className=" font-semibold text-[#e89580] mb-2">상세</h3>
                <GraphDetailPanel
                  node={selectedNode}
                  onViewOriginal={() => setShowOriginal(true)}
                /> 
              </div>
            </div>
          </div>
        )}

        {selectedNode && showOriginal && (
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setShowOriginal(false)}
          />
        )}

        <div className="absolute right-4 top-4 z-10">
          <button
            onClick={() => setShowQuestions((v) => !v)}
            className="px-3 py-2 rounded-lg border shadow text-sm transition-colors"
            style={{ backgroundColor: '#FFF9F5', borderColor: '#FFB6A3', color: '#8b6355' }}
          >
            질문
          </button>
          {showQuestions && (
            <div className="mt-2 w-64">
              <QuestionUI
                questions={questionResults}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
              />
            </div>
          )}
        </div>

        <div className="absolute left-4 bottom-4 z-10">
          <button
            onClick={() => setShowTimeline((v) => !v)}
            className="px-3 py-2 rounded-lg border shadow text-sm transition-colors"
            style={{ backgroundColor: '#FFF9F5', borderColor: '#FFB6A3', color: '#8b6355' }}
          >
            타임라인
          </button>
          {showTimeline && (
            <div className="mt-2 w-64 max-h-64 overflow-y-auto">
              <Timeline
                events={timelineEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSelectNodeIds={_setTimelineNodeIds}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
