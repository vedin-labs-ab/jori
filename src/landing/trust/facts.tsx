import {
  BadgeCheck,
  Ban,
  CalendarClock,
  ClipboardCheck,
  Code2,
  FileSearch,
  Fingerprint,
  FolderTree,
  GitBranch,
  Globe,
  Link2,
  MapPin,
  Share2,
  Users,
} from "lucide-react"
import { Definition, Jori, Region, Section } from "../section"
import { Subprocessors } from "./subprocessors"

export function ScopeSection() {
  return (
    <Section
      lede={
        <>
          <Jori tilt="left" /> works with the accounts you connect, with the
          access you grant. Nothing else.
        </>
      }
      support
      title="Acts as you, never past you"
    >
      <FactList>
        <Definition icon={Fingerprint} term="Your accounts, as you">
          Every action goes through an OAuth grant you approved, integration by
          integration. Revoke a grant and the access ends with it.
        </Definition>
        <Definition icon={Users} term="Your context, or the organization's">
          Work you keep to yourself runs with your integrations. Work shared
          past you runs with the organization's, never your own.
        </Definition>
        <Definition icon={GitBranch} term="Subtasks inherit less, never more">
          Jori can split a job into subtasks. A subtask can never hold access
          its parent lacks.
        </Definition>
      </FactList>
    </Section>
  )
}

export function VisibilitySection() {
  return (
    <Section
      lede="Only you, specific people, specific teams, or everyone in the organization. Set it on a folder or an item, and the tree enforces it."
      support
      title="Who sees what"
    >
      <FactList>
        <Definition icon={FolderTree} term="The folder is the ceiling">
          Nothing inside a folder reaches further than the folder does. Sharing
          a table wider than its folder changes nothing until the folder allows
          it.
        </Definition>
        <Definition icon={Link2} term="Links carry their own secret">
          A share link opens a read-only page. Its secret rides in the URL
          fragment, it expires on a clock you choose, and you can revoke it any
          time.
        </Definition>
      </FactList>
    </Section>
  )
}

export function BoundariesSection() {
  return (
    <Section
      lede={
        <>
          Not settings, and not promises. The way <Jori tilt="right" /> is
          built.
        </>
      }
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
        <Definition icon={MapPin} term="Stored in your region">
          Jori keeps your workspace data, web searches and code execution in
          your chosen <Region region="eu" /> or <Region region="us" /> region.
          Page fetching and billing use global services.
        </Definition>
        <Definition icon={Share2} term="Subprocessors and service providers">
          <Subprocessors />
        </Definition>
        <Definition icon={Ban} term="Never used for training">
          Your data is never used to train models.
        </Definition>
        <Definition icon={BadgeCheck} term="GDPR">
          Jori is built to comply with GDPR. Data processing agreements are
          available from launch.
        </Definition>
        {/* TODO: add the retention commitment here once decided. */}
        <Definition icon={ClipboardCheck} term="Audits">
          Independent security audits are planned. We'll publish the results
          when they're done.
        </Definition>
        <Definition icon={Code2} term="Source-available">
          Review Jori's application code, prompts, and skills on{" "}
          <a
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            href="https://github.com/vedin-labs-ab/jori"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          , including how permissions and execution are implemented. Commercial
          restrictions apply.
        </Definition>
      </FactList>
    </Section>
  )
}

function FactList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-x-12 gap-y-8">
      {children}
    </dl>
  )
}
