import { type ReactNode } from "react"

export const appRailButtonClassName =
  "gap-0 overflow-hidden rounded-l-none rounded-r-md px-1 opacity-80 shadow-sm transition-[gap,opacity] duration-150 ease-out focus-visible:gap-1 focus-visible:opacity-100 group-hover/action:gap-1 group-hover/action:opacity-100"

export function AppRailLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-150 ease-out group-focus-visible/button:max-w-12 group-focus-visible/button:opacity-100 group-hover/action:max-w-12 group-hover/action:opacity-100">
      {children}
    </span>
  )
}
