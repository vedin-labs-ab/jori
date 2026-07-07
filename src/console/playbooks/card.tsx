import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  CalendarRange,
  CalendarSearch,
  type LucideIcon,
  MailCheck,
  NotebookTabs,
  Sunrise,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScopeBadge } from "../shared/details"
import { PlaybookControls, PlaybookSwitch } from "./controls"
import { type PlaybookActions } from "./enable"
import { PlaybookMeta } from "./meta"
import { type PlaybookListRow } from "./state"

const playbookIcons: Record<string, LucideIcon> = {
  "morning-brief": Sunrise,
  "meeting-prep": CalendarSearch,
  "follow-up-sweep": MailCheck,
  "week-in-review": CalendarRange,
}

export function PlaybookCard({
  actions,
  definition,
  row,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
}) {
  const Icon = playbookIcons[definition.key] ?? NotebookTabs

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <Icon className="size-4" />
          </span>
          <CardTitle>{definition.title}</CardTitle>
          <ScopeBadge scope={definition.scope} />
          {row?.enabled ? (
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <PlaybookSwitch
                actions={actions}
                definition={definition}
                enabled={row.enabled}
              />
            </span>
          ) : null}
        </div>
        <CardDescription>{definition.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <PlaybookMeta definition={definition} row={row} />
      </CardContent>
      <CardFooter className="mt-auto">
        <PlaybookControls actions={actions} definition={definition} row={row} />
      </CardFooter>
    </Card>
  )
}
