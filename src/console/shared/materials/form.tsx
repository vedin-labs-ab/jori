import { type FormEvent, type ReactNode } from "react"
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
