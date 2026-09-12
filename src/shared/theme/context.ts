import { createContext, useContext } from "react"
import { type Theme } from "./scheme"

export type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Outside the provider, in fixtures and tests, the page is on the default
 *  and the choice goes nowhere. */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
