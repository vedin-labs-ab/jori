import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BrandIcon } from "@/shared/brand"

export function WelcomeStep({
  onStart,
  onSkip,
}: {
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <>
      <DialogHeader>
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
          <BrandIcon className="size-5" />
        </span>
        <DialogTitle>Welcome to Jori</DialogTitle>
        <DialogDescription>
          Jori works where your team already does. Point it at your website and
          it learns what your organization does for sharper, on-brand answers.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" onClick={onSkip}>
          Not now
        </Button>
        <Button onClick={onStart}>Get started</Button>
      </DialogFooter>
    </>
  )
}
