import { useState } from 'react'
import { useImportFromUrl, useLookupByMapsUrl } from '../../hooks/useScraper'
import { Tabs } from '../../components/ui/Tabs'
import { LocationPicker } from './LocationPicker'
import { CategorySearchForm } from './CategorySearchForm'
import { SingleUrlForm } from './SingleUrlForm'

type Mode = 'category' | 'maps' | 'import'

const MODES = [
  { key: 'category', label: 'Search by Category' },
  { key: 'maps', label: 'Find Specific Business' },
  { key: 'import', label: 'Import from Website' },
] as const

export function ScrapeForm() {
  const [mode, setMode] = useState<Mode>('category')
  const [location, setLocation] = useState('')
  const lookup = useLookupByMapsUrl()
  const importUrl = useImportFromUrl()

  const changeMode = (m: Mode) => {
    setMode(m)
    lookup.reset()
    importUrl.reset()
  }

  return (
    <div className="space-y-4">
      <Tabs variant="pills" aria-label="Scrape mode" items={MODES.map(m => ({ key: m.key, label: m.label }))} value={mode} onChange={changeMode} />

      {mode === 'category' && (
        <>
          <LocationPicker value={location} onChange={setLocation} />
          <CategorySearchForm location={location} />
        </>
      )}

      {mode === 'maps' && (
        <SingleUrlForm
          label="Google Maps URL"
          placeholder="https://maps.google.com/maps/place/..."
          hint="Open the business on Google Maps, copy the URL from your browser, and paste it here."
          pendingHint="Opening Google Maps — this takes 20–40 seconds…"
          submitLabel="Look Up"
          pendingLabel="Looking up…"
          mutation={lookup}
        />
      )}

      {mode === 'import' && (
        <SingleUrlForm
          label="Website URL"
          placeholder="https://www.example.com"
          hint="The name, phone and address are extracted from the site, then the full AI analysis runs."
          pendingHint="Fetching website and running AI analysis — this may take 30–60 seconds…"
          submitLabel="Import Business"
          pendingLabel="Importing & analysing…"
          mutation={importUrl}
        />
      )}
    </div>
  )
}
