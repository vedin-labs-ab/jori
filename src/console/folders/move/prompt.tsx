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
// A folder's sentences name its contents, because a folder hands its whole
// subtree to whoever the move lets in.

export type AudienceChange = NonNullable<
  FunctionReturnType<typeof api.visibility.console.moveAudience>
>

type MovedKind = "folder" | "resource"

const wording: Record<MovedKind, { losing: string; seeing: string }> = {
  folder: {
    losing: "will lose access to this folder and its contents.",
    seeing: "will be able to see this folder and everything in it.",
  },
  resource: {
    losing: "will lose access.",
    seeing: "will be able to see it.",
  },
}

export function MovePrompt({
  change,
  kind,
  name,
  onCancel,
  onConfirm,
}: {
  change: AudienceChange
  kind: MovedKind
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
            {describeChange(change, kind)}
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

function describeChange(change: AudienceChange, kind: MovedKind) {
  const words = wording[kind]
  const sentences: string[] = []

  if (change.losing > 0) {
    sentences.push(`${people(change.losing)} ${words.losing}`)
  }

  if (change.becomesOrganizationWide) {
    sentences.push(`Everyone in the organization ${words.seeing}`)
  } else if (change.gaining > 0) {
    sentences.push(`${people(change.gaining)} more ${words.seeing}`)
  }

  return sentences.join(" ")
}

function people(count: number) {
  return count === 1 ? "1 person" : `${count} people`
}
