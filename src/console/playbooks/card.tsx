import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { describePlaybookSchedule } from "@contracts/playbooks/schedule"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpRight,
  Cable,
  CalendarRange,
  CalendarSearch,
  ChevronDown,
  Clock,
  Globe,
  type LucideIcon,
  MailCheck,
  NotebookTabs,
  Play,
  Sunrise,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { SurfaceLogo } from "../automations/access/logo"
import { type PlaybookActions } from "./enable"
import {
  displayProviders,
  type PlaybookListRow,
  planPlaybookEnable,
} from "./state"

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
        </div>
        <CardDescription>{definition.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <PlaybookMeta definition={definition} row={row} />
      </CardContent>
      <CardFooter>
        <PlaybookAction actions={actions} definition={definition} row={row} />
      </CardFooter>
    </Card>
  )
}

function PlaybookMeta({
  definition,
  row,
}: {
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Clock className="size-3.5" />
        {describePlaybookSchedule(definition.schedule)}
      </span>
      <span className="flex items-center gap-1.5">
        {(row?.slots ?? []).flatMap(displayProviders).map((provider) => (
          <SurfaceLogo
            key={provider.integration}
            className={provider.connected ? undefined : "opacity-40"}
            integration={provider.integration}
          />
        ))}
        {definition.web ? (
          <Globe aria-label="Uses web research" className="size-3.5" />
        ) : null}
      </span>
    </div>
  )
}

function PlaybookAction({
  actions,
  definition,
  row,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
}) {
  if (row === undefined) {
    return <Skeleton className="h-7 w-full" />
  }

  if (row.enabled !== null) {
    return (
      <EnabledControls
        actions={actions}
        definition={definition}
        enabled={row.enabled}
      />
    )
  }

  return (
    <EnableButton
      actions={actions}
      definition={definition}
      pending={actions.pendingKey === definition.key}
      slots={row.slots}
    />
  )
}

function EnableButton({
  actions,
  definition,
  pending,
  slots,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  pending: boolean
  slots: PlaybookListRow["slots"]
}) {
  const plan = planPlaybookEnable(slots)

  if (plan.kind === "connect") {
    return (
      <Button asChild className="w-full" variant="outline">
        <Link to="/integrations">
          <Cable /> {plan.label}
        </Link>
      </Button>
    )
  }

  if (plan.kind === "enable") {
    return (
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => void actions.enable(definition, plan.choices)}
      >
        {pending ? <Spinner /> : null} Enable
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full" disabled={pending}>
          {pending ? <Spinner /> : null} Enable <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {plan.options.map((option) => (
          <DropdownMenuItem
            key={option.label}
            onClick={() => void actions.enable(definition, option.choices)}
          >
            Use {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EnabledControls({
  actions,
  definition,
  enabled,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  enabled: NonNullable<PlaybookListRow["enabled"]>
}) {
  const active = enabled.status === "active"
  const pending = actions.pendingKey === definition.key

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Switch
          aria-label={`${definition.title} enabled`}
          checked={active}
          disabled={pending}
          onCheckedChange={(checked) =>
            void actions.setPaused(definition, enabled.automationId, !checked)
          }
        />
        <span className="text-xs text-muted-foreground">
          {active ? "On" : "Paused"}
        </span>
      </div>
      <div className="flex items-center">
        {active ? (
          <Button
            disabled={pending}
            onClick={() =>
              void actions.runNow(definition, enabled.automationId)
            }
            variant="ghost"
          >
            {pending ? <Spinner /> : <Play />} Run now
          </Button>
        ) : null}
        <Button asChild size="icon" title="View automation" variant="ghost">
          <Link to="/automations">
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}
