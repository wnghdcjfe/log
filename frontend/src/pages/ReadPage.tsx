import { useState, useMemo } from 'react'
import { useDiariesContext } from '@/context/DiariesContext'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { RecordNode } from '@/data/mockData'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface DiaryItem {
  id: string
  date: string
  title: string
  content: string
  emotion?: string
}

function toDiaryItems(nodes: RecordNode[]): DiaryItem[] {
  return nodes
    .filter((n) => !n.isExpanded)
    .map((n) => ({
      id: n.id,
      date: n.timestamp.split('T')[0],
      title: n.label,
      content: n.originalText,
      emotion: n.emotion,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function ReadPage() {
  const { nodes, loading } = useDiariesContext()
  const allDiaries = useMemo(() => toDiaryItems(nodes), [nodes])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredDiaries = useMemo(() => {
    if (!searchKeyword.trim()) return allDiaries
    const q = searchKeyword.toLowerCase()
    return allDiaries.filter(
      (d) =>
        (d.emotion?.toLowerCase().includes(q)) ||
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    )
  }, [allDiaries, searchKeyword])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[#8b6355]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto p-6">
      <div
        className="mb-6 rounded-xl p-4"
        style={{ backgroundColor: 'rgba(255, 218, 185, 0.3)', border: '1px solid #FFDAB9' }}
      >
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="제목, 내용, 감정으로 검색..."
          className="w-full py-2.5 px-4 rounded-lg border text-[#8b6355] placeholder:opacity-50"
          style={{ backgroundColor: '#FFF9F5', borderColor: '#FFDAB9' }}
        />
      </div>

      <div className="space-y-4">
        {filteredDiaries.length === 0 ? (
          <div className="text-center py-16 text-[#8b6355]/70">일기가 없습니다.</div>
        ) : (
          filteredDiaries.map((d) => {
            const isExpanded = expandedId === d.id
            const excerpt = d.content.length > 120 ? d.content.slice(0, 120) + '...' : d.content

            return (
              <article
                key={d.id}
                className="rounded-xl overflow-hidden transition-all"
                style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <time
                          className="text-sm  text-[#e89580]"
                        >
                          {format(parseISO(d.date), 'yyyy년 M월 d일', { locale: ko })}
                        </time>
                        {d.emotion && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(255, 182, 163, 0.4)', color: '#8b6355' }}
                          >
                            {d.emotion}
                          </span>
                        )}
                      </div>
                      <h3 className=" font-bold text-[#8b6355] truncate">{d.title}</h3>
                      <p
                        className={`mt-2 text-sm text-[#8b6355]/80 leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {isExpanded ? d.content : excerpt}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded-lg transition-colors"
                      style={{ color: '#8b6355' }}
                      aria-label={isExpanded ? '접기' : '펼치기'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
