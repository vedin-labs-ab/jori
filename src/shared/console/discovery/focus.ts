import { type ComponentProps, useRef } from "react"
import { type CommandDialog } from "@/components/ui/command"
import { type PaletteProps } from "./types"

/** Search has no DialogTrigger: shortcuts can open it from any control. */
export function usePaletteFocus(props: PaletteProps) {
  const origin = useRef<HTMLElement | null>(null)
  const navigating = useRef(false)
  const actions: PaletteProps = {
    ...props,
    onOpenChange: (open) => {
      navigating.current = false
      props.onOpenChange(open)
    },
    onOpenHit: (hit) => {
      navigating.current = true
      props.onOpenHit(hit)
    },
    onNavigate: (destination) => {
      navigating.current = true
      props.onNavigate(destination)
    },
  }
  const focus: Pick<
    ComponentProps<typeof CommandDialog>,
    "onOpenAutoFocus" | "onCloseAutoFocus"
  > = {
    onOpenAutoFocus: () => {
      origin.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      navigating.current = false
    },
    onCloseAutoFocus: (event) => {
      // Dismissal returns to the previous control. Navigation owns its focus.
      event.preventDefault()
      if (!navigating.current && origin.current?.isConnected) {
        origin.current.focus()
      }
    },
  }
  return { actions, ...focus }
}
