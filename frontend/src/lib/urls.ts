export function mapsSearchUrl(name: string, location?: string): string {
  const q = location ? `${name} ${location}` : name
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`
}

/**
 * Pull a searchable location out of a Google Maps URL:
 * a place name, a search query, coordinates, or the `q` param.
 */
export function extractLocationFromMapsUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('google.com') && !u.hostname.includes('maps.app.goo.gl')) return null
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    const searchMatch = u.pathname.match(/\/maps\/search\/([^/@?]+)/)
    if (searchMatch) return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '))
    const coordMatch =
      u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('ll')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/) ||
      u.searchParams.get('q')?.match(/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) return `${coordMatch[1]},${coordMatch[2]}`
    return u.searchParams.get('q')
  } catch {
    return null
  }
}
