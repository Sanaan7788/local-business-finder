import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout/Layout'
import { ErrorState } from './components/ui/ErrorState'
import { LoadingBlock } from './components/ui/Spinner'
import { DarkModeProvider } from './context/DarkModeContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Businesses = lazy(() => import('./pages/Businesses'))
const BusinessDetail = lazy(() => import('./pages/BusinessDetail'))
const ScraperHistory = lazy(() => import('./pages/ScraperHistory'))
const NotFound = lazy(() => import('./pages/NotFound'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// A render error on one page should not blank the whole app.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorState message="Something went wrong rendering this page." onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <DarkModeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Layout>
            <ErrorBoundary>
              <Suspense fallback={<LoadingBlock />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/businesses" element={<Businesses />} />
                  <Route path="/businesses/:id" element={<BusinessDetail />} />
                  <Route path="/history" element={<ScraperHistory />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </DarkModeProvider>
  )
}
