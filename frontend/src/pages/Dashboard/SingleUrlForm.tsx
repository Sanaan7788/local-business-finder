import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { getApiErrorMessage } from '../../lib/errors'
import { Button } from '../../components/ui/Button'
import { FormField, Input } from '../../components/ui/Field'
import type { LookupResult } from '../../types/scraper'
import { LookupResultAlert } from './LookupResultAlert'

/** One URL in, one LookupResult out — shared by Maps lookup and website import. */
export function SingleUrlForm({
  label,
  placeholder,
  hint,
  pendingHint,
  submitLabel,
  pendingLabel,
  mutation,
}: {
  label: string
  placeholder: string
  hint: string
  pendingHint: string
  submitLabel: string
  pendingLabel: string
  mutation: UseMutationResult<LookupResult, Error, string>
}) {
  const [url, setUrl] = useState('')

  const submit = () => {
    const u = url.trim()
    if (u) mutation.mutate(u)
  }

  return (
    <div className="space-y-3">
      <FormField label={label} hint={mutation.isPending ? pendingHint : hint}>
        {id => (
          <Input
            id={id}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={placeholder}
          />
        )}
      </FormField>

      <Button variant="primary" size="md" block loading={mutation.isPending} disabled={!url.trim()} onClick={submit}>
        {mutation.isPending ? pendingLabel : submitLabel}
      </Button>

      {mutation.isError && <LookupResultAlert result={{ status: 'error', message: getApiErrorMessage(mutation.error) }} />}
      {mutation.data && <LookupResultAlert result={mutation.data} />}
    </div>
  )
}
