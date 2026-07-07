import { type Integration } from "@contracts/integrations"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import { Cable, ChevronDown, Play } from "lucide-react"
import { type ReactNode, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { type PlaybookActions, pendingActionKind } from "./enable"
import {
  type PlaybookEnablePlan,
  type PlaybookListRow,
  planPlaybookEnable,
} from "./state"

type PlaybookChoices = Record<string, Integration>

/** Try-once and enable actions for a playbook that isn't set up yet. */
export function SetupControls({
  actions,
  definition,
  row,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow
}) {
  const [trialChoices, setTrialChoices] = useState<PlaybookChoices>()
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
        onSelect={setTrialChoices}
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
      <TrialDialog
        choices={trialChoices}
        definition={definition}
        onConfirm={(choices) => void actions.trial(definition, choices)}
        onDismiss={() => setTrialChoices(undefined)}
      />
    </div>
  )
}

function TrialDialog({
  choices,
  definition,
  onConfirm,
  onDismiss,
}: {
  choices: PlaybookChoices | undefined
  definition: PlaybookDefinition
  onConfirm: (choices: PlaybookChoices) => void
  onDismiss: () => void
}) {
  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          onDismiss()
        }
      }}
      open={choices !== undefined}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run {definition.title} once?</AlertDialogTitle>
          <AlertDialogDescription>
            Milo runs this playbook right away with the tools listed on the
            card. Nothing is enabled — it won't run again on its own.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (choices !== undefined) {
                onConfirm(choices)
              }
            }}
          >
            Run once
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  onSelect: (choices: PlaybookChoices) => void
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
