import { createContext } from "react"

export const SearchContext = createContext<((open: boolean) => void) | null>(
  null
)
