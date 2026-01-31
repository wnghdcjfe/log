import { useState, useMemo } from 'react'
import { useDiariesContext } from '@/context/DiariesContext'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { RecordNode } from '@/data/mockData'
import { ChevronDown, ChevronUp, Pencil, Trash2, Copy, Check } from 'lucide-react'
import { updateDiary, deleteDiary } from '@/api/diaries'

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
  const { nodes, loading, refetch } = useDiariesContext()
  const allDiaries = useMemo(() => toDiaryItems(nodes), [nodes])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFeel, setEditFeel] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  const startEdit = (d: DiaryItem) => {
    setEditingId(d.id)
    setEditTitle(d.title)
    setEditContent(d.content)
    setEditFeel(d.emotion ?? '')
    setEditDate(d.date)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
    setEditFeel('')
    setEditDate('')
    setError(null)
  }

  const handleUpdate = async () => {
    if (!editingId) return
    setSaving(true)
    setError(null)
    try {
      await updateDiary(editingId, {
        title: editTitle.trim(),
        content: editContent.trim(),
        feel: editFeel.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean),
        date: editDate,
      })
      refetch()
      cancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제할까요?')) return
    try {
      await deleteDiary(id)
      refetch()
      setExpandedId((prev) => (prev === id ? null : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const handleCopy = async (d: DiaryItem) => {
    const dateFormatted = format(parseISO(d.date), 'yyyy년 M월 d일', { locale: ko })
    const emotionTag = d.emotion ? ` [${d.emotion}]` : ''
    const textToCopy = `${dateFormatted}${emotionTag}\n\n${d.title}\n\n${d.content}`

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedId(d.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      alert('복사에 실패했습니다.')
    }
  }

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
            const isEditing = editingId === d.id
            const excerpt = d.content.length > 120 ? d.content.slice(0, 120) + '...' : d.content

            if (isEditing) {
              return (
                <article
                  key={d.id}
                  className="rounded-xl overflow-hidden p-5 transition-all"
                  style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
                >
                  <div className="space-y-3">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="제목"
                      className="w-full py-2 px-3 rounded-lg border text-[#8b6355]"
                      style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
                    />
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="py-2 px-3 rounded-lg border text-[#8b6355]"
                      style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="내용"
                      rows={6}
                      className="w-full py-2 px-3 rounded-lg border text-[#8b6355] resize-y"
                      style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
                    />
                    <input
                      value={editFeel}
                      onChange={(e) => setEditFeel(e.target.value)}
                      placeholder="감정/태그 (쉼표 구분)"
                      className="w-full py-2 px-3 rounded-lg border text-[#8b6355]"
                      style={{ borderColor: '#FFDAB9', backgroundColor: '#FFF9F5' }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-2 rounded-lg border text-[#8b6355] text-sm"
                        style={{ borderColor: '#FFDAB9' }}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={saving || !editTitle.trim() || !editContent.trim()}
                        className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50"
                        style={{ backgroundColor: '#FFB6A3' }}
                      >
                        {saving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            }

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
                        <time className="text-sm text-[#e89580]">
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
                      <h3 className="font-bold text-[#8b6355] truncate">{d.title}</h3>
                      <p
                        className={`mt-2 text-sm text-[#8b6355]/80 leading-relaxed whitespace-pre-wrap ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {isExpanded ? d.content : excerpt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleCopy(d)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[#FFDAB9]/50"
                        style={{ color: copiedId === d.id ? '#22c55e' : '#8b6355' }}
                        aria-label="복사"
                        title="일기 복사"
                      >
                        {copiedId === d.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button> 
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-100"
                        style={{ color: '#8b6355' }}
                        aria-label="삭제"
                        title="일기 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded-lg transition-colors"
                        style={{ color: '#8b6355' }}
                        aria-label={isExpanded ? '접기' : '펼치기'}
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
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
