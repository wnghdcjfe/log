import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText, X } from 'lucide-react'
import type { RecordNode } from '@/data/mockData'

interface NodeDetailPanelProps {
  node: RecordNode | null
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-[360px] rounded-xl shadow-xl flex flex-col overflow-hidden z-10"
      style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#FFDAB9', backgroundColor: 'rgba(255, 218, 185, 0.3)' }}
      >
        <h3 className="font-serif font-semibold text-[#e89580] flex items-center gap-2">
          <FileText className="w-4 h-4" />
          원문 기록
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:opacity-70"
          style={{ color: '#8b6355' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs text-[#8b6355]/70">제목</p>
          <p className="font-medium text-[#8b6355] mt-0.5">{node.label}</p>
        </div>
        <div>
          <p className="text-xs text-[#8b6355]/70">시각</p>
          <p className="text-sm text-[#8b6355] mt-0.5">
            {format(new Date(node.timestamp), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
          </p>
        </div>
        {node.emotion && (
          <div>
            <p className="text-xs text-[#8b6355]/70">감정</p>
            <span
              className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'rgba(255, 182, 163, 0.4)', color: '#8b6355' }}
            >
              {node.emotion}
            </span>
          </div>
        )}
        {node.people && node.people.length > 0 && (
          <div>
            <p className="text-xs text-[#8b6355]/70">관련 인물</p>
            <p className="text-sm text-[#8b6355] mt-0.5">{node.people.join(', ')}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-[#8b6355]/70">원문</p>
          <div
            className="mt-1.5 p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(255, 218, 185, 0.2)', border: '1px solid #FFDAB9' }}
          >
            <p className="text-sm text-[#8b6355] leading-relaxed whitespace-pre-wrap">
              {node.originalText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
