import { type Region } from "@contracts/region"
import { CheckIcon, XIcon } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { marketingUrl } from "@/shared/region/paths"
import { type AnalyticsChoice } from "./consent"
import {
  PrivacyContext,
  useAnalyticsConsent,
  usePrivacyChoices,
} from "./context"

export function PrivacyChoices({ className }: { className?: string }) {
  const privacy = usePrivacyChoices()
  if (privacy === undefined) {
    return null
  }
  return (
    <Button
      className={className}
      onClick={privacy.open}
      type="button"
      variant="link"
    >
      Privacy choices
    </Button>
  )
}

/** The ask and the saved answer for one region; without one, nothing is
 *  asked and Privacy choices stays out of the page. */
export function PrivacyProvider({
  children,
  region,
}: {
  children: ReactNode
  region: Region | undefined
}) {
  const {
    choice,
    ready,
    choose: saveChoice,
    allowsAnalytics,
  } = useAnalyticsConsent(region)
  const [editing, setEditing] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLElement>(null)

  useEffect(() => {
    if (editing) {
      heading.current?.focus()
    }
  }, [editing])

  function close() {
    setEditing(false)
    trigger.current?.focus()
  }

  function choose(value: AnalyticsChoice) {
    saveChoice(value)
    close()
  }

  const value =
    region !== undefined && ready
      ? {
          choice,
          allowsAnalytics,
          open: () => {
            trigger.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
            setEditing(true)
          },
        }
      : undefined

  return (
    <PrivacyContext value={value}>
      {children}
      {value !== undefined && (choice === undefined || editing) ? (
        <ConsentPanel
          choice={choice}
          heading={heading}
          onChoose={choose}
          onClose={choice === undefined ? undefined : close}
        />
      ) : null}
    </PrivacyContext>
  )
}

/** The first ask offers no way out but a choice, since dismissing is neither
 * consent nor a decline. Reopened later, it shows the saved choice and closes. */
function ConsentPanel({
  choice,
  heading,
  onChoose,
  onClose,
}: {
  choice: AnalyticsChoice | undefined
  heading: React.RefObject<HTMLHeadingElement | null>
  onChoose: (choice: AnalyticsChoice) => void
  onClose: (() => void) | undefined
}) {
  return (
    <section
      aria-labelledby="analytics-choice-title"
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-lg border bg-background p-5 shadow-lg sm:right-auto sm:w-96",
        "motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:animate-in motion-safe:duration-300"
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onClose !== undefined) {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        <BrandIcon className="size-5" />
        <h2
          className="flex-1 font-semibold text-base outline-none"
          id="analytics-choice-title"
          ref={heading}
          tabIndex={-1}
        >
          Optional analytics
        </h2>
        {onClose === undefined ? null : (
          <Button
            aria-label="Close"
            className="-m-2"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </div>
      <p className="mt-2.5 text-muted-foreground text-sm/relaxed">
        Can we use PostHog to see which parts of Jori get used? It doesn't learn
        who you are and never sees your chats or files. Jori works the same
        either way.
      </p>
      <p className="mt-2 text-muted-foreground/80 text-xs/relaxed">
        You can change your mind later. More in the{" "}
        <a
          className="underline underline-offset-2"
          href={marketingUrl("/privacy")}
          rel="noreferrer"
          target="_blank"
        >
          privacy policy
        </a>
        .
      </p>
      <div className="mt-4 grid gap-2 min-[400px]:grid-cols-2">
        <ChoiceButton
          current={choice === "declined"}
          icon={<XIcon aria-hidden="true" className="text-destructive" />}
          onClick={() => onChoose("declined")}
        >
          Decline
        </ChoiceButton>
        <ChoiceButton
          current={choice === "accepted"}
          icon={<CheckIcon aria-hidden="true" className="text-primary" />}
          onClick={() => onChoose("accepted")}
        >
          Accept
        </ChoiceButton>
      </div>
    </section>
  )
}

function ChoiceButton({
  children,
  current,
  icon,
  onClick,
}: {
  children: ReactNode
  current: boolean
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      aria-pressed={current}
      onClick={onClick}
      size="xl"
      type="button"
      variant="outline"
    >
      {current ? icon : null}
      {children}
    </Button>
  )
}
