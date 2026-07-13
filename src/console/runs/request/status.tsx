import { cn } from "@/lib/utils"
import { SeparatorDot } from "../../shared/dot"
import { formatDuration } from "../../shared/time"

export function ApprovalStatusMeta({
  expiresAt,
  isVisible,
  now,
}: {
  expiresAt: number
  isVisible: boolean
  now: number
}) {
  return (
    <ExpiringStatusMeta
      expiresAt={expiresAt}
      isVisible={isVisible}
      label="Needs approval"
      now={now}
    />
  )
}

export function OfferStatusMeta({
  expiresAt,
  isVisible,
  now,
}: {
  expiresAt: number
  isVisible: boolean
  now: number
}) {
  return (
    <ExpiringStatusMeta
      expiresAt={expiresAt}
      isVisible={isVisible}
      label="Needs action"
      now={now}
    />
  )
}

function ExpiringStatusMeta({
  expiresAt,
  isVisible,
  label,
  now,
}: {
  expiresAt: number
  isVisible: boolean
  label: string
  now: number
}) {
  return (
    <span
      aria-hidden={!isVisible}
      className={cn(
        "inline-flex origin-left items-center gap-1 overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity,transform] duration-200 ease-out",
        "text-warning",
        isVisible
          ? "max-w-56 scale-x-100 opacity-100"
          : "pointer-events-none max-w-0 scale-x-95 opacity-0"
      )}
    >
      <span>{label}</span>
      <SeparatorDot />
      <span>{formatDuration(Math.max(0, expiresAt - now))}</span>
    </span>
  )
}
