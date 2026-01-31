import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { RecordNode } from '@/data/mockData'

interface GraphDetailPanelProps {
  node: RecordNode | null
  onViewOriginal?: () => void
}

export function GraphDetailPanel({ node, onViewOriginal }: GraphDetailPanelProps) {
  if (!node) {
    return (
      <p className="text-[#8b6355]/70 text-sm leading-relaxed">
        일기 노드를 클릭하면 내용이 표시됩니다.
      </p>
    )
  }

  const excerpt = node.originalText.length > 200
    ? node.originalText.slice(0, 200) + '...'
    : node.originalText

  return (
    <div>
      <div className="text-base  font-bold leading-snug mt-1.5 text-[#e89580]">
        {node.label}
      </div>
      <div className="mt-1.5 text-[#8b6355]/80 text-sm">
        {format(new Date(node.timestamp), 'yyyy-MM-dd', { locale: ko })}
        {node.emotion && ` · ${node.emotion}`}
        {node.people && node.people.length > 0 && ` · ${node.people.join(', ')}`}
      </div>
      <div
        className="mt-3 p-3 rounded-xl whitespace-pre-wrap text-sm leading-relaxed"
        style={{ backgroundColor: 'rgba(255, 218, 185, 0.2)', border: '1px solid #FFDAB9', color: '#8b6355' }}
      >
        {excerpt}
      </div>
      {onViewOriginal && node.originalText.length > 200 && (
        <button
          onClick={onViewOriginal}
          className="mt-3 text-sm font-medium text-[#e89580] hover:opacity-80 transition-opacity"
        >
          원문 전체 보기 →
        </button>
      )}
    </div>
  )
}
