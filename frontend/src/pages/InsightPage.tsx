import { useState, useMemo } from 'react'
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
import { format, parseISO, subWeeks, startOfWeek, eachDayOfInterval, getDay } from 'date-fns'
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
  fullContent: string
  keywords: string[]
}

const STOP_WORDS = new Set([
  '그', '이', '저', '것', '수', '등', '및', '또', '또는', '있다', '없다',
  '하다', '되다', '이다', '안', '못', '더', '가장', '너무', '매우',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
])

const HEATMAP_COLORS = ['#FFF9F5', '#FFDAB9', '#FFB6A3', '#F4A460'] as const

function toDiaryItems(nodes: RecordNode[]): DiaryItem[] {
  return nodes
    .filter((n) => !n.isExpanded)
    .map((n) => ({
      id: n.id,
      date: n.timestamp.split('T')[0],
      title: n.label,
      content: n.originalText.slice(0, 120) + (n.originalText.length > 120 ? '...' : ''),
      fullContent: n.originalText,
      keywords: [
        ...(n.emotion ? [n.emotion] : []),
        ...(n.people ?? []),
      ],
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

function extractWordCounts(diaries: { title: string; content: string }[]): { word: string; count: number }[] {
  const counts: Record<string, number> = {}
  const regex = /[가-힣a-zA-Z]{2,}/g

  diaries.forEach((d) => {
    const text = `${d.title} ${d.content}`
    const matches = text.match(regex) ?? []
    matches.forEach((w) => {
      const lower = w.toLowerCase()
      if (!STOP_WORDS.has(lower)) {
        counts[lower] = (counts[lower] ?? 0) + 1
      }
    })
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([word, count]) => ({ word, count }))
}

function getHeatmapData(dates: string[]): { weekIndex: number; dayOfWeek: number; count: number }[][] {
  const now = new Date()
  const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11)
  const weeks = 12
  const days = 7

  const grid: number[][] = Array.from({ length: days }, () => Array(weeks).fill(0))
  const dateCounts: Record<string, number> = {}
  dates.forEach((d) => {
    dateCounts[d] = (dateCounts[d] ?? 0) + 1
  })

  for (let w = 0; w < weeks; w++) {
    const weekStart = subWeeks(start, -(weeks - 1 - w))
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    })
    weekDays.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd')
      const count = dateCounts[key] ?? 0
      const dow = (getDay(d) + 6) % 7
      grid[dow][w] = count
    })
  }

  return grid.map((row, dayOfWeek) =>
    row.map((count, weekIndex) => ({ weekIndex, dayOfWeek, count }))
  )
}

function getMaxHeatmapCount(grid: { count: number }[][]): number {
  let max = 0
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (cell.count > max) max = cell.count
    })
  )
  return Math.max(max, 1)
}

export function InsightPage() {
  const { nodes, loading } = useDiariesContext()
  const allDiaries = useMemo(() => toDiaryItems(nodes), [nodes])
  const [searchKeyword, _setSearchKeyword] = useState('')
  const [period, setPeriod] = useState<'7' | '30'>('7')
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)

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

  const fullDiariesForWords = useMemo(
    () =>
      nodes
        .filter((n) => !n.isExpanded)
        .map((n) => ({ title: n.label, content: n.originalText })),
    [nodes]
  )

  const wordCounts = useMemo(
    () => extractWordCounts(fullDiariesForWords),
    [fullDiariesForWords]
  )

  const streak = useMemo(() => {
    const dates = new Set(allDiaries.map((d) => d.date).sort().reverse())
    let s = 0
    const today = format(new Date(), 'yyyy-MM-dd')
    let d = today
    while (dates.has(d)) {
      s++
      const next = new Date(d)
      next.setDate(next.getDate() - 1)
      d = format(next, 'yyyy-MM-dd')
    }
    return s
  }, [allDiaries])

  const topEmotion = useMemo(() => {
    const map: Record<string, number> = {}
    allDiaries.forEach((d) => {
      d.keywords.forEach((k) => {
        map[k] = (map[k] ?? 0) + 1
      })
    })
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    return entries[0]?.[0] ?? '-'
  }, [allDiaries])

  const heatmapGrid = useMemo(
    () => getHeatmapData(allDiaries.map((d) => d.date)),
    [allDiaries]
  )
  const maxHeat = useMemo(() => getMaxHeatmapCount(heatmapGrid), [heatmapGrid])

  const weekLabels = useMemo(() => {
    const labels: string[] = []
    const start = startOfWeek(new Date(), { weekStartsOn: 1 })
    for (let i = 11; i >= 0; i--) {
      const d = subWeeks(start, i)
      labels.push(format(d, 'M/d'))
    }
    return labels
  }, [])

  const monthCounts = useMemo(() => {
    const map: Record<string, number> = {}
    const days = period === '7' ? 7 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = format(cutoff, 'yyyy-MM-dd')
    filteredDiaries
      .filter((d) => d.date >= cutoffStr)
      .forEach((d) => {
        map[d.date] = (map[d.date] ?? 0) + 1
      })
    const sorted = Object.keys(map).sort()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return {
      labels: sorted.map((d) => {
        const day = new Date(d + 'T12:00:00').getDay()
        return dayNames[day]
      }),
      data: sorted.map((m) => map[m]),
    }
  }, [filteredDiaries, period])

  const emotionCounts = useMemo(() => {
    const map: Record<string, number> = {}
    filteredDiaries.forEach((d) => {
      d.keywords.forEach((k) => {
        if (['번아웃', '후회', '분노', '슬픔', '피로', '기쁨', '불안', '체념', '공포', '무력감', '절망'].includes(k)) {
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

  const oldestDate = useMemo(() => {
    if (allDiaries.length === 0) return null
    return allDiaries[allDiaries.length - 1]?.date
  }, [allDiaries])

  const frequencyData = {
    labels: monthCounts.labels.length ? monthCounts.labels : ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [
      {
        label: '일기 작성 수',
        data: monthCounts.data.length ? monthCounts.data : [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#FFB6A3',
        backgroundColor: 'rgba(255, 218, 185, 0.4)',
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
        backgroundColor: ['#FFB6A3', '#FFDAB9', '#F4A460', '#e89580', '#d4a574', '#8b6355'],
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
        grid: { color: 'rgba(139, 99, 85, 0.1)' },
        ticks: { color: '#64748b' },
      },
      x: {
        grid: { color: 'rgba(139, 99, 85, 0.1)' },
        ticks: { color: '#64748b' },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#64748b', padding: 12, font: { size: 11 } },
      },
    },
  }

  const getWordSize = (count: number, maxCount: number) => {
    if (maxCount <= 0) return 'text-lg'
    const r = count / maxCount
    if (r >= 0.8) return 'text-3xl md:text-4xl font-black'
    if (r >= 0.5) return 'text-2xl md:text-3xl font-extrabold'
    if (r >= 0.3) return 'text-xl md:text-2xl font-bold'
    if (r >= 0.15) return 'text-base md:text-lg font-semibold'
    return 'text-sm md:text-base font-medium'
  }

  const getWordColor = (i: number) => {
    const colors = ['#FFB6A3', '#F4A460', '#FFDAB9', '#64748b', '#94a3b8']
    return colors[i % colors.length]
  }

  const maxWordCount = wordCounts[0]?.count ?? 1

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF9F5]"> 
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 font-serif">
            일기를 들여보다.
          </h2>
          <p className="text-slate-500 text-sm">
            {oldestDate
              ? `${format(parseISO(oldestDate), 'yyyy년 M월', { locale: ko })}부터의 일기인사이트`
              : '일기 데이터를 불러오는 중...'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">전체 일기</p>
              <span className="material-symbols-outlined text-[#FFB6A3]">history_edu</span>
            </div>
            <p className="text-3xl font-bold font-serif text-slate-800">{allDiaries.length}</p>
            <p className="text-slate-400 text-[10px] mt-2 italic">
              {oldestDate ? `${format(parseISO(oldestDate), 'yyyy년 M월', { locale: ko })}부터 기록 중` : ''}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">연속 기록</p>
              <span className="material-symbols-outlined text-[#FFB6A3]">local_fire_department</span>
            </div>
            <p className="text-3xl font-bold font-serif text-slate-800">{streak}일</p>
            <p className="text-slate-400 text-[10px] mt-2 italic">오늘 포함 연속 기록일</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">주 감정</p>
              <span className="material-symbols-outlined text-[#FFB6A3]">mood</span>
            </div>
            <p className="text-3xl font-bold font-serif text-slate-800">{topEmotion}</p>
            <p className="text-slate-400 text-[10px] mt-2 italic">가장 많이 기록된 감정</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">주간/월간 기록 추이</h3>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as '7' | '30')}
                className="bg-[#FFF9F5] border border-[#FFDAB9] rounded-lg text-xs py-1.5 px-3 focus:ring-2 focus:ring-[#FFB6A3] text-slate-700"
              >
                <option value="7">최근 7일</option>
                <option value="30">최근 30일</option>
              </select>
            </div>
            <div className="flex-1 min-h-[250px]">
              <Line data={frequencyData} options={chartOptions} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">키워드 분석</h3>
            </div>
            <div className="flex flex-wrap gap-3 items-center justify-center flex-1 p-4 min-h-[250px]">
              {wordCounts.length === 0 ? (
                <p className="text-slate-400 text-sm">분석할 데이터가 없습니다.</p>
              ) : (
                wordCounts.map(({ word, count }, i) => (
                  <span
                    key={word}
                    className={`p-2 cursor-default ${getWordSize(count, maxWordCount)}`}
                    style={{ color: getWordColor(i) }}
                  >
                    {word}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-800">활동 강도</h3>
              <span
                className="material-symbols-outlined text-[#FFB6A3] text-sm cursor-help"
                title="일기 작성 빈도 (최근 12주)"
              >
                info
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-slate-500">
              <span>적음</span>
              <div className="flex gap-1">
                {HEATMAP_COLORS.map((c) => (
                  <div
                    key={c}
                    className="size-3 rounded-sm border border-[#FFDAB9]"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span>많음</span>
            </div>
          </div>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-1 min-w-[600px]">
              {heatmapGrid[0]?.map((_, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1">
                  {heatmapGrid.map((row, rowIdx) => {
                    const cell = row[colIdx]
                    const level = cell && maxHeat > 0 ? Math.min(Math.ceil((cell.count / maxHeat) * 4), 4) : 0
                    const bg = HEATMAP_COLORS[level] ?? HEATMAP_COLORS[0]
                    return (
                      <div
                        key={rowIdx}
                        className="size-3 rounded-sm border border-[#FFDAB9]/50"
                        style={{ backgroundColor: bg }}
                        title={`${cell?.count ?? 0}건`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1 text-[10px] text-slate-400 font-medium">
              {weekLabels.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
            <h3 className="font-bold text-lg text-slate-800 mb-6">감정 분포</h3>
            <div className="h-[220px]">
              <Doughnut data={emotionData} options={doughnutOptions} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
            <h3 className="font-bold text-lg text-slate-800 mb-6">월별 작성 빈도</h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {(() => {
                const byMonth: Record<string, number> = {}
                allDiaries.forEach((d) => {
                  const m = d.date.slice(0, 7)
                  byMonth[m] = (byMonth[m] ?? 0) + 1
                })
                const entries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
                const maxVal = Math.max(...entries.map((e) => e[1]), 1)
                return entries.length === 0 ? (
                  <p className="text-slate-400 text-sm">데이터 없음</p>
                ) : (
                  entries.map(([month, count]) => (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-sm text-slate-600 w-24">
                        {format(parseISO(month + '-01'), 'yyyy년 M월', { locale: ko })}
                      </span>
                      <div className="flex-1 h-6 bg-[#FFF9F5] rounded overflow-hidden">
                        <div
                          className="h-full rounded bg-[#FFB6A3] transition-all"
                          style={{ width: `${(count / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#F4A460] w-8">{count}</span>
                    </div>
                  ))
                )
              })()}
            </div>
          </div>
        </div>

        {/* Timeline Section - a.html design */}
        <div className="bg-white p-6 rounded-xl border border-[#FFDAB9] shadow-[0_4px_20px_-2px_rgba(255,182,163,0.1)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-800">일기 타임라인</h3>
            {searchKeyword && (
              <span className="bg-[#FFDAB9]/30 text-slate-600 text-xs px-2 py-1 rounded-md font-medium">
                {filteredDiaries.length}건
              </span>
            )}
          </div>
          <div className="relative">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#FFDAB9]"
              style={{ left: 19 }}
            />
            <div className="space-y-0">
              {filteredDiaries.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
              ) : (
                filteredDiaries.map((d, idx) => {
                  const isExpanded = expandedTimelineId === d.id
                  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
                  const dateObj = parseISO(d.date + 'T12:00:00')
                  const dayName = dayNames[getDay(dateObj)]
                  const iconName = idx === 0 ? 'edit_note' : idx % 2 === 0 ? 'article' : 'event'
                  const dotBg = idx === 0 ? '#FFB6A3' : '#FFDAB9'

                  return (
                    <div key={d.id} className="relative pl-14 mb-12 last:mb-0">
                      <div
                        className="absolute left-0 top-0.5 size-10 rounded-full border-4 border-[#FFF9F5] flex items-center justify-center z-10 shadow-sm [&_.material-symbols-outlined]:block"
                        style={{ backgroundColor: dotBg }}
                      >
                        <span className="material-symbols-outlined text-white text-[20px] leading-none">
                          {iconName}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 mb-3">
                        <span className="text-lg font-bold font-serif text-[#FFB6A3]">
                          {format(dateObj, 'yyyy년 M월 d일', { locale: ko })}
                        </span>
                        <span className="text-xs text-slate-500">{dayName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedTimelineId(isExpanded ? null : d.id)}
                        className="w-full text-left bg-white border border-[#FFDAB9]/40 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-[#FFB6A3]/50"
                      >
                        <h4 className="font-bold text-slate-800 mb-2 line-clamp-2">{d.title}</h4>
                        <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                          {isExpanded ? d.fullContent : d.content}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {d.keywords.slice(0, 5).map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFDAB9]/20 text-slate-600 text-[10px] font-bold uppercase tracking-wider"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                        {!isExpanded && d.fullContent.length > 120 && (
                          <p className="mt-3 text-xs font-semibold text-[#FFB6A3] flex items-center gap-1">
                            클릭하여 전체 보기
                            <span className="material-symbols-outlined text-sm">expand_more</span>
                          </p>
                        )}
                        {isExpanded && (
                          <p className="mt-3 text-xs font-semibold text-[#FFB6A3] flex items-center gap-1">
                            접기
                            <span className="material-symbols-outlined text-sm">expand_less</span>
                          </p>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {filteredDiaries.length > 0 && (
              <div className="relative pl-14 pt-4 pb-4">
                <div
                  className="absolute size-3.5 rounded-full bg-[#FFDAB9]"
                  style={{ left: 19, top: 16, transform: 'translate(-50%, 0)' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
