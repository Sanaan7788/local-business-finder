import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import BusinessDetail from './pages/BusinessDetail'
import ScraperHistory from './pages/ScraperHistory'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }`

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="text-base font-bold text-blue-700 tracking-tight">
              Local Business Finder
            </span>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/businesses" className={navLinkClass}>Businesses</NavLink>
              <NavLink to="/history" className={navLinkClass}>History</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500">Page not found.</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/businesses/:id" element={<BusinessDetail />} />
            <Route path="/history" element={<ScraperHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
