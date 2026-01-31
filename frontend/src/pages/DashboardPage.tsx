import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDiariesContext } from '@/context/DiariesContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import type { RecordNode } from '@/data/mockData'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DiaryItem {
  id: string
  date: string
  title: string
  content: string
  keywords: string[]
}

function toDiaryItems(nodes: RecordNode[]): DiaryItem[] {
  return nodes
    .filter((n) => !n.isExpanded)
    .map((n) => ({
      id: n.id,
      date: n.timestamp.split('T')[0],
      title: n.label,
      content: n.originalText.slice(0, 120) + (n.originalText.length > 120 ? '...' : ''),
      keywords: [
        ...(n.emotion ? [n.emotion] : []),
        ...(n.people ?? []),
      ],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function DashboardPage() {
  const { nodes, loading } = useDiariesContext()
  const allDiaries = useMemo(() => toDiaryItems(nodes), [nodes])
  const [searchKeyword, setSearchKeyword] = useState('')

  const filteredDiaries = useMemo(() => {
    if (!searchKeyword.trim()) return allDiaries
    const q = searchKeyword.toLowerCase()
    return allDiaries.filter(
      (d) =>
        d.keywords.some((k) => k.includes(q)) ||
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    )
  }, [allDiaries, searchKeyword])

  const monthCounts = useMemo(() => {
    const map: Record<string, number> = {}
    filteredDiaries.forEach((d) => {
      const m = d.date.slice(0, 7)
      map[m] = (map[m] ?? 0) + 1
    })
    const sorted = Object.keys(map).sort()
    const years = new Set(sorted.map((x) => x.slice(0, 4)))
    const showYear = years.size > 1
    return {
      labels: sorted.map((m) => {
        const [y, mm] = m.split('-')
        return showYear ? `${y}년 ${parseInt(mm, 10)}월` : `${parseInt(mm, 10)}월`
      }),
      data: sorted.map((m) => map[m]),
    }
  }, [filteredDiaries])

  const emotionCounts = useMemo(() => {
    const map: Record<string, number> = {}
    filteredDiaries.forEach((d) => {
      d.keywords.forEach((k) => {
        if (['번아웃', '후회', '분노', '슬픔', '피로', '기쁨', '불안', '체념'].includes(k)) {
          map[k] = (map[k] ?? 0) + 1
        }
      })
    })
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map((e) => e[0]),
      data: entries.map((e) => e[1]),
    }
  }, [filteredDiaries])

  const monthSpan = useMemo(() => {
    if (filteredDiaries.length === 0) return 0
    const months = new Set(filteredDiaries.map((d) => d.date.slice(0, 7)))
    return months.size
  }, [filteredDiaries])

  const frequencyData = {
    labels: monthCounts.labels.length ? monthCounts.labels : ['1월'],
    datasets: [
      {
        label: '일기 작성 수',
        data: monthCounts.data.length ? monthCounts.data : [0],
        borderColor: '#FFB6A3',
        backgroundColor: 'rgba(255, 182, 163, 0.2)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFB6A3',
        pointBorderColor: '#FFF9F5',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  }

  const emotionData = {
    labels: emotionCounts.labels.length ? emotionCounts.labels : ['데이터 없음'],
    datasets: [
      {
        data: emotionCounts.data.length ? emotionCounts.data : [1],
        backgroundColor: [
          '#FFB6A3',
          '#FFDAB9',
          '#e89580',
          '#d4a574',
          '#8b6355',
          '#c9a88e',
          '#b8956e',
          '#9c7b5e',
        ],
        borderWidth: 0,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(139, 99, 85, 0.15)' },
        ticks: { color: '#8b6355' },
      },
      x: {
        grid: { color: 'rgba(139, 99, 85, 0.15)' },
        ticks: { color: '#8b6355' },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#8b6355', padding: 15, font: { size: 12 } },
      },
    },
  }

  const keywords = ['퇴사', '태움', '번아웃', '분노', '슬픔', '피로', '직장']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #FFF9F5 100%)' }}>
        <p className="text-[#8b6355]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen font-sans relative overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #fdfbfb 0%, #FFF9F5 50%, #ebedee 100%)', color: '#8b6355' }}
    >
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 218, 185, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 182, 163, 0.2) 0%, transparent 50%)
          `,
        }}
      />
      <div className="relative z-10 max-w-[1400px] mx-auto px-5 py-10">
        <header className="text-center mb-14">
          <Link
            to="/"
            className="text-[#8b6355] text-sm hover:text-[#e89580] transition-colors mb-4 inline-block"
          >
            ← 그래프 탐색으로 돌아가기
          </Link>
          <h1
            className="font-serif text-5xl font-light tracking-wide mb-3"
            style={{
              background: 'linear-gradient(135deg, #FFDAB9, #FFB6A3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            일기 타임라인
          </h1>
          <p className="text-[#8b6355]/70 text-sm tracking-[0.15em] uppercase font-light">
            Diary Timeline Explorer
          </p>
        </header>

        <section
          className="rounded-[20px] p-10 mb-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
          style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
        >
          <div className="mb-8">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="키워드로 일기 검색하기... (예: 퇴사, 태움, 번아웃)"
              className="w-full py-4 px-6 rounded-xl text-lg transition-all placeholder:opacity-60"
              style={{
                backgroundColor: '#FFF9F5',
                border: '2px solid #FFDAB9',
                color: '#8b6355',
              }}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {keywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => setSearchKeyword(kw)}
                  className="py-2 px-4 rounded-full text-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(255, 182, 163, 0.3)',
                    border: '1px solid #FFDAB9',
                    color: '#8b6355',
                  }}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-10">
          {[
            [allDiaries.length, '전체 일기'],
            [filteredDiaries.length, '검색 결과'],
            [Math.min(filteredDiaries.length, 6), '주요 이벤트'],
            [monthSpan, '개월'],
          ].map(([val, label]) => (
            <div
              key={label}
              className="p-6 rounded-2xl text-center hover:-translate-y-1 transition-all"
              style={{
                background: 'linear-gradient(135deg, #FFF9F5 0%, #FFDAB9 100%)',
                border: '1px solid #FFDAB9',
                boxShadow: '0 10px 30px rgba(255, 182, 163, 0.2)',
              }}
            >
              <div className="font-serif text-4xl font-bold text-[#e89580] mb-1">{val}</div>
              <div className="text-[#8b6355] text-xs uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div
            className="rounded-[20px] p-8 hover:-translate-y-1 transition-all"
            style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}
          >
            <h3 className="font-serif text-2xl mb-5 text-[#e89580] font-normal">
              월별 일기 작성 빈도
            </h3>
            <div className="h-[240px]">
              <Line data={frequencyData} options={chartOptions} />
            </div>
          </div>
          <div
            className="rounded-[20px] p-8 hover:-translate-y-1 transition-all"
            style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}
          >
            <h3 className="font-serif text-2xl mb-5 text-[#e89580] font-normal">
              감정 분포
            </h3>
            <div className="h-[240px]">
              <Doughnut data={emotionData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        <section
          className="rounded-[20px] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
          style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
        >
          <h3 className="font-serif text-2xl text-[#e89580] font-normal mb-8">
            주요 일기 타임라인
          </h3>
          <div className="relative py-8 min-h-[200px]">
            <div
              className="absolute left-5 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 z-0"
              style={{
                background: 'linear-gradient(180deg, #FFDAB9, #FFB6A3)',
              }}
            />
            {filteredDiaries.length === 0 ? (
              <div className="text-center py-16 text-[#8b6355]">검색 결과가 없습니다.</div>
            ) : (
              filteredDiaries.map((diary, idx) => (
                <div
                  key={diary.id}
                  className={`relative mb-12 pl-10 md:pl-0 text-left z-[1] ${
                    idx % 2 === 0
                      ? 'md:pr-[50%] md:text-right'
                      : 'md:pl-[50%] md:text-left'
                  }`}
                >
                  <div
                    className="absolute left-5 md:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[3px] border-[#FFF9F5] shadow-[0_0_20px_rgba(255,182,163,0.5)] z-[2] shrink-0"
                    style={{ backgroundColor: '#FFB6A3' }}
                  />
                  <div
                    className="p-6 rounded-xl relative hover:scale-[1.02] transition-all cursor-pointer"
                    style={{
                      backgroundColor: '#FFF9F5',
                      border: '1px solid #FFDAB9',
                      boxShadow: '0 8px 24px rgba(255, 182, 163, 0.15)',
                    }}
                  >
                    <div className="font-serif text-xl text-[#e89580] font-semibold mb-2">
                      {format(parseISO(diary.date), 'yyyy년 M월 d일', { locale: ko })}
                    </div>
                    <div className="text-lg font-medium mb-2 text-[#8b6355]">{diary.title}</div>
                    <div className="text-[#8b6355]/80 leading-relaxed">{diary.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
