import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import {
  CalendarSearch,
  type LucideIcon,
  Newspaper,
  NotebookTabs,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlaybookControls, PlaybookSwitch } from "./controls"
import { type PlaybookActions } from "./enable"
import { PlaybookIcon, PlaybookMeta } from "./meta"
import { type PlaybookListRow } from "./state"

const playbookIcons: Record<string, LucideIcon> = {
  preread: Newspaper,
  "meeting-briefing": CalendarSearch,
}

export function PlaybookCard({
  actions,
  definition,
  row,
  organizationId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
  organizationId: string
}) {
  const Icon = playbookIcons[definition.key] ?? NotebookTabs

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <PlaybookIcon icon={Icon} />
          <CardTitle>{definition.title}</CardTitle>
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
        <PlaybookControls
          actions={actions}
          definition={definition}
          row={row}
          organizationId={organizationId}
        />
      </CardFooter>
    </Card>
  )
}
