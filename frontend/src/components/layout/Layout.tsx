import { NavLink } from 'react-router-dom'
import { LLMSelector } from './LLMSelector'
import { TotalTokensCounter } from './TotalTokensCounter'
import { useDarkMode } from '../../context/DarkModeContext'

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700'
  }`

export function Layout({ children }: { children: React.ReactNode }) {
  const { dark, toggle } = useDarkMode()
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">LB</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Local Business Finder
              </span>
            </div>

            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-0.5">
                <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/businesses" className={navLinkClass}>Businesses</NavLink>
                <NavLink to="/history" className={navLinkClass}>History</NavLink>
              </nav>

              <div style={{ width: 1, height: 20, backgroundColor: 'var(--border)', margin: '0 4px' }} />

              <TotalTokensCounter />
              <LLMSelector />

              {/* Dark mode toggle */}
              <button
                onClick={toggle}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${dark ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-300 text-xs ${dark ? 'translate-x-6' : 'translate-x-0.5'}`}>
                  {dark ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }} className="text-center text-xs py-4">
        Local Business Finder
      </footer>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500">Page not found.</p>
    </div>
  )
}
