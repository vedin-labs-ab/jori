import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRetained } from "../shared/retain"
import { type Skill } from "./types"

export function SkillViewDialog({
  onOpenChange,
  skill,
}: {
  onOpenChange: (open: boolean) => void
  skill: Skill | undefined
}) {
  const shown = useRetained(skill)

  return (
    <Dialog open={skill !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{shown?.name ?? "Skill"}</DialogTitle>
          {shown === undefined ? null : (
            <DialogDescription>{shown.description}</DialogDescription>
          )}
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs/relaxed">
          {shown?.body}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
