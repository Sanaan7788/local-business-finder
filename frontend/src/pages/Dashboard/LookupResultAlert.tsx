import { Link } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import type { Tone } from '../../lib/tones'
import type { LookupResult } from '../../types/scraper'

const TONES: Record<LookupResult['status'], Tone> = { saved: 'success', duplicate: 'warning', not_found: 'neutral', error: 'danger' }
const PREFIX: Record<LookupResult['status'], string> = { saved: 'Saved', duplicate: 'Already in database', not_found: 'Not found', error: 'Error' }

export function LookupResultAlert({ result }: { result: LookupResult }) {
  return (
    <Alert
      tone={TONES[result.status]}
      action={result.businessId && (
        <Link to={`/businesses/${result.businessId}`} className="text-xs underline hover:no-underline">View profile →</Link>
      )}
    >
      <span className="font-medium">{PREFIX[result.status]} — </span>
      {result.message}
    </Alert>
  )
}
