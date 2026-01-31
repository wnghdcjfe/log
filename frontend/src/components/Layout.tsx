import { Outlet, Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/search', label: '검색' },
  { path: '/write', label: '쓰기' },
  { path: '/read', label: '읽기' },
  { path: '/insight', label: '인사이트' },
] as const

function isActivePath(currentPath: string, navPath: string): boolean {
  return currentPath === navPath || currentPath.startsWith(navPath + '/')
}

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5] font-sans">
      <header
        className="shrink-0 px-4 py-4"
        style={{
          background: 'linear-gradient(135deg, #FFDAB9 0%, #FFB6A3 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/search"
            className="flex items-center gap-2 group"
          >
            <img
              src="/logo2.png"
              alt="OUTBRAIN Logo"
              className="h-8 w-auto transition-transform group-hover:scale-105"
            /> 
          </Link>

          <nav className="flex items-center gap-1 flex-wrap">
            {NAV_ITEMS.map(({ path, label }) => {
              const isActive = isActivePath(pathname, path)

              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/80 text-[#e89580] shadow-sm'
                      : 'text-[#8b6355] hover:bg-white/50',
                  ].join(' ')}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
