import { useState } from 'react'
import { useStartBatch, useStartScraper } from '../../hooks/useScraper'
import { getApiErrorMessage } from '../../lib/errors'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/Field'
import { CategoryTagInput } from './CategoryTagInput'

export function CategorySearchForm({ location }: { location: string }) {
  const [categories, setCategories] = useState<string[]>([])
  const [maxResults, setMaxResults] = useState(20)
  const [error, setError] = useState('')
  const start = useStartScraper()
  const startBatch = useStartBatch()

  const isBatch = categories.length > 1
  const pending = start.isPending || startBatch.isPending

  const handleStart = async () => {
    const loc = location.trim()
    if (!loc) { setError('Location is required'); return }
    setError('')
    try {
      if (isBatch) await startBatch.mutateAsync({ zipcode: loc, categories, maxResults })
      else await start.mutateAsync({ zipcode: loc, category: categories[0] ?? 'businesses', maxResults })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  return (
    <div className="space-y-3">
      <FormField
        label={isBatch ? `Categories (${categories.length}) — will run as a batch` : 'Category (optional — leave empty for all nearby businesses)'}
        hint={isBatch ? `~${categories.length * maxResults} businesses max` : categories.length === 0 ? 'No category — will search "businesses near [location]"' : undefined}
      >
        {id => <CategoryTagInput id={id} selected={categories} onChange={setCategories} />}
      </FormField>

      <FormField label={`Max results per category: ${maxResults}`}>
        {id => (
          <input
            id={id}
            type="range"
            min={5}
            max={200}
            step={5}
            value={maxResults}
            onChange={e => setMaxResults(Number(e.target.value))}
            className="w-full accent-primary"
          />
        )}
      </FormField>

      <Button variant="primary" size="md" block loading={pending} onClick={() => void handleStart()}>
        {pending ? 'Starting…' : isBatch ? `Start Batch (${categories.length})` : categories.length === 0 ? 'Start Scraper (All Nearby)' : 'Start Scraper'}
      </Button>

      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  )
}
