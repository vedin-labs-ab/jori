import { type ReactNode } from "react"
import { BrandIcon } from "@/shared/brand"
import { Prop } from "./section"

// The hero artifact: one readable morning brief, exactly what the playbook
// delivers. All prop content lives in the Copperline fiction.
export function MorningBrief() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">Milo</span>
          <span>to maya@copperline.app</span>
          <span className="ml-auto tabular-nums">08:00</span>
        </>
      }
    >
      <div className="px-5 pt-4 pb-5">
        <p className="font-medium text-sm">Morning brief: Thursday</p>
        <div className="mt-4 space-y-5">
          <BriefGroup title="Meetings · 3">
            <BriefRow
              note="Internal, no prep needed."
              time="09:30"
              title="Copperline standup"
            />
            <BriefRow
              note="Dan Okafor wants year-two pricing before their board meets. Prep note lands at 12:30."
              time="13:15"
              title="Harbor House renewal"
            />
            <BriefRow
              note="Loop scorecard is linked inside."
              time="16:00"
              title="Interview: senior backend"
            />
          </BriefGroup>
          <BriefGroup title="Needs you · 2">
            <BriefRow
              note="Jonas needs your call on timing before Monday."
              title="Stripe migration cutover"
            />
            <BriefRow
              note="Warm intro from Anna at Foundry. Worth a reply this week."
              title="Gusto partnership intro"
            />
          </BriefGroup>
          <BriefGroup title="Heads up">
            <BriefRow
              note="Review docs came back with two signatures missing."
              title="Tip-pooling certification"
            />
          </BriefGroup>
        </div>
      </div>
    </Prop>
  )
}

function BriefGroup({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-xs">{title}</p>
      <div className="mt-2 space-y-2.5">{children}</div>
    </div>
  )
}

function BriefRow({
  note,
  time,
  title,
}: {
  note: string
  time?: string
  title: string
}) {
  return (
    <div className="flex gap-3">
      {time === undefined ? null : (
        <span className="w-9 shrink-0 pt-px text-muted-foreground text-xs tabular-nums">
          {time}
        </span>
      )}
      <div>
        <p className="font-medium text-[13px] leading-snug">{title}</p>
        <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
          {note}
        </p>
      </div>
    </div>
  )
}
