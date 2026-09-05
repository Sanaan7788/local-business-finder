import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'

export default function NotFound() {
  return (
    <EmptyState
      title="404 — page not found"
      action={<Link to="/" className="text-sm text-primary hover:underline">Back to the dashboard</Link>}
    />
  )
}
