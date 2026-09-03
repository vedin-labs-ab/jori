import {
  CalendarClock,
  CalendarDays,
  CircleDotDashed,
  File,
  Folder,
  GitPullRequestArrow,
  Globe,
  Hash,
  Info,
  Mail,
  MessageCircleMore,
  Square,
  UserCheck,
  UserRound,
  Wrench,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CopyButton } from "../../copy"
import { SeparatorDot } from "../../dot"
import { absoluteTime, absoluteUtcTime } from "../../time"
import { ToolGroupsValue } from "../../tools/groups"
import {
  CodeBlockBody,
  DetailFrame,
  type DetailIcon,
  DetailLine,
  DetailLink,
  DetailRow,
  DetailValue,
} from "../details"
import { RunSectionLabel } from "../section"
import { type ExecutionDetail, type ExecutionDetailType } from "../types"
import { RepositoryIcon } from "./metadata"

const detailMeta = {
  calendar_event: { icon: CalendarDays, label: "Event" },
  channel: { icon: Hash, label: "Channel" },
  comment: { icon: MessageCircleMore, label: "Comment" },
  decision: { icon: UserCheck, label: "Decision" },
  email: { icon: Mail, label: "Email" },
  file: { icon: File, label: "File" },
  folder: { icon: Folder, label: "Folder" },
  issue: { icon: CircleDotDashed, label: "Issue" },
  message: { icon: MessageCircleMore, label: "Message" },
  next: { icon: CalendarClock, label: "Next" },
  page: { icon: File, label: "Page" },
  project: { icon: Square, label: "Project" },
  pull_request: { icon: GitPullRequestArrow, label: "Pull request" },
  repository: { icon: RepositoryIcon, label: "Repository" },
  schedule: { icon: CalendarClock, label: "Schedule" },
  sender: { icon: UserRound, label: "Sender" },
  status: { icon: Info, label: "Status" },
  stopped: { icon: Square, label: "Stopped" },
  subject: { icon: Mail, label: "Subject" },
  tools: { icon: Wrench, label: "Tools" },
  web_search: { icon: Globe, label: "Web search" },
} satisfies Record<
  ExecutionDetailType,
  {
    icon: DetailIcon
    label: string
  }
>

const compactFieldTypes = new Set<ExecutionDetailType>([
  "calendar_event",
  "channel",
  "email",
  "file",
  "folder",
  "issue",
  "next",
  "page",
  "project",
  "pull_request",
  "repository",
  "schedule",
  "sender",
  "status",
  "subject",
  "tools",
  "web_search",
])

export function ExecutionFacts({ details }: { details: ExecutionDetail[] }) {
  if (details.length === 0) {
    return null
  }

  return details.map((detail) => (
    <ExecutionFact detail={detail} key={detailKey(detail)} />
  ))
}

function ExecutionFact({ detail }: { detail: ExecutionDetail }) {
  const meta = detailMeta[detail.type]
  const time =
    detail.timestamp === undefined
      ? undefined
      : detail.type === "next"
        ? absoluteUtcTime(detail.timestamp)
        : absoluteTime(detail.timestamp)

  if (isPayloadDetail(detail)) {
    return <PayloadFact detail={detail} label={meta.label} time={time} />
  }

  return (
    <InlineFact
      detail={detail}
      icon={meta.icon}
      label={detailLabel(detail, meta.label)}
      time={time}
    />
  )
}

function InlineFact({
  detail,
  icon,
  label,
  time,
}: {
  detail: ExecutionDetail
  icon: DetailIcon
  label: ReactNode
  time: string | undefined
}) {
  const hasValue = detail.type !== "next"

  return (
    <DetailRow icon={icon} label={label}>
      <InlineFactContent compact={compactFieldTypes.has(detail.type)}>
        {hasValue ? <FactValue detail={detail} /> : null}
        <InlineFactTime separated={hasValue} time={time} />
      </InlineFactContent>
    </DetailRow>
  )
}

function InlineFactContent({
  children,
  compact,
}: {
  children: ReactNode
  compact: boolean
}) {
  return (
    <DetailLine className={cn(!compact && "py-1.5")}>{children}</DetailLine>
  )
}

function InlineFactTime({
  separated,
  time,
}: {
  separated: boolean
  time: string | undefined
}) {
  if (time === undefined) {
    return null
  }

  return (
    <>
      {separated ? <SeparatorDot className="text-muted-foreground/60" /> : null}
      <span className="text-muted-foreground">{time}</span>
    </>
  )
}

function PayloadFact({
  detail,
  label,
  time,
}: {
  detail: ExecutionDetail
  label: string
  time: string | undefined
}) {
  return (
    <DetailRow icon={detailMeta[detail.type].icon} label={label}>
      <DetailFrame
        action={<CopyButton label={label} value={detail.label} />}
        header={<PayloadHeader detail={detail} time={time} />}
      >
        <CodeBlockBody value={detail.label} />
      </DetailFrame>
    </DetailRow>
  )
}

function PayloadHeader({
  detail,
  time,
}: {
  detail: ExecutionDetail
  time: string | undefined
}) {
  if (detail.url === undefined && time === undefined) {
    return undefined
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {detail.url === undefined ? null : (
        <DetailLink href={detail.url}>Source</DetailLink>
      )}
      {detail.url !== undefined && time !== undefined ? (
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      ) : null}
      {time === undefined ? null : (
        <span className="shrink-0 text-muted-foreground">{time}</span>
      )}
    </div>
  )
}

function FactValue({ detail }: { detail: ExecutionDetail }) {
  if (detail.type === "tools" && detail.groups !== undefined) {
    return <ToolGroupsValue groups={detail.groups} />
  }

  if (detail.url === undefined) {
    return <DetailValue>{detail.label}</DetailValue>
  }

  return <DetailLink href={detail.url}>{detail.label}</DetailLink>
}

function detailLabel(detail: ExecutionDetail, label: string) {
  if (detail.type !== "tools") {
    return label
  }

  const count =
    detail.groups?.reduce((total, group) => total + group.tools.length, 0) ?? 0

  return <RunSectionLabel label={{ count, singular: "Tool" }} />
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function detailKey(detail: ExecutionDetail) {
  return `${detail.type}:${detail.url ?? detail.label}:${detail.timestamp ?? ""}`
}
