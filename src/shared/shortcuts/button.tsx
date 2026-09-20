import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Shortcut, shortcutAria, shortcutLabel } from "./keys"

/** An icon button for something that also has a shortcut: the tooltip names
 *  what it does and the keys that do it.
 *
 *  These buttons come and go with the layout around them. A tooltip whose
 *  button has left the layout has nothing to point at, and Popper would
 *  park it in the window's corner while it fades, so it is hidden with its
 *  button. */
export function ShortcutButton({
  keys,
  label,
  side,
  tooltip = label,
  ...props
}: Omit<ComponentProps<typeof Button>, "size" | "variant"> & {
  keys: Shortcut
  /** The button's accessible name. */
  label: string
  /** Where the tooltip goes: clear of whatever the button sits beside. */
  side: ComponentProps<typeof TooltipContent>["side"]
  /** What the tooltip says, where the name alone says too much. */
  tooltip?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-keyshortcuts={shortcutAria(keys)}
          aria-label={label}
          size="icon"
          variant="ghost"
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent
        className="flex items-center gap-1.5"
        hideWhenDetached
        side={side}
      >
        {tooltip}
        <Kbd>{shortcutLabel(keys)}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
