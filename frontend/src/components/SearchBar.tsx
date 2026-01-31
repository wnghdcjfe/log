import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  onSearch: (query: string) => void
  placeholder?: string
  suggestions?: string[]
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = '키워드 또는 자연어로 검색... (예: 여자친구, 왜 그때 분위기가 안 좋았지)',
  suggestions = ['퇴사', '태움', '번아웃', '울었어', '왜 그때 분위기가 안 좋았지'],
}: SearchBarProps) {
  const handleSearchClick = () => {
    const q = value.trim()
    if (q) onSearch(q)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6355]/60" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
          onClick={handleSearchClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-white text-sm font-medium rounded-xl transition-colors"
          style={{ backgroundColor: '#FFB6A3' }}
        >
          검색
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
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
