import {
  ArrowUpRight,
  CircleDotDashed,
  File,
  GitPullRequestArrow,
  Hash,
  MessageCircleMore,
  Square,
  UserCheck,
} from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../dot"
import {
  CodeBlockBody,
  CopyButton,
  DetailFrame,
  type DetailIcon,
  DetailRow,
} from "./details"
import { absoluteTime } from "./format"
import { RepositoryIcon } from "./source"
import { type ExecutionDetail, type ExecutionDetailType } from "./types"

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
} satisfies Record<
  ExecutionDetailType,
  {
    icon: DetailIcon
    label: string
  }
>

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
    <DetailRow
      icon={meta.icon}
      iconClassName="text-muted-foreground"
      label={meta.label}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-xs">
        <FactValue detail={detail} />
        {time === undefined ? null : (
          <>
            <SeparatorDot className="text-muted-foreground/60" />
            <span className="text-muted-foreground">{time}</span>
          </>
        )}
      </div>
    </DetailRow>
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
        <FactLink href={detail.url}>Source</FactLink>
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
  if (detail.url === undefined) {
    return (
      <span className="min-w-0 max-w-full truncate font-medium text-foreground">
        {detail.label}
      </span>
    )
  }

  return <FactLink href={detail.url}>{detail.label}</FactLink>
}

function FactLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      className={cn(
        "group/fact-link inline-flex min-w-0 max-w-full gap-1.5",
        "rounded-sm font-medium text-foreground underline-offset-4",
        "transition-colors hover:underline focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "items-center"
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/fact-link:text-foreground" />
    </a>
  )
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function detailKey(detail: ExecutionDetail) {
  return `${detail.type}:${detail.url ?? detail.label}:${detail.at ?? ""}`
}
