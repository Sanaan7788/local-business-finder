import { useState } from 'react'
import { extractLocationFromMapsUrl } from '../../lib/urls'
import { Button } from '../../components/ui/Button'
import { FormField, Input, Select } from '../../components/ui/Field'

type LocationType = 'zipcode' | 'address' | 'mapslink' | 'live'
type LiveState = { status: 'idle' | 'fetching' | 'done' | 'error'; error?: string }

export function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [type, setType] = useState<LocationType>('zipcode')
  const [mapsLink, setMapsLink] = useState('')
  const [mapsError, setMapsError] = useState('')
  const [live, setLive] = useState<LiveState>({ status: 'idle' })

  const changeType = (t: LocationType) => {
    setType(t)
    onChange('')
    setMapsLink('')
    setMapsError('')
    setLive({ status: 'idle' })
  }

  const extract = () => {
    const loc = extractLocationFromMapsUrl(mapsLink.trim())
    if (loc) {
      onChange(loc)
      setMapsLink('')
      setMapsError('')
    } else {
      setMapsError('Could not extract a location from this URL.')
    }
  }

  const getLive = () => {
    if (!navigator.geolocation) {
      setLive({ status: 'error', error: 'Geolocation is not supported by your browser.' })
      return
    }
    setLive({ status: 'fetching' })
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`)
        setLive({ status: 'done' })
      },
      err => setLive({ status: 'error', error: err.message || 'Could not get your location.' }),
      { timeout: 10_000, enableHighAccuracy: false },
    )
  }

  const hint =
    type === 'mapslink' && value ? `✓ Extracted: ${value}`
    : type === 'live' && live.status === 'done' && value ? `✓ Location: ${value}`
    : undefined
  const error = type === 'mapslink' ? mapsError || undefined : type === 'live' ? live.error : undefined

  return (
    <FormField label="Location" hint={hint} error={error}>
      {id => (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select aria-label="Location type" value={type} onChange={e => changeType(e.target.value as LocationType)} className="sm:w-auto">
            <option value="zipcode">Zipcode</option>
            <option value="address">Address</option>
            <option value="mapslink">Google Maps Link</option>
            <option value="live">Live Location</option>
          </Select>

          {(type === 'zipcode' || type === 'address') && (
            <Input
              id={id}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={type === 'zipcode' ? 'e.g. 77477' : 'e.g. Montrose Houston TX'}
              className="flex-1"
            />
          )}

          {type === 'live' && (
            <Button id={id} size="md" className="flex-1 justify-start" loading={live.status === 'fetching'} onClick={getLive}>
              {live.status === 'fetching' ? 'Getting location…'
                : live.status === 'done' && value ? `📍 ${value} — tap to refresh`
                : '📍 Tap to get current location'}
            </Button>
          )}

          {type === 'mapslink' && (
            <div className="flex flex-1 gap-1.5">
              <Input
                id={id}
                value={mapsLink}
                onChange={e => { setMapsLink(e.target.value); setMapsError('') }}
                placeholder="Paste a Google Maps link…"
              />
              <Button size="md" onClick={extract} disabled={!mapsLink.trim()}>Extract</Button>
            </div>
          )}
        </div>
      )}
    </FormField>
  )
}
