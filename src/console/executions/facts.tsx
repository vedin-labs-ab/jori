import {
  ArrowUpRight,
  CircleDotDashed,
  File,
  GitBranch,
  Hash,
  type LucideIcon,
  MessageCircleMore,
  MessageSquareText,
  Square,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SeparatorDot } from "../dot"
import { DetailRow } from "./details"
import { absoluteTime } from "./format"
import { type ExecutionDetail, type ExecutionDetailType } from "./types"

const detailMeta = {
  channel: { icon: Hash, label: "Channel" },
  comment: { icon: MessageCircleMore, label: "Comment" },
  decision: { icon: UserCheck, label: "Decision" },
  issue: { icon: CircleDotDashed, label: "Issue" },
  message: { icon: MessageSquareText, label: "Message" },
  page: { icon: File, label: "Page" },
  repository: { icon: GitBranch, label: "Repository" },
  stopped: { icon: Square, label: "Stopped" },
} satisfies Record<
  ExecutionDetailType,
  {
    icon: LucideIcon
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
  const isPayload = isPayloadDetail(detail)

  return (
    <DetailRow
      icon={meta.icon}
      iconClassName="text-muted-foreground"
      label={meta.label}
    >
      <div
        className={cn(
          "min-w-0 text-xs",
          isPayload
            ? "rounded-md bg-muted px-2.5 py-2"
            : "flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5"
        )}
      >
        <FactValue detail={detail} isPayload={isPayload} />
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

function FactValue({
  detail,
  isPayload,
}: {
  detail: ExecutionDetail
  isPayload: boolean
}) {
  if (detail.url === undefined) {
    return (
      <span
        className={cn(
          "min-w-0 max-w-full font-medium text-foreground",
          isPayload
            ? "block whitespace-pre-wrap break-words leading-relaxed"
            : "truncate"
        )}
      >
        {detail.label}
      </span>
    )
  }

  return (
    <a
      className={cn(
        "group/fact-link inline-flex min-w-0 max-w-full gap-1.5",
        "rounded-sm font-medium text-foreground underline-offset-4",
        "transition-colors hover:underline focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isPayload ? "items-start" : "items-center"
      )}
      href={detail.url}
      rel="noreferrer"
      target="_blank"
    >
      <span
        className={cn(
          "min-w-0",
          isPayload
            ? "whitespace-pre-wrap break-words leading-relaxed"
            : "truncate"
        )}
      >
        {detail.label}
      </span>
      <ArrowUpRight
        className={cn(
          "size-3 shrink-0 text-muted-foreground transition-colors group-hover/fact-link:text-foreground",
          isPayload && "mt-0.5"
        )}
      />
    </a>
  )
}

function isPayloadDetail(detail: ExecutionDetail) {
  return detail.type === "comment" || detail.type === "message"
}

function detailKey(detail: ExecutionDetail) {
  return `${detail.type}:${detail.url ?? detail.label}:${detail.at ?? ""}`
}
