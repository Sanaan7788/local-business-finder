import { useState } from 'react'
import { useUpdateStatus, useUpdateNotes } from '../../../hooks/useBusinesses'
import { Badge } from '../../../components/ui/Badge'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, PRIORITY_COLORS } from '../../../types/business'
import type { LeadStatus, Priority } from '../../../types/business'

export function CRMTab({ business }: { business: any }) {
  const updateStatus = useUpdateStatus()
  const updateNotes = useUpdateNotes()
  const [notes, setNotes] = useState(business.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
    new: ['qualified', 'rejected'],
    qualified: ['contacted', 'rejected'],
    contacted: ['interested', 'rejected', 'qualified'],
    interested: ['closed', 'rejected', 'contacted'],
    closed: [],
    rejected: ['new'],
  }
  const allowed = TRANSITIONS[business.leadStatus as LeadStatus] ?? []

  const handleSaveNotes = async () => {
    await updateNotes.mutateAsync({ id: business.id, notes: notes || null })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 mb-2">Current Status</p>
        <Badge className={LEAD_STATUS_COLORS[business.leadStatus as LeadStatus]}>
          {LEAD_STATUS_LABELS[business.leadStatus as LeadStatus]}
        </Badge>
      </div>
      {allowed.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Move to</p>
          <div className="flex flex-wrap gap-2">
            {allowed.map(s => (
              <button
                key={s}
                onClick={() => updateStatus.mutate({ id: business.id, status: s })}
                disabled={updateStatus.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                  s === 'rejected' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
              >
                → {LEAD_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 mb-2">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          placeholder="Add notes about this lead…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSaveNotes}
            disabled={updateNotes.isPending}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {updateNotes.isPending ? 'Saving…' : 'Save Notes'}
          </button>
          {notesSaved && <span className="text-green-600 text-xs">Saved ✓</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-1">Priority Score</p>
          <Badge className={PRIORITY_COLORS[business.priority as Priority]}>{business.priority} ({business.priorityScore})</Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Last Contacted</p>
          <p className="text-sm">{business.lastContactedAt ? new Date(business.lastContactedAt).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Created</p>
          <p className="text-sm">{new Date(business.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Updated</p>
          <p className="text-sm">{new Date(business.updatedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Tokens Used (lifetime)</p>
          <p className="text-sm text-purple-700 font-medium">
            {(business.tokensUsed ?? 0) > 0 ? (business.tokensUsed as number).toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
