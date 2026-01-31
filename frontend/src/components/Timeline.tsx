import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { TimelineEvent } from '@/data/mockData'
import { ChevronRight } from 'lucide-react'

interface TimelineProps {
  events: TimelineEvent[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  onSelectNodeIds: (nodeIds: string[]) => void
}

export function Timeline({
  events,
  selectedDate,
  onSelectDate,
  onSelectNodeIds,
}: TimelineProps) {
  return (
    <div
      className="h-full flex flex-col rounded-xl shadow-sm overflow-hidden"
      style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: '#FFDAB9', backgroundColor: 'rgba(255, 218, 185, 0.3)' }}
      >
        <h3 className=" font-semibold text-[#e89580] flex items-center gap-2">
          <span className="w-1 h-4 rounded" style={{ backgroundColor: '#FFB6A3' }} />
          타임라인
        </h3>
        <p className="text-xs text-[#8b6355]/70 mt-0.5">
          시점을 선택해 기록을 탐색하세요
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {events.map((ev) => {
          const isSelected = selectedDate === ev.date
          return (
            <button
              key={ev.id}
              onClick={() => {
                if (isSelected) {
                  onSelectDate(null)
                  onSelectNodeIds([])
                } else {
                  onSelectDate(ev.date)
                  onSelectNodeIds(ev.nodeIds)
                }
              }}
              className="w-full text-left p-3 rounded-lg transition-all border"
              style={{
                backgroundColor: isSelected ? 'rgba(255, 182, 163, 0.3)' : 'transparent',
                borderColor: isSelected ? '#FFB6A3' : 'transparent',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[#8b6355]/70">
                  {format(parseISO(ev.date), 'yyyy.MM.dd', { locale: ko })}
                </span>
                {isSelected && <ChevronRight className="w-4 h-4 text-[#e89580]" />}
              </div>
              <p className="font-medium text-[#8b6355] mt-1 truncate">{ev.label}</p>
              <p className="text-xs text-[#8b6355]/70 mt-0.5 line-clamp-2">{ev.summary}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
