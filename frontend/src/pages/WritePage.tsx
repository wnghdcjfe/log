import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DiaryEditor } from '../components/DiaryEditor'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'

const MOODS = [
  { id: 'radiant', label: '기쁨', icon: 'sentiment_very_satisfied' },
  { id: 'calm', label: '평온', icon: 'sentiment_satisfied' },
  { id: 'neutral', label: '보통', icon: 'sentiment_neutral' },
  { id: 'tired', label: '피곤', icon: 'sentiment_dissatisfied' },
  { id: 'sad', label: '슬픔', icon: 'mood_bad' },
] as const

const SUGGESTED_TAGS = ['번아웃', '피로', '기쁨', '후회', '감사', '직장', '가족', '휴식']

const REFLECTIVE_PROMPTS = [
  '오늘 예상치 못하게 미소 지었던 순간은?',
  '오늘 하루 가장 감사했던 것은?',
  '내일의 나에게 한마디 한다면?',
  '오늘 느꼈던 감정을 한 단어로 표현한다면?',
]

export function WritePage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [feel, setFeel] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [saved, setSaved] = useState(false)

  const prompt = useMemo(() => REFLECTIVE_PROMPTS[Math.floor(Math.random() * REFLECTIVE_PROMPTS.length)], [])

  useEffect(() => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return
    setCalendarMonth((prev) => {
      if (d.getMonth() !== prev.getMonth() || d.getFullYear() !== prev.getFullYear()) {
        return d
      }
      return prev
    })
  }, [date])

  const handleEditorChange = (html: string, plainText: string) => {
    setContent(plainText)
    setContentHtml(html)
  }

  const addTag = (tag: string) => {
    const current = feel.split(/[,，\s]+/).filter(Boolean)
    if (current.includes(tag)) return
    setFeel([...current, tag].join(', '))
  }

  const handleMoodSelect = (moodId: string) => {
    const moodLabel = MOODS.find((m) => m.id === moodId)?.label ?? moodId
    const current = feel.split(/[,，\s]+/).filter(Boolean)
    const isDeselecting = selectedMood === moodId
    if (isDeselecting) {
      setSelectedMood(null)
      setFeel(current.filter((t) => t !== moodLabel).join(', '))
    } else {
      setSelectedMood(moodId)
      setFeel([...current.filter((t) => !MOODS.some((m) => m.label === t)), moodLabel].join(', '))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    const diary = {
      title: title.trim(),
      content: content.trim(),
      contentHtml: contentHtml || content.trim(),
      feel: feel
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      date,
    }

    try {
      const list = JSON.parse(localStorage.getItem('outbrain-drafts') ?? '[]')
      list.unshift({ ...diary, id: `draft-${Date.now()}` })
      localStorage.setItem('outbrain-drafts', JSON.stringify(list.slice(0, 50)))
      setSaved(true)
      setTitle('')
      setContent('')
      setContentHtml('')
      setFeel('')
      setSelectedMood(null)
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setEditorKey((k) => k + 1)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const paddingStart = monthStart.getDay()
  const paddingEnd = 42 - paddingStart - days.length

  return (
    <div className="flex flex-col min-h-full bg-[#FFF9F5]">
      <main className="flex-1 flex justify-center py-10 px-4">
        <div className="flex flex-col max-w-[1024px] w-full flex-1">
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between items-end gap-4 p-4 mb-6">
            <div className="flex min-w-72 flex-col gap-2">
              <h1 className="text-[#181210] text-3xl md:text-4xl font-black leading-tight tracking-tight ">
                새 일기 쓰기
              </h1>
              <p className="text-[#8d675e] text-base font-normal">생각을 페이지에 흘려보내세요.</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/read"
                className="flex h-12 items-center justify-center rounded-xl border border-[#e7ddda] bg-transparent px-6 text-[#181210] font-bold text-sm hover:bg-white/50 transition-all"
              >
                취소
              </Link>
              <button
                type="submit"
                form="write-form"
                disabled={!title.trim() || !content.trim()}
                className="flex h-12 items-center justify-center rounded-xl bg-[#ffb6a3] px-10 text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition-all"
                style={{ boxShadow: '0 10px 40px rgba(255, 182, 163, 0.3)' }}
              >
                {saved ? '저장됨!' : '저장'}
              </button>
            </div>
          </div>

          <form id="write-form" onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 px-4">
            {/* Main Editor Area */}
            <div className="flex-1 space-y-8">
              {/* Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex flex-col flex-1">
                  <p className="text-[#181210] text-base font-semibold pb-2">제목</p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="오늘 하루는 어땠나요?"
                    className="w-full rounded-xl text-[#181210] focus:outline-0 focus:ring-2 focus:ring-[#ffb6a3]/50 border border-[#e7ddda] bg-white h-14 placeholder:text-[#8d675e] p-4 text-base"
                  />
                </label>
                <label className="flex flex-col flex-1">
                  <p className="text-[#181210] text-base font-semibold pb-2">날짜</p>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl text-[#181210] border border-[#e7ddda] bg-white h-14 p-4 text-base appearance-none cursor-pointer"
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#8d675e] pointer-events-none">
                      calendar_today
                    </span>
                  </div>
                </label>
              </div>

              {/* Mood Selector */}
              <div className="flex flex-col gap-3">
                <p className="text-[#181210] text-base font-semibold">오늘 기분은?</p>
                <div className="flex flex-wrap gap-4">
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMoodSelect(m.id)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className={`size-14 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                            isSelected
                              ? 'bg-[#ffb6a3] border-[#ffb6a3] text-white'
                              : 'bg-white border-[#e7ddda] text-[#8d675e] group-hover:border-[#ffb6a3] group-hover:text-[#ffb6a3]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-3xl">{m.icon}</span>
                        </div>
                        <span className="text-xs font-medium text-[#8d675e]">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex flex-col gap-2">
                <p className="text-[#181210] text-base font-semibold pb-2">내 이야기</p>
                <div
                  className="rounded-2xl border border-[#e7ddda] bg-white overflow-hidden shadow-sm min-h-[400px]"
                  style={{ minHeight: 400 }}
                >
                  <DiaryEditor
                    key={editorKey}
                    onChange={handleEditorChange}
                    placeholder="오늘 하루 어땠나요?"
                    minHeight="380px"
                    contentBgColor="#ffffff"
                    contentTextColor="#181210"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 space-y-6 shrink-0">
              {/* Calendar Widget */}
              <div className="rounded-2xl bg-white border border-[#e7ddda] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                    className="text-[#ffb6a3] hover:bg-[#ffb6a3]/10 p-1 rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <p className="text-[#181210] font-bold text-sm">
                    {format(calendarMonth, 'yyyy년 M월', { locale: ko })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                    className="text-[#ffb6a3] hover:bg-[#ffb6a3]/10 p-1 rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                    <span key={d} className="text-[10px] font-bold text-[#8d675e]">
                      {d}
                    </span>
                  ))}
                  {Array.from({ length: paddingStart }).map((_, i) => (
                    <div key={`p-${i}`} className="h-8" />
                  ))}
                  {days.map((d) => {
                    const isSelected = date === format(d, 'yyyy-MM-dd')
                    const isCurMonth = isSameMonth(d, calendarMonth)
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => setDate(format(d, 'yyyy-MM-dd'))}
                        className={`h-8 flex items-center justify-center text-xs rounded-full transition-colors ${
                          !isCurMonth ? 'text-[#8d675e]/40' : ''
                        } ${isSelected ? 'bg-[#ffb6a3] text-white font-bold' : 'hover:bg-[#ffb6a3]/20'} ${
                          isToday(d) && !isSelected ? 'ring-1 ring-[#ffb6a3]' : ''
                        }`}
                      >
                        {format(d, 'd')}
                      </button>
                    )
                  })}
                  {Array.from({ length: paddingEnd }).map((_, i) => (
                    <div key={`e-${i}`} className="h-8" />
                  ))}
                </div>
              </div>

              {/* Suggested Tags */}
              <div className="rounded-2xl bg-white border border-[#e7ddda] p-5 shadow-sm">
                <h4 className="text-[#181210] text-sm font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffb6a3] text-lg">auto_awesome</span>
                  추천 태그
                </h4>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="px-3 py-1 bg-[#ffb6a3]/10 text-[#ffb6a3] border border-[#ffb6a3]/20 rounded-full text-xs font-medium hover:bg-[#ffb6a3]/20 transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                  {feel && (
                    <div className="w-full mt-2 pt-2 border-t border-[#e7ddda]">
                      <p className="text-[10px] text-[#8d675e] mb-1">선택됨</p>
                      <p className="text-xs text-[#181210] break-words">{feel}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reflective Prompt */}
              <div className="rounded-2xl bg-[#ffb6a3]/5 border border-[#ffb6a3]/10 p-5">
                <h4 className="text-[#ffb6a3] text-sm font-bold mb-2">생각 나누기</h4>
                <p className="text-[#8d675e] text-xs italic leading-relaxed">&quot;{prompt}&quot;</p>
              </div>
            </aside>
          </form>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center border-t border-[#e7ddda]">
        <p className="text-[#8d675e] text-xs font-medium">
          기록은 로컬에 안전하게 보관됩니다. © OUTBRAIN
        </p>
      </footer>
    </div>
  )
}
