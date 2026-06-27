import {
  CalendarDays,
  CircleDotDashed,
  File,
  Folder,
  GitPullRequestArrow,
  type LucideIcon,
  Mail,
  Repeat2,
  Square,
  UserRound,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type ExecutionDetail } from "../types"

type MetadataProps = {
  detail: ExecutionDetail
  surface?: string
}

type MetadataRenderer = (props: MetadataProps) => ReactNode

const metadataRenderers: Partial<
  Record<ExecutionDetail["type"], MetadataRenderer>
> = {
  calendar_event: EventDatum,
  channel: ChannelDatum,
  file: FileDatum,
  folder: FolderDatum,
  issue: IssueDatum,
  page: PageDatum,
  project: ProjectDatum,
  pull_request: PullRequestDatum,
  repository: RepositoryDatum,
  schedule: ScheduleDatum,
  sender: SenderDatum,
  status: StatusDatum,
  subject: SubjectDatum,
}

export function SourceMetadataDatum({ detail, surface }: MetadataProps) {
  const Renderer = metadataRenderers[detail.type]

  return Renderer === undefined ? null : (
    <Renderer detail={detail} surface={surface} />
  )
}

function RepositoryDatum({ detail }: MetadataProps) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground"
      title={detail.label}
    >
      <RepositoryIcon className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{repositoryLabel(detail.label)}</span>
    </span>
  )
}

function PullRequestDatum({ detail }: MetadataProps) {
  return (
    <IconDatum
      detail={{ label: issueNumberLabel(detail.label) }}
      icon={GitPullRequestArrow}
      title={detail.label}
    />
  )
}

function ChannelDatum({ detail }: MetadataProps) {
  return (
    <span
      className="inline-flex h-5 max-w-64 min-w-0 items-center rounded-md bg-primary/10 px-1.5 font-medium text-primary"
      title={detail.label}
    >
      <span className="truncate">#{channelLabel(detail.label)}</span>
    </span>
  )
}

function IssueDatum({ detail, surface }: MetadataProps) {
  if (surface !== "github") {
    return <IconDatum detail={detail} icon={CircleDotDashed} />
  }

  return (
    <IconDatum
      detail={{ label: issueNumberLabel(detail.label) }}
      icon={CircleDotDashed}
      title={detail.label}
    />
  )
}

function EventDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={CalendarDays} />
}

function FileDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={File} />
}

function FolderDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={Folder} />
}

function PageDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={File} />
}

function ProjectDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={Square} />
}

function ScheduleDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={Repeat2} />
}

function SenderDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={UserRound} />
}

function StatusDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={Square} />
}

function SubjectDatum({ detail }: MetadataProps) {
  return <IconDatum detail={detail} icon={Mail} />
}

function IconDatum({
  detail,
  icon: Icon,
  title = detail.label,
}: {
  detail: Pick<ExecutionDetail, "label">
  icon: LucideIcon
  title?: string
}) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground"
      title={title}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{detail.label}</span>
    </span>
  )
}

export function RepositoryIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-3", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M3 2.75A2.75 2.75 0 0 1 5.75 0h14.5a.75.75 0 0 1 .75.75v20.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h5.25v-4H6A1.5 1.5 0 0 0 4.5 18v.75c0 .716.43 1.334 1.05 1.605a.75.75 0 0 1-.6 1.374A3.251 3.251 0 0 1 3 18.75ZM19.5 1.5H5.75c-.69 0-1.25.56-1.25 1.25v12.651A2.989 2.989 0 0 1 6 15h13.5Z" />
      <path d="M7 18.25a.25.25 0 0 1 .25-.25h5a.25.25 0 0 1 .25.25v5.01a.25.25 0 0 1-.397.201l-2.206-1.604a.25.25 0 0 0-.294 0L7.397 23.46a.25.25 0 0 1-.397-.2v-5.01Z" />
    </svg>
  )
}

function repositoryLabel(label: string) {
  return label.split("/").filter(Boolean).at(-1) ?? label
}

function issueNumberLabel(label: string) {
  return label.match(/^#\d+/)?.[0] ?? label
}

function channelLabel(label: string) {
  return label.startsWith("#") ? label.slice(1) : label
}
