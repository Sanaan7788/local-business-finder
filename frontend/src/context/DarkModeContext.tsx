import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const DarkModeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} })

export function DarkModeProvider({ children }: { children: ReactNode }) {
  // The inline script in index.html has already applied the class before first paint
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // storage unavailable — theme simply won't persist
    }
  }, [dark])

  const value = useMemo(() => ({ dark, toggle: () => setDark(d => !d) }), [dark])
  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDarkMode = () => useContext(DarkModeContext)
