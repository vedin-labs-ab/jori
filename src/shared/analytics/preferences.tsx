import { type ReactNode, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
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

export function PrivacyProvider({
  children,
  enabled,
}: {
  children: ReactNode
  enabled: boolean
}) {
  const {
    choice,
    ready,
    choose: saveChoice,
    allowsAnalytics,
  } = useAnalyticsConsent()
  const [editing, setEditing] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLElement>(null)

  useEffect(() => {
    if (editing) {
      heading.current?.focus()
    }
  }, [editing])

  function choose(value: AnalyticsChoice) {
    saveChoice(value)
    setEditing(false)
    trigger.current?.focus()
  }

  const value =
    enabled && ready
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
        <ConsentPanel choice={choice} onChoose={choose} heading={heading} />
      ) : null}
    </PrivacyContext>
  )
}

function ConsentPanel({
  choice,
  onChoose,
  heading,
}: {
  choice: AnalyticsChoice | undefined
  onChoose: (choice: AnalyticsChoice) => void
  heading: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <section
      aria-labelledby="analytics-choice-title"
      className="fixed inset-x-4 bottom-4 z-50 max-h-[calc(100svh-2rem)] overflow-y-auto rounded-lg border bg-background p-5 shadow-lg sm:right-auto sm:w-96"
    >
      <h2
        className="font-medium text-sm outline-none"
        id="analytics-choice-title"
        ref={heading}
        tabIndex={-1}
      >
        Optional analytics
      </h2>
      <p className="mt-2 text-muted-foreground text-sm/relaxed">
        Can we use PostHog to understand which pages people use? Analytics uses
        browser identifiers, without chat or file content. Jori works either
        way.
      </p>
      <p className="mt-2 text-muted-foreground text-xs/relaxed">
        We remember this choice on this site for 180 days. Change it through
        Privacy choices in the footer or your account menu.{" "}
        <a
          className="underline underline-offset-2"
          href={marketingUrl("/privacy")}
          target="_blank"
          rel="noreferrer"
        >
          Privacy policy
        </a>
        .
      </p>
      {choice === undefined ? null : (
        <p className="mt-2 text-sm">
          Analytics is {choice === "accepted" ? "on" : "off"}.
        </p>
      )}
      <div className="mt-4 grid gap-2 min-[400px]:grid-cols-2">
        <Button
          onClick={() => onChoose("declined")}
          size="xl"
          type="button"
          variant="outline"
        >
          Decline analytics
        </Button>
        <Button
          onClick={() => onChoose("accepted")}
          size="xl"
          type="button"
          variant="outline"
        >
          Accept analytics
        </Button>
      </div>
    </section>
  )
}
