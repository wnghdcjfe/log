import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { RecordNode as RecordNodeType } from '@/data/mockData'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

const emotionColors: Record<string, string> = {
  기쁨: '#22c55e',
  슬픔: '#3b82f6',
  분노: '#ef4444',
  불안: '#f59e0b',
  놀람: '#8b5cf6',
  혼란: '#ec4899',
  중립: '#64748b',
  번아웃: '#f97316',
  후회: '#06b6d4',
  무력감: '#6366f1',
  피로: '#78716c',
  체념: '#57534e',
}

function RecordNodeComponent({ data, selected }: NodeProps<RecordNodeType & { isCentral?: boolean }>) {
  const emotionColor = data.emotion
    ? (emotionColors[data.emotion] ?? '#64748b')
    : '#64748b'
  const isExpanded = data.isExpanded ?? false
  const isCentral = (data as { isCentral?: boolean }).isCentral ?? false

  return (
    <div
      className={`
        record-node min-w-[200px] max-w-[280px] rounded-xl border-2 p-3 shadow-lg
        transition-all duration-200
        ${selected ? 'ring-2 ring-[#FFB6A3] ring-offset-2 ring-offset-[#FFF9F5] scale-105' : ''}
        ${isExpanded ? 'border-dashed opacity-85 animate-pulse' : 'border-solid'}
        ${isCentral ? 'shadow-xl ring-2 ring-[#FFB6A3]/50' : ''}
      `}
      style={{
        borderColor: emotionColor,
        backgroundColor: `${emotionColor}18`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400" />
      
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 w-2 h-2 rounded-full mt-1"
            style={{ backgroundColor: emotionColor }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate" title={data.label}>
              {data.label}
            </p>
            <p className="text-xs text-slate-500">
              {format(new Date(data.timestamp), 'M월 d일 HH:mm', { locale: ko })}
            </p>
          </div>
        </div>
        
        {data.emotion && (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: emotionColor }}
          >
            {data.emotion}
          </span>
        )}
        
        {data.people && data.people.length > 0 && (
          <p className="text-xs text-slate-600 truncate">
            {data.people.join(', ')}
          </p>
        )}
        
        {isExpanded && data.expandType && (
          <span className="text-[10px] text-slate-400 italic">
            {data.expandType === 'same_person' && '동일 인물'}
            {data.expandType === 'same_emotion' && '동일 감정'}
            {data.expandType === 'similar_event' && '유사 사건'}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400" />
    </div>
  )
}

export const RecordNode = memo(RecordNodeComponent)
