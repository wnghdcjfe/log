import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText } from 'lucide-react'
import type { RecordNode } from '@/data/mockData'

interface NodeSummaryCardProps {
  node: RecordNode
  onViewOriginal: () => void
  onExpand: (type: 'same_person' | 'same_emotion' | 'similar_event') => void
}

export function NodeSummaryCard({ node, onViewOriginal, onExpand }: NodeSummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 min-w-[260px] max-w-[320px]">
      <p className="font-semibold text-slate-800">{node.label}</p>
      <p className="text-xs text-slate-500 mt-1">
        {format(new Date(node.timestamp), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
      </p>
      {node.emotion && (
        <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
          {node.emotion}
        </span>
      )}
      {node.people && node.people.length > 0 && (
        <p className="text-sm text-slate-600 mt-2">{node.people.join(', ')}</p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={onViewOriginal}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-amber-500
            hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          원문 보기
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => onExpand('same_person')}
            className="flex-1 py-1.5 text-xs rounded-md bg-slate-100 hover:bg-amber-50"
          >
            동일 인물
          </button>
          <button
            onClick={() => onExpand('same_emotion')}
            className="flex-1 py-1.5 text-xs rounded-md bg-slate-100 hover:bg-amber-50"
          >
            동일 감정
          </button>
          <button
            onClick={() => onExpand('similar_event')}
            className="flex-1 py-1.5 text-xs rounded-md bg-slate-100 hover:bg-amber-50"
          >
            유사 사건
          </button>
        </div>
      </div>
    </div>
  )
}
