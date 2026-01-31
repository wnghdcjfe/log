import { MessageCircle } from 'lucide-react'
import type { QuestionResult } from '@/data/mockData'

interface QuestionUIProps {
  questions: QuestionResult[]
  selectedQuestion: QuestionResult | null
  onSelectQuestion: (q: QuestionResult | null) => void
}

export function QuestionUI({
  questions,
  selectedQuestion,
  onSelectQuestion,
}: QuestionUIProps) {
  return (
    <div
      className="rounded-xl shadow-sm overflow-hidden"
      style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDAB9' }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: '#FFDAB9', backgroundColor: 'rgba(255, 218, 185, 0.3)' }}
      >
        <h3 className="font-serif font-semibold text-[#e89580] flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          질문 결과
        </h3>
        <p className="text-xs text-[#8b6355]/70 mt-0.5">
          관련 노드가 그래프에 강조 표시됩니다
        </p>
      </div>
      <div className="p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
        {questions.map((q) => {
          const isSelected = selectedQuestion?.questionId === q.questionId
          return (
            <button
              key={q.questionId}
              onClick={() => onSelectQuestion(isSelected ? null : q)}
              className="w-full text-left p-2.5 rounded-lg text-sm transition-all border"
              style={{
                backgroundColor: isSelected ? 'rgba(255, 182, 163, 0.3)' : 'transparent',
                borderColor: isSelected ? '#FFB6A3' : 'transparent',
              }}
            >
              <p className="text-[#8b6355] line-clamp-2">{q.question}</p>
              <p className="text-xs text-[#8b6355]/60 mt-1">{q.nodeIds.length}개 기록</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
