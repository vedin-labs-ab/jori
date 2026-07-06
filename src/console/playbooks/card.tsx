import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpRight,
  Cable,
  CalendarRange,
  CalendarSearch,
  ChevronDown,
  type LucideIcon,
  MailCheck,
  NotebookTabs,
  Play,
  Sunrise,
} from "lucide-react"
import { type ReactNode } from "react"
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
import { type PlaybookActionKind, type PlaybookActions } from "./enable"
import { PlaybookMeta } from "./meta"
import {
  type PlaybookEnablePlan,
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

  const plan = planPlaybookEnable(row.slots)

  if (plan.kind === "connect") {
    return (
      <Button asChild className="w-full" variant="outline">
        <Link to="/integrations">
          <Cable /> {plan.label}
        </Link>
      </Button>
    )
  }

  const pendingKind =
    actions.pending?.key === definition.key ? actions.pending.kind : undefined

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <PlanButton
        disabled={pendingKind !== undefined}
        icon={<Play />}
        label="Try once"
        onSelect={(choices) => void actions.trial(definition, choices)}
        pending={pendingKind === "trial"}
        plan={plan}
        variant="outline"
      />
      <PlanButton
        disabled={pendingKind !== undefined}
        label="Enable"
        onSelect={(choices) => void actions.enable(definition, choices)}
        pending={pendingKind === "enable"}
        plan={plan}
        variant="default"
      />
    </div>
  )
}

/** Runs `onSelect` directly, or via a provider menu when a choice remains. */
function PlanButton({
  disabled,
  icon,
  label,
  onSelect,
  pending,
  plan,
  variant,
}: {
  disabled: boolean
  icon?: ReactNode
  label: string
  onSelect: (choices: Record<string, Integration>) => void
  pending: boolean
  plan: Exclude<PlaybookEnablePlan, { kind: "connect" }>
  variant: "default" | "outline"
}) {
  const content = (
    <>
      {pending ? <Spinner /> : icon} {label}
    </>
  )

  if (plan.kind === "enable") {
    return (
      <Button
        disabled={disabled}
        onClick={() => onSelect(plan.choices)}
        variant={variant}
      >
        {content}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} variant={variant}>
          {content} <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {plan.options.map((option) => (
          <DropdownMenuItem
            key={option.label}
            onClick={() => onSelect(option.choices)}
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
  const pendingKind: PlaybookActionKind | undefined =
    actions.pending?.key === definition.key ? actions.pending.kind : undefined

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Switch
          aria-label={`${definition.title} enabled`}
          checked={active}
          disabled={pendingKind !== undefined}
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
            disabled={pendingKind !== undefined}
            onClick={() =>
              void actions.runNow(definition, enabled.automationId)
            }
            variant="ghost"
          >
            {pendingKind === "run" ? <Spinner /> : <Play />} Run now
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
