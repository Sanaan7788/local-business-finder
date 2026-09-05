import { useCallback } from 'react'
import { useTransientFlag } from './useTransientFlag'

/** Copy text to the clipboard and report "copied" for a moment. */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, flash] = useTransientFlag(resetMs)

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      flash()
      return true
    } catch {
      return false
    }
  }, [flash])

  return { copied, copy }
}
