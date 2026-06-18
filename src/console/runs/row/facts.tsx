import {
  CalendarClock,
  CircleDotDashed,
  File,
  GitPullRequestArrow,
  Globe,
  Hash,
  Info,
  MessageCircleMore,
  Square,
  UserCheck,
  Wrench,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  CodeBlockBody,
  CopyButton,
  DetailFrame,
  type DetailIcon,
  DetailLink,
  DetailRow,
} from "../../shared/details"
import { SeparatorDot } from "../../shared/dot"
import { absoluteTime, absoluteUtcTime } from "../format"
import { type ExecutionDetail, type ExecutionDetailType } from "../types"
import { ExecutionToolsValue } from "./groups"
import { RepositoryIcon } from "./source"

const detailMeta = {
  channel: { icon: Hash, label: "Channel" },
  comment: { icon: MessageCircleMore, label: "Comment" },
  decision: { icon: UserCheck, label: "Decision" },
  issue: { icon: CircleDotDashed, label: "Issue" },
  message: { icon: MessageCircleMore, label: "Message" },
  next: { icon: CalendarClock, label: "Next" },
  page: { icon: File, label: "Page" },
  pull_request: { icon: GitPullRequestArrow, label: "Pull request" },
  repository: { icon: RepositoryIcon, label: "Repository" },
  status: { icon: Info, label: "Status" },
  stopped: { icon: Square, label: "Stopped" },
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
  "channel",
  "issue",
  "next",
  "page",
  "pull_request",
  "repository",
  "status",
  "tools",
  "web_search",
])

const timeOnlyFieldTypes = new Set<ExecutionDetailType>(["next"])

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
    detail.at === undefined
      ? undefined
      : usesUtcTime(detail.type)
        ? absoluteUtcTime(detail.at)
        : absoluteTime(detail.at)

  if (isPayloadDetail(detail)) {
    return <PayloadFact detail={detail} label={meta.label} time={time} />
  }

  return (
    <InlineFact
      detail={detail}
      icon={meta.icon}
      label={meta.label}
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
  label: string
  time: string | undefined
}) {
  const hasValue = !timeOnlyFieldTypes.has(detail.type)

  return (
    <DetailRow icon={icon} iconClassName="text-muted-foreground" label={label}>
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
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs",
        !compact && "py-1.5"
      )}
    >
      {children}
    </div>
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
    <DetailRow
      icon={detailMeta[detail.type].icon}
      iconClassName="text-muted-foreground"
      label={label}
    >
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
    return <ExecutionToolsValue groups={detail.groups} />
  }

  if (detail.url === undefined) {
    return (
      <span className="min-w-0 max-w-full truncate font-medium text-foreground">
        {detail.label}
      </span>
    )
  }

  return <DetailLink href={detail.url}>{detail.label}</DetailLink>
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function usesUtcTime(type: ExecutionDetailType) {
  return type === "next"
}

function detailKey(detail: ExecutionDetail) {
  return `${detail.type}:${detail.url ?? detail.label}:${detail.at ?? ""}`
}
