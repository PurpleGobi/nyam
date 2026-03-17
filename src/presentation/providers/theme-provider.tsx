"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "nyam-theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// External store for theme to avoid setState-in-effect
let currentTheme: Theme = "system"
const listeners = new Set<() => void>()

function getThemeSnapshot(): Theme {
  return currentTheme
}

function getThemeServerSnapshot(): Theme {
  return "system"
}

function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setThemeStore(t: Theme) {
  currentTheme = t
  listeners.forEach((l) => l())
}

// Initialize from localStorage once
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored && ["light", "dark", "system"].includes(stored)) {
    currentTheme = stored
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const resolvedTheme = useMemo(() => {
    return theme === "system" ? getSystemTheme() : theme
  }, [theme])

  // Apply theme class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      // Force re-render by toggling the store
      setThemeStore("system")
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeStore(t)
    localStorage.setItem(STORAGE_KEY, t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
