import { NavLink } from 'react-router-dom'
import { LLMSelector } from './LLMSelector'
import { TotalTokensCounter } from './TotalTokensCounter'
import { useDarkMode } from '../../context/DarkModeContext'

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
  }`

export function Layout({ children }: { children: React.ReactNode }) {
  const { dark, toggle } = useDarkMode()
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="text-base font-bold text-blue-700 dark:text-blue-400 tracking-tight">
              Local Business Finder
            </span>
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/businesses" className={navLinkClass}>Businesses</NavLink>
                <NavLink to="/history" className={navLinkClass}>History</NavLink>
              </nav>
              <TotalTokensCounter />
              <LLMSelector />
              <button
                onClick={toggle}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 text-sm ${dark ? 'translate-x-7' : 'translate-x-1'}`}>
                  {dark ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
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
