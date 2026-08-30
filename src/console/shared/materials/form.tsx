import { ChevronDown } from "lucide-react"
import { type FormEvent, type ReactNode } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/** Form wrapper for dialog fields and footer: Enter in a single-line input
 *  submits through the same handler as the primary button, and Enter in a
 *  textarea keeps inserting newlines. Pass the primary button's `disabled`
 *  expression so Enter stays inert exactly when the button is; keep the
 *  primary button `type="submit"` and every other button `type="button"`.
 *  Omit `onSubmit` for editors that deliberately stay button-only: the form
 *  semantics remain, and Enter never submits. */
export function DialogForm({
  children,
  className,
  disabled = false,
  onSubmit,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onSubmit?: () => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!disabled) {
      onSubmit?.()
    }
  }

  return (
    <form className={cn("grid gap-4", className)} onSubmit={handleSubmit}>
      {children}
    </form>
  )
}

/** Collapsed-by-default home for a create flow's secondary fields — folder,
 *  sharing, and the like — so the dialog leads with what actually defines
 *  the material. Callers pass whichever fields their material carries. */
export function AdvancedSettings({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="grid gap-4">
      <CollapsibleTrigger className="flex w-fit items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground [&[data-state=open]>svg]:rotate-180">
        Advanced settings
        <ChevronDown className="size-3.5 transition-transform duration-200 ease-out" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4">{children}</CollapsibleContent>
    </Collapsible>
  )
}
