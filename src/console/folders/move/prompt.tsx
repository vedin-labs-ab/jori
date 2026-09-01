import { type FunctionReturnType } from "convex/server"
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
import { type api } from "../../../../convex/_generated/api"

// What a move does to an audience, said before it happens. Both directions
// get a plain sentence: people leaving the audience, and people joining it.

export type AudienceChange = NonNullable<
  FunctionReturnType<typeof api.visibility.console.moveAudience>
>

export function FilingPrompt({
  change,
  name,
  onCancel,
  onConfirm,
}: {
  change: AudienceChange
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
      open
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="wrap-anywhere">
            Move {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {describeChange(change)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Move</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function describeChange(change: AudienceChange) {
  const sentences: string[] = []

  if (change.losing > 0) {
    sentences.push(`${people(change.losing)} will lose access.`)
  }

  if (change.becomesOrganizationWide) {
    sentences.push("Everyone in the organization will be able to see it.")
  } else if (change.gaining > 0) {
    sentences.push(`${people(change.gaining)} more will be able to see it.`)
  }

  return sentences.join(" ")
}

function people(count: number) {
  return count === 1 ? "1 person" : `${count} people`
}
