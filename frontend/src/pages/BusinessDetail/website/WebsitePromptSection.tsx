import { useState } from 'react'
import { useGenerateWebsitePrompt, useUpdateWebsitePrompt } from '../../../hooks/useBusinesses'
import { useTransientFlag } from '../../../hooks/useTransientFlag'
import { cn } from '../../../lib/cn'
import { getApiErrorMessage } from '../../../lib/errors'
import { TONE } from '../../../lib/tones'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { CopyButton } from '../../../components/ui/CopyButton'
import { Textarea } from '../../../components/ui/Field'
import { SectionHeading } from '../../../components/ui/Heading'
import type { Business } from '../../../types/business'

export function WebsitePromptSection({ business }: { business: Business }) {
  const generatePrompt = useGenerateWebsitePrompt()
  const updatePrompt = useUpdateWebsitePrompt()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [show, setShow] = useState(false)
  const [saved, flashSaved] = useTransientFlag(2500)

  const prompt = business.websitePrompt
  const busy = generatePrompt.isPending || updatePrompt.isPending
  const error = generatePrompt.error ?? updatePrompt.error

  const startEdit = () => { setDraft(prompt ?? ''); setEditing(true); setShow(true) }

  const save = async () => {
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: draft })
    setEditing(false)
    flashSaved()
  }

  const remove = async () => {
    if (!window.confirm('Delete the saved prompt? Generate Website will fall back to the default.')) return
    await updatePrompt.mutateAsync({ id: business.id, websitePrompt: null })
    setEditing(false)
    setShow(false)
  }

  return (
    <div className="space-y-3">
      <SectionHeading
        title="Website Prompt"
        description={prompt ? 'Generate Website uses this saved prompt. Edit it to steer the result.' : 'The brief sent to the AI when generating the website.'}
        action={
          !prompt ? (
            <Button variant="primary" size="xs" loading={generatePrompt.isPending} onClick={() => generatePrompt.mutate(business.id)}>
              {generatePrompt.isPending ? 'Generating…' : 'Generate Prompt'}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {saved && <span className={cn('text-xs', TONE.success.text)}>✓ Saved</span>}
              <CopyButton text={prompt} variant="secondary" size="xs" />
              <Button size="xs" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</Button>
              {editing ? (
                <>
                  <Button size="xs" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="xs" variant="primary" loading={updatePrompt.isPending} onClick={() => void save()}>
                    {updatePrompt.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button size="xs" variant="primary" onClick={startEdit}>Edit</Button>
                  <Button size="xs" variant="danger" disabled={busy} onClick={() => void remove()}>Delete</Button>
                </>
              )}
            </div>
          )
        }
      />

      {!prompt && (
        <p className="text-xs text-fg-subtle">
          No saved prompt. Generate Website builds the default brief from this profile; generate it here first if you want to review or customise it.
          The prompt is self-contained, so you can also paste it into any other AI tool.
        </p>
      )}

      {error ? <Alert tone="danger">{getApiErrorMessage(error)}</Alert> : null}

      {prompt && show && (
        editing ? (
          <Textarea
            aria-label="Website prompt"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="h-[400px] font-mono text-xs leading-relaxed"
          />
        ) : (
          <pre className="max-h-[400px] w-full overflow-auto whitespace-pre-wrap rounded-xl border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-fg-muted">
            {prompt}
          </pre>
        )
      )}
    </div>
  )
}
