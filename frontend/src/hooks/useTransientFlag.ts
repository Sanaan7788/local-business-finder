import { useCallback, useEffect, useRef, useState } from 'react'

/** A boolean that turns itself off `ms` after being triggered ("Saved ✓"). */
export function useTransientFlag(ms = 2000): [boolean, () => void] {
  const [flag, setFlag] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(() => {
    setFlag(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlag(false), ms)
  }, [ms])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return [flag, trigger]
}
