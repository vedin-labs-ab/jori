import {
  BadgeCheck,
  Ban,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  GitBranch,
  Globe,
  KeyRound,
  Link2,
  Share2,
  Users,
} from "lucide-react"
import { Definition, Section } from "../section"
import { Subprocessors } from "./subprocessors"

export function ScopeSection() {
  return (
    <Section
      lede="Jori works with the accounts you connect, with the access you grant. Nothing else."
      support
      title="It acts as you, never past you"
    >
      <FactList>
        <Definition icon={Fingerprint} term="Your accounts, your identity">
          Jori acts through the accounts you connect, as you. Disconnect an
          integration and its access ends with it.
        </Definition>
        <Definition icon={Users} term="Personal and organization">
          Work that touches your own tools stays scoped to you. Organization
          work is visible to the whole team, so nothing shared happens out of
          sight.
        </Definition>
        <Definition icon={GitBranch} term="Subtasks inherit less, never more">
          Jori can split a job into subtasks. A subtask can never hold access
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
      support
      title="Some things are structural"
    >
      <FactList>
        <Definition
          icon={CalendarClock}
          term="Unattended runs can't use ask-first tools"
        >
          Scheduled and event runs never touch a tool you've gated. Anything
          that needs your sign-off waits for a run with you in it.
        </Definition>
        <Definition icon={Globe} term="The web is off until you turn it on">
          Web search and fetch are granted per job, never assumed.
        </Definition>
        <Definition
          icon={FileSearch}
          term="What Jori reads is evidence, not instructions"
        >
          Text inside emails, pages, and tickets can't redirect Jori, grant
          permission, or change the task. Only you can.
        </Definition>
        <Definition icon={Link2} term="Share links are view-only and mortal">
          Page links carry their secret in the URL fragment, so it stays out of
          server logs. They expire on a clock you choose, and you can revoke
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
      support
      title="Where your data goes, and doesn't"
    >
      <FactList>
        <Definition icon={KeyRound} term="Access you grant">
          Jori reads through the OAuth grants you approve, integration by
          integration. Revoke a grant and the access is gone.
        </Definition>
        <Definition icon={Share2} term="A short list of subprocessors">
          <Subprocessors />
        </Definition>
        <Definition icon={Ban} term="Never used for training">
          Your data is never used to train models.
        </Definition>
        <Definition icon={BadgeCheck} term="GDPR">
          Jori is built to operate in line with GDPR. Data processing agreements
          are available from launch.
        </Definition>
        {/* TODO: add the retention commitment here once decided. */}
        <Definition icon={ClipboardCheck} term="Audits">
          Independent security audits are planned. We'll publish the results
          when they're done.
        </Definition>
      </FactList>
    </Section>
  )
}

function FactList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-x-10 gap-y-8">
      {children}
    </dl>
  )
}
