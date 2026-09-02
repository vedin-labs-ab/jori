import { ModeMatrix } from "../examples/modes"
import { Jori, Section } from "../section"

export function ModesSection() {
  return (
    <Section
      lede={
        <>
          Allowed, ask first, or blocked: you set what <Jori tilt="right" /> can
          do on their own, per action, per account.
        </>
      }
      title="Every tool has a mode"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Some tools read, some act. Reading is how Jori stays useful; acting
            is where you set the terms. Modes live in the console, and a change
            takes effect on the next run.
          </p>
          <p className="max-w-xl">
            Answering where it's asked stays on, so Jori can always report back
            in the thread that called them. Everything else is yours to set.
          </p>
        </div>
        <ModeMatrix
          label={
            <>
              <span className="font-medium text-foreground">Permissions</span>
              <span>a few of the modes you set</span>
            </>
          }
          rows={[
            { mode: "allowed", tool: "google_gmail_search_threads" },
            { mode: "allowed", tool: "google_gmail_create_draft" },
            { mode: "prompted", tool: "google_gmail_send_message" },
            { mode: "allowed", tool: "google_calendar_create_event" },
            { mode: "prompted", tool: "github_create_pull_request" },
            { mode: "blocked", tool: "web_search" },
          ]}
        />
      </div>
    </Section>
  )
}
