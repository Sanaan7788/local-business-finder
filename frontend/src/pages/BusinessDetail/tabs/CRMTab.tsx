import { useState } from 'react'
import { useUpdateNotes, useUpdateStatus } from '../../../hooks/useBusinesses'
import { useTransientFlag } from '../../../hooks/useTransientFlag'
import { cn } from '../../../lib/cn'
import { IS_STATIC } from '../../../lib/env'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatDate, formatNumber } from '../../../lib/format'
import { LEAD_STATUS_LABELS, LEAD_STATUS_TRANSITIONS } from '../../../lib/leads'
import { TONE } from '../../../lib/tones'
import { LeadStatusBadge, PriorityBadge } from '../../../components/business/LeadBadges'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { FormField, Textarea } from '../../../components/ui/Field'
import type { Business } from '../../../types/business'

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-fg-muted">{label}</p>
      <div className="text-sm text-fg">{children}</div>
    </div>
  )
}

export function CRMTab({ business }: { business: Business }) {
  const updateStatus = useUpdateStatus()
  const updateNotes = useUpdateNotes()
  const [notes, setNotes] = useState(business.notes ?? '')
  const [saved, flashSaved] = useTransientFlag()

  const allowed = LEAD_STATUS_TRANSITIONS[business.leadStatus]

  const saveNotes = async () => {
    await updateNotes.mutateAsync({ id: business.id, notes: notes || null })
    flashSaved()
  }

  return (
    <div className="space-y-6">
      {IS_STATIC && (
        <Alert tone="info">
          Status and notes changes are saved in this browser only. Use <strong>Local changes</strong> in the header to export them and apply
          them to the database with <code>npm run import:changes</code>.
        </Alert>
      )}

      <Meta label="Current Status"><LeadStatusBadge status={business.leadStatus} /></Meta>

      {allowed.length > 0 && (
        <Meta label="Move to">
          <div className="flex flex-wrap gap-2">
            {allowed.map(s => (
              <Button
                key={s}
                size="xs"
                variant={s === 'rejected' ? 'danger' : 'secondary'}
                loading={updateStatus.isPending && updateStatus.variables?.status === s}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: business.id, status: s })}
              >
                → {LEAD_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
          {updateStatus.isError && <Alert tone="danger" className="mt-2">{getApiErrorMessage(updateStatus.error)}</Alert>}
        </Meta>
      )}

      <FormField label="Notes">
        {id => (
          <>
            <Textarea id={id} rows={5} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this lead…" className="resize-none" />
            <div className="mt-2 flex items-center gap-3">
              <Button variant="primary" size="xs" loading={updateNotes.isPending} onClick={() => void saveNotes()}>
                {updateNotes.isPending ? 'Saving…' : 'Save Notes'}
              </Button>
              {saved && <span className={cn('text-xs', TONE.success.text)}>Saved ✓</span>}
              {updateNotes.isError && <span className={cn('text-xs', TONE.danger.text)}>{getApiErrorMessage(updateNotes.error)}</span>}
            </div>
          </>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <Meta label="Priority Score"><PriorityBadge priority={business.priority} score={business.priorityScore} /></Meta>
        <Meta label="Last Contacted">{formatDate(business.lastContactedAt)}</Meta>
        <Meta label="Created">{formatDate(business.createdAt)}</Meta>
        <Meta label="Updated">{formatDate(business.updatedAt)}</Meta>
        <Meta label="Tokens Used (lifetime)">
          <span className={cn('font-medium', TONE.purple.text)}>{business.tokensUsed > 0 ? formatNumber(business.tokensUsed) : '—'}</span>
        </Meta>
      </div>
    </div>
  )
}
