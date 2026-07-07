import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Cable, ChevronDown, Play } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type PlaybookActionKind, type PlaybookActions } from "./enable"
import {
  type PlaybookEnablePlan,
  type PlaybookListRow,
  planPlaybookEnable,
} from "./state"

export function PlaybookControls({
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

  const pendingKind = pendingActionKind(actions, definition)

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

/** Header on/off switch for an enabled playbook. */
export function PlaybookSwitch({
  actions,
  definition,
  enabled,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  enabled: NonNullable<PlaybookListRow["enabled"]>
}) {
  const active = enabled.status === "active"
  const pendingKind = pendingActionKind(actions, definition)

  return (
    <>
      <span className="text-xs text-muted-foreground">
        {active ? "On" : "Paused"}
      </span>
      <Switch
        aria-label={`${definition.title} enabled`}
        checked={active}
        disabled={pendingKind !== undefined}
        onCheckedChange={(checked) =>
          void actions.setPaused(definition, enabled.automationId, !checked)
        }
      />
    </>
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
  const pendingKind = pendingActionKind(actions, definition)

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <Button
        className="-ml-2"
        disabled={pendingKind !== undefined}
        onClick={() => void actions.runNow(definition, enabled.automationId)}
        variant="ghost"
      >
        {pendingKind === "run" ? <Spinner /> : <Play />} Run now
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon" variant="ghost">
            <Link aria-label="View automation" to="/automations">
              <ArrowUpRight />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>View automation</TooltipContent>
      </Tooltip>
    </div>
  )
}

function pendingActionKind(
  actions: PlaybookActions,
  definition: PlaybookDefinition
): PlaybookActionKind | undefined {
  return actions.pending?.key === definition.key
    ? actions.pending.kind
    : undefined
}
