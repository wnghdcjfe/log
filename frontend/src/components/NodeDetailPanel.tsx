import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText, X } from 'lucide-react'
import type { RecordNode } from '@/data/mockData'
import { useEffect } from 'react'

interface NodeDetailPanelProps {
  node: RecordNode | null
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  useEffect(() => {
    if (!node) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [node, onClose])

  if (!node) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: '#FFDAB9', backgroundColor: 'rgba(255, 218, 185, 0.3)' }}
        >
          <h3 className="text-lg font-bold text-[#e89580] flex items-center gap-2">
            <FileText className="w-5 h-5" />
           일기 자세히 보기
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-[#FFDAB9]/50"
            style={{ color: '#8b6355' }}
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-[#8b6355]/70 uppercase tracking-wide mb-1">제목</p>
            <p className="text-lg font-bold text-[#8b6355]">{node.label}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#8b6355]/70 uppercase tracking-wide mb-1">시각</p>
            <p className="text-sm text-[#8b6355]">
              {format(new Date(node.timestamp), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
            </p>
          </div>
          {node.emotion && (
            <div>
              <p className="text-xs font-semibold text-[#8b6355]/70 uppercase tracking-wide mb-1">감정</p>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'rgba(255, 182, 163, 0.4)', color: '#8b6355' }}
              >
                {node.emotion}
              </span>
            </div>
          )}
          {node.people && node.people.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#8b6355]/70 uppercase tracking-wide mb-1">관련 인물</p>
              <p className="text-sm text-[#8b6355]">{node.people.join(', ')}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[#8b6355]/70 uppercase tracking-wide mb-2">원문</p>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(255, 218, 185, 0.2)', border: '1px solid #FFDAB9' }}
            >
              <p className="text-base text-[#8b6355] leading-relaxed whitespace-pre-wrap">
                {node.originalText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
