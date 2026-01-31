import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string                 // 현재 확정된 검색어
  onChange: (v: string) => void // 검색 확정 시에만 호출
  onSearch: (query: string) => void
  placeholder?: string
  suggestions?: string[]
  loading?: boolean             // 검색 중 상태
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = '키워드 또는 자연어로 검색... (예: 여자친구, 왜 그때 분위기가 안 좋았지)',
  suggestions = ['퇴사', '태움', '번아웃', '울었어', '왜 그때 분위기가 안 좋았지'],
  loading = false,
}: SearchBarProps) {
  const [draft, setDraft] = useState(value)

  // 바깥에서 value가 바뀌면(예: 다른 곳에서 검색어 변경) 입력창도 동기화
  useEffect(() => {
    setDraft(value)
  }, [value])

  const commitSearch = () => {
    const q = draft.trim()
    if (!q) return
    onChange(q)     // 확정된 검색어만 부모에 반영
    onSearch(q)     // 그래프 갱신 트리거
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitSearch()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6355]/60" />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}  // 입력 중에는 부모 state 건드리지 않음
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3.5 rounded-2xl border-2 bg-[#FFF9F5]
            text-[#8b6355] placeholder:text-[#8b6355]/50
            focus:outline-none focus:border-[#FFB6A3] focus:ring-2 focus:ring-[#FFB6A3]/30
            transition-all shadow-sm"
          style={{ borderColor: '#FFDAB9' }}
          autoFocus
        />
        <button
          type="button"
          onClick={commitSearch}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: '#FFB6A3' }}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              검색 중...
            </>
          ) : (
            '검색'
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setDraft(s)     // 입력창 값 변경
              onChange(s)     // 확정 처리
              onSearch(s)     // 그래프 갱신
            }}
            className="px-3 py-1 text-xs rounded-full text-[#8b6355] transition-colors hover:opacity-80"
            style={{ backgroundColor: 'rgba(255, 182, 163, 0.4)' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
