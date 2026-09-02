import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useConsolePathname } from "../shell/location"
import { ConsoleFiltersContext } from "./context"

type OpenByPage = Record<string, boolean>

/** Holds the panel's open state per page under a frame: opening it on
 *  Activity says nothing about Jobs. Given a storage key it remembers
 *  every page's choice in localStorage; the first render is always
 *  closed, so it matches the server, and storage is read in an effect.
 *  Storage can be unavailable, so every access is guarded. */
export function ConsoleFiltersProvider({
  children,
  storageKey,
}: {
  children: ReactNode
  storageKey?: string
}) {
  const page = pageKey(useConsolePathname())
  const [openByPage, setOpenByPage] = useState<OpenByPage>({})

  useEffect(() => {
    if (storageKey !== undefined) {
      setOpenByPage(readStored(storageKey))
    }
  }, [storageKey])

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenByPage((current) => {
        const updated = { ...current, [page]: next }

        if (storageKey !== undefined) {
          writeStored(storageKey, updated)
        }

        return updated
      })
    },
    [page, storageKey]
  )
  const open = openByPage[page] ?? false
  const value = useMemo(() => ({ open, setOpen }), [open, setOpen])

  return (
    <ConsoleFiltersContext.Provider value={value}>
      {children}
    </ConsoleFiltersContext.Provider>
  )
}

/** The page is the console surface: `/runs/abc` and `/runs` share one. */
function pageKey(pathname: string) {
  return `/${pathname.split("/")[1] ?? ""}`
}

function readStored(storageKey: string): OpenByPage {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "{}"
    )

    return typeof stored === "object" && stored !== null
      ? (stored as OpenByPage)
      : {}
  } catch {
    return {}
  }
}

function writeStored(storageKey: string, openByPage: OpenByPage) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(openByPage))
  } catch {
    // Storage that refuses a write only loses the preference.
  }
}
