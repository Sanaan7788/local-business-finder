import { useQuery } from '@tanstack/react-query'
import { snapshot } from '../lib/api/static/store'
import { qk } from './queryKeys'

/** When the published snapshot was exported and what it contains. Static build only. */
export function useSnapshotMeta() {
  return useQuery({
    queryKey: qk.snapshot.meta(),
    queryFn: () => snapshot.index().then(index => index.meta),
    staleTime: Infinity,
  })
}
