import { Definition, Section } from "../section"

export function ScopeSection() {
  return (
    <Section
      lede="Milo works with the accounts you connect, with the access you grant. Nothing else."
      title="It acts as you, never past you"
    >
      <FactList>
        <Definition term="Your accounts, your identity">
          Milo acts through the accounts you connect, as you. Disconnect an
          integration and its access ends with it.
        </Definition>
        <Definition term="Personal and organization">
          Work that touches your own tools stays scoped to you. Organization
          work is visible to the whole team, so nothing shared happens out of
          sight.
        </Definition>
        <Definition term="Subtasks inherit less, never more">
          Milo can split a job into subtasks. A subtask can never hold access
          its parent lacks.
        </Definition>
      </FactList>
    </Section>
  )
}

export function BoundariesSection() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Not settings, and not promises. The way it's built."
      title="Some things are structural"
    >
      <FactList>
        <Definition term="Unattended runs can't use ask-first tools">
          Scheduled and event runs never touch a tool you've gated. Anything
          that needs your sign-off waits for a run with you in it.
        </Definition>
        <Definition term="The web is off until you turn it on">
          Web search and fetch are granted per playbook and per automation,
          never assumed.
        </Definition>
        <Definition term="What Milo reads is evidence, not instructions">
          Text inside emails, pages, and tickets can't redirect Milo, grant
          permission, or change the task. Only you can.
        </Definition>
        <Definition term="Share links are view-only and mortal">
          Artifact links carry their secret in the URL fragment, so it stays out
          of server logs. They expire on a clock you choose, and you can revoke
          them anytime.
        </Definition>
      </FactList>
    </Section>
  )
}

export function DataSection() {
  return (
    <Section
      lede="Short list, plain words."
      title="Where your data goes, and doesn't"
    >
      <FactList>
        <Definition term="Access you grant">
          Milo reads through the OAuth grants you approve, integration by
          integration. Revoke a grant and the access is gone.
        </Definition>
        <Definition term="A short list of subprocessors">
          Convex stores the data, including sign-in sessions. Trigger.dev
          executes runs. Resend delivers invitation emails. Model calls go
          through OpenRouter to the model provider. That's the list.
        </Definition>
        <Definition term="Never used for training">
          Your data is never used to train models.
        </Definition>
        <Definition term="GDPR">
          Milo is built to operate in line with GDPR. For a data processing
          agreement, write to security@milo.app.
        </Definition>
        {/* TODO: add the retention commitment here once decided. */}
        <Definition term="Audits">
          Independent security audits are planned. We'll publish the results
          when they're done.
        </Definition>
      </FactList>
    </Section>
  )
}

function FactList({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">{children}</dl>
}
