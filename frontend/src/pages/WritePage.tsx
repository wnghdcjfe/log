import { useState, useMemo, useEffect, useRef } from 'react'
import { DiaryEditor } from '../components/DiaryEditor'
import { createDiary } from '../api/diaries'
import { useDiariesContext } from '../context/DiariesContext'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns'
import { ko } from 'date-fns/locale'

const MOODS = [
  { id: 'radiant', label: '기쁨', icon: 'sentiment_very_satisfied' },
  { id: 'calm', label: '평온', icon: 'sentiment_satisfied' },
  { id: 'neutral', label: '보통', icon: 'sentiment_neutral' },
  { id: 'tired', label: '피곤', icon: 'sentiment_dissatisfied' },
  { id: 'sad', label: '슬픔', icon: 'mood_bad' },
] as const

const REFLECTIVE_PROMPTS = [
  '오늘 예상치 못하게 미소 지었던 순간은?',
  '오늘 하루 가장 감사했던 것은?',
  '내일의 나에게 한마디 한다면?',
  '오늘 느꼈던 감정을 한 단어로 표현한다면?',
]

export function WritePage() {
  const { refetch } = useDiariesContext()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [feel, setFeel] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const prompt = useMemo(
    () => REFLECTIVE_PROMPTS[Math.floor(Math.random() * REFLECTIVE_PROMPTS.length)],
    []
  )

  const isMountedRef = useRef(true)
  const savedTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current)
        savedTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const d = new Date(date)
    if (isNaN(d.getTime())) return
    setCalendarMonth((prev) => {
      if (d.getMonth() !== prev.getMonth() || d.getFullYear() !== prev.getFullYear()) return d
      return prev
    })
  }, [date])

  const handleEditorChange = (_html: string, plainText: string) => {
    setContent(plainText)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    if (saving) return

    const feelList = feel
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    setSaving(true)
    setSaveError(null)

    try {
      await createDiary({
        title: title.trim(),
        content: content.trim(),
        feel: feelList,
        date,
      })

      if (!isMountedRef.current) return

      setSaved(true)
      setTitle('')
      setContent('')
      setFeel('')
      setSelectedMood(null)
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setEditorKey((k) => k + 1)
      refetch()

      if (savedTimeoutRef.current !== null) window.clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = window.setTimeout(() => {
        if (!isMountedRef.current) return
        setSaved(false)
      }, 2500)
    } catch (err) {
      if (!isMountedRef.current) return
      setSaveError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      if (!isMountedRef.current) return
      setSaving(false)
    }
  }

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const paddingStart = monthStart.getDay()
  const paddingEnd = 42 - paddingStart - days.length

  const canSubmit = !!title.trim() && !!content.trim() && !saving

  return (
    <div className="min-h-full bg-[#FAF9F6] text-slate-800">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">오늘 하루 어땠어?</h1>
          <p className="text-slate-500 mt-1 font-light">지금 떠오르는 생각을 편하게 적어보세요.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            form="write-form"
            disabled={!canSubmit}
            className="bg-[#FFB3A7] hover:opacity-90 text-white px-8 py-2.5 rounded-full font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 10px 40px rgba(255, 179, 167, 0.25)' }}
          >
            {saving ? '저장 중...' : saved ? '저장됨!' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        <form id="write-form" onSubmit={handleSubmit}>
          {/* Title + Date (open canvas style) */}
          <section className="flex flex-col md:flex-row md:items-end gap-8 py-2">
            <div className="flex-grow">
              <label className="block text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
                Title
              </label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="오늘 하루는 어땠나요?"
                className="w-full bg-transparent text-4xl font-semibold placeholder-slate-300 border-none p-0 focus:ring-0"
              />
              {/* subtle underline */}
              <div className="mt-3 h-px bg-slate-200/70" />
            </div>

            <div className="w-full md:w-64">
              <label className="block text-xs uppercase tracking-widest text-slate-400 font-medium mb-3">
                Date
              </label>

              {/* keep native date input but styled like text row */}
              <div className="flex items-center gap-2 text-xl font-light text-slate-600 hover:text-[#FFB3A7] transition-colors group"> 
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-none p-0 focus:ring-0 w-full cursor-pointer text-slate-600"
                />
              </div>

              <div className="mt-3 h-px bg-slate-200/70" />
            </div>
          </section>

          {/* Mood */}
          <section className=""> 

            <div className="flex flex-wrap gap-4">
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMoodSelect(m.id)}
                    className={[
                      'flex items-center gap-2 px-5 py-2 rounded-full border transition-all',
                      isSelected
                        ? 'bg-[#FFB3A7] text-white border-[#FFB3A7]'
                        : 'border-slate-200 text-slate-600 hover:border-[#FFB3A7]',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-xl">{m.icon}</span>
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                )
              })}
            </div>

            {/* optional prompt line */}
            <div className="mt-8 flex justify-center">
            <div className="text-center"> 
              <p className="text-base text-slate-800 font-medium leading-relaxed">
                “{prompt}”
              </p>
            </div>
          </div>

          </section> 
          <section className="mt-12">  
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
              <DiaryEditor
                key={editorKey}
                onChange={handleEditorChange}
                placeholder=""
                minHeight="520px"
                contentBgColor="#ffffff"
                contentTextColor="#1f2937"
              />
            </div> 
          </section>
        </form>
      </main>
    </div>
  )
}
