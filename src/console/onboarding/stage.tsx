import { type ReactNode, useEffect, useRef } from "react"
import { Progress } from "@/components/ui/progress"
import { BrandFace, type BrandMood } from "@/shared/brand"

/** Where every onboarding step stands: a narrow column centered in the main
 *  view, under Jori's mark and a quiet measure of how far along this is.
 *  The mark is the one playful thing here. It idles through the questions,
 *  works while Jori reads, and settles when the organization is ready.
 *
 *  A step replaces the one before it, button and all, which would leave
 *  the keyboard and a screen reader nowhere. So as a step arrives, focus
 *  goes to its heading, unless the step put it in a field of its own. */
export function OnboardingStage({
  children,
  footer,
  mood,
  position,
  stepKey,
  total,
}: {
  children: ReactNode
  /** Shown under the step, outside its entrance. */
  footer?: ReactNode
  mood: BrandMood
  position: number
  stepKey: string
  total: number
}) {
  const step = useRef<HTMLDivElement>(null)
  const opened = useRef(stepKey)

  useEffect(() => {
    if (opened.current === stepKey) {
      return
    }

    opened.current = stepKey

    if (!step.current?.contains(document.activeElement)) {
      step.current?.querySelector("h1")?.focus()
    }
  }, [stepKey])

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto p-6">
      <div className="m-auto grid w-full max-w-sm gap-8">
        <div className="flex items-center justify-between gap-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <BrandFace className="size-5" mood={mood} />
          </span>
          <Progress
            aria-label={`Step ${position} of ${total}`}
            className="w-16"
            value={(position / total) * 100}
          />
        </div>
        <div
          className="motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:animate-in motion-safe:duration-300"
          key={stepKey}
          ref={step}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  )
}
