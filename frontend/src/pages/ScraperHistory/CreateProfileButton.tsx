import { useCreateBusiness } from '../../hooks/useBusinesses'
import { cn } from '../../lib/cn'
import { TONE } from '../../lib/tones'
import { Button } from '../../components/ui/Button'

/** Creates a stub profile for a name the scraper found but could not save. */
export function CreateProfileButton({
  name,
  zipcode,
  category,
  onCreated,
}: {
  name: string
  zipcode: string
  category: string
  onCreated: (id: string) => void
}) {
  const create = useCreateBusiness()

  if (create.isSuccess) return <span className={cn('text-xs font-medium', TONE.success.text)}>Created ✓</span>

  return (
    <Button
      variant="primary"
      size="xs"
      loading={create.isPending}
      onClick={() => create.mutate({ name, zipcode, category }, { onSuccess: b => onCreated(b.id) })}
    >
      {create.isPending ? '…' : '+ Create Profile'}
    </Button>
  )
}
