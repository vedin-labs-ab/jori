import { createContext, useContext, useState } from "react"

export type ConsoleFiltersState = {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Whether the filter panel is open, held by the frame so it survives
 *  moving between console pages. */
export const ConsoleFiltersContext = createContext<ConsoleFiltersState | null>(
  null
)

/** The panel's open state: the frame's when a frame provides one, else a
 *  local one so a filtered view still works rendered on its own. */
export function useConsoleFilters(): ConsoleFiltersState {
  const provided = useContext(ConsoleFiltersContext)
  const [open, setOpen] = useState(false)

  return provided ?? { open, setOpen }
}
