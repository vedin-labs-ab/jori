import {
  CircleDotDashed,
  File,
  GitPullRequestArrow,
  Globe,
  Hash,
  MessageCircleMore,
  Square,
  UserCheck,
  Wrench,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../dot"
import {
  CodeBlockBody,
  CopyButton,
  DetailFrame,
  type DetailIcon,
  DetailLink,
  DetailRow,
} from "./details"
import { absoluteTime } from "./format"
import { ProviderLogo, RepositoryIcon } from "./source"
import {
  type ExecutionDetail,
  type ExecutionDetailGroup,
  type ExecutionDetailType,
} from "./types"

const detailMeta = {
  channel: { icon: Hash, label: "Channel" },
  comment: { icon: MessageCircleMore, label: "Comment" },
  decision: { icon: UserCheck, label: "Decision" },
  issue: { icon: CircleDotDashed, label: "Issue" },
  message: { icon: MessageCircleMore, label: "Message" },
  page: { icon: File, label: "Page" },
  pull_request: { icon: GitPullRequestArrow, label: "Pull request" },
  repository: { icon: RepositoryIcon, label: "Repository" },
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
  "page",
  "pull_request",
  "repository",
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
  const time = detail.at === undefined ? undefined : absoluteTime(detail.at)

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
  return (
    <DetailRow icon={icon} iconClassName="text-muted-foreground" label={label}>
      <InlineFactContent compact={compactFieldTypes.has(detail.type)}>
        <FactValue detail={detail} />
        <InlineFactTime time={time} />
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

function InlineFactTime({ time }: { time: string | undefined }) {
  if (time === undefined) {
    return null
  }

  return (
    <>
      <SeparatorDot className="text-muted-foreground/60" />
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
    return <GroupedFactValue groups={detail.groups} />
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

function GroupedFactValue({ groups }: { groups: ExecutionDetailGroup[] }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {groups.map((group, index) => (
        <ToolGroup
          group={group}
          key={`${group.type}:${group.label}`}
          showSeparator={index > 0}
        />
      ))}
    </span>
  )
}

function ToolGroup({
  group,
  showSeparator,
}: {
  group: ExecutionDetailGroup
  showSeparator: boolean
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {showSeparator ? (
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      ) : null}
      <ProviderLogo className="size-3.5" provider={group.type} />
      <span className="shrink-0 font-medium text-foreground">
        {group.label}
      </span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 truncate text-foreground">
        {group.values.join(", ")}
      </span>
    </span>
  )
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function detailKey(detail: ExecutionDetail) {
  return `${detail.type}:${detail.url ?? detail.label}:${detail.at ?? ""}`
}
