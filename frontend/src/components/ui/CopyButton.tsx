import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
