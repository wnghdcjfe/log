import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDiariesContext } from '../context/DiariesContext'
import { KeywordGraph } from '../components/KeywordGraph'
import { GraphDetailPanel } from '../components/GraphDetailPanel'
import { SearchBar } from '../components/SearchBar'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import type { RecordNode, SearchResult } from '../data/mockData'
import { askQuestion, type QuestionResponse } from '../api/question'

export function SearchPage() {
  const { nodes, findSearchResult, loading } = useDiariesContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSearch, setSelectedSearch] = useState<SearchResult | null>(null)
  const [selectedNode, setSelectedNode] = useState<RecordNode | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [onlyMatches, setOnlyMatches] = useState(true)
  const [questionAnswer, setQuestionAnswer] = useState<QuestionResponse | null>(null)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setSearchQuery(query)
    setQuestionError(null)

    // Call backend Question API
    setQuestionLoading(true)
    try {
      const answer = await askQuestion(query)
      setQuestionAnswer(answer)

      // Create search result from AI response
      if (answer.reasoningPath.records && answer.reasoningPath.records.length > 0) {
        const relatedNodeIds = answer.reasoningPath.records
        const centralNodeId = relatedNodeIds[0]

        console.log('🔍 AI Response - Related Record IDs:', relatedNodeIds)
        console.log('📊 Available Node IDs:', nodes.map(n => n.id).slice(0, 5), `(total: ${nodes.length})`)

        // Check if any nodes match
        const matchingNodes = nodes.filter(n => relatedNodeIds.includes(n.id))
        console.log('✅ Matching Nodes Found:', matchingNodes.length)

        setSelectedSearch({
          query: query.trim(),
          centralNodeId,
          nodeIds: relatedNodeIds,
          edgeIds: [],
        })
      } else {
        console.log('⚠️ No records in AI response, falling back to keyword search')
        // Fallback to local keyword search
        const result = findSearchResult(query)
        if (result) setSelectedSearch(result)
      }
    } catch (err) {
      console.error('❌ Search error:', err)
      setQuestionError(err instanceof Error ? err.message : '답변 생성 실패')
      setQuestionAnswer(null)

      // Fallback to local keyword search on error
      const result = findSearchResult(query)
      if (result) setSelectedSearch(result)
    } finally {
      setQuestionLoading(false)
    }
  }, [findSearchResult, nodes])

  useEffect(() => {
    if (loading) return 
  }, [loading, handleSearch])

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
          loading={questionLoading}
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
          <div className="flex-1 flex flex-col overflow-hidden max-w-[1020px] w-full mx-auto px-4 py-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 flex-1 min-h-0">
              <div
                className="border rounded-xl overflow-hidden flex flex-col"
                style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
              >
                <div className="px-3 py-2.5 border-b text-[#8b6355] text-sm shrink-0" style={{ borderColor: '#FFDAB9' }}>
                  드래그로 노드 이동, 휠로 줌, 빈 공간 드래그로 이동 가능합니다.
                </div>
                <div className="flex-1 overflow-auto">
                  {questionLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-20">
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-64 h-64 object-contain"
                      >
                        <source src="/loading.mp4" type="video/mp4" />
                      </video>
                      <p className="text-[#8b6355] text-lg font-semibold animate-pulse">
                        검색 중입니다...
                      </p>
                    </div>
                  ) : (
                    <KeywordGraph
                      query={selectedSearch?.query ?? ''}
                      nodes={displayNodes}
                      matchedNodeIds={matchedNodeIds}
                      onlyMatches={onlyMatches}
                      onNodeSelect={(n) => {
                        setSelectedNode(n)
                        setShowOriginal(false)
                      }}
                    />
                  )}
                </div>
              </div>

              <div
                className="border rounded-xl overflow-hidden p-4 flex flex-col"
                style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
              >
                <h3 className=" font-semibold text-[#e89580] mb-3">AI 답변</h3>

                {questionLoading && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFB6A3]"></div>
                      <p className="text-[#8b6355] text-sm">답변 생성 중...</p>
                    </div>
                  </div>
                )}

                {questionError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
                    <p className="text-red-600 text-sm">{questionError}</p>
                  </div>
                )}

                {questionAnswer && !questionLoading && (
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="p-4 rounded-lg bg-white border border-[#FFDAB9]/50">
                      <p className="text-[#8b6355] text-sm leading-relaxed whitespace-pre-wrap">
                        {questionAnswer.reasoningPath.summary}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#8b6355]/70">
                        <span className="material-symbols-outlined text-sm">insights</span>
                        <span>신뢰도: {(questionAnswer.confidence * 100).toFixed(0)}%</span>
                      </div> 
                      {questionAnswer.reasoningPath.records && questionAnswer.reasoningPath.records.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-[#8b6355]/70">
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span>참조 일기: {questionAnswer.reasoningPath.records.length}개</span>
                        </div>
                      )}

                      {questionAnswer.reasoningPath.graph_snapshot && (
                        <div className="flex items-center gap-2 text-xs text-[#8b6355]/70">
                          <span className="material-symbols-outlined text-sm">account_tree</span>
                          <span>
                            그래프 노드: {questionAnswer.reasoningPath.graph_snapshot.node_count}개,
                            간선: {questionAnswer.reasoningPath.graph_snapshot.edge_count}개
                          </span>
                        </div>
                      )}
                    </div> 
                  </div>
                )}

                {!questionAnswer && !questionLoading && !questionError && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[#8b6355]/50 text-sm text-center">
                      검색어를 입력하면<br />AI가 답변을 생성합니다
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t" style={{ borderColor: '#FFDAB9' }}> 
                  <GraphDetailPanel
                    node={selectedNode}
                    onViewOriginal={() => setShowOriginal(true)}
                  />
                </div>
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
      </div>
    </div>
  )
}
