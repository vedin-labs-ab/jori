import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type Skill } from "./types"

export function SkillViewDialog({
  onOpenChange,
  skill,
}: {
  onOpenChange: (open: boolean) => void
  skill: Skill | undefined
}) {
  return (
    <Dialog open={skill !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{skill?.name ?? "Skill"}</DialogTitle>
          {skill === undefined ? null : (
            <DialogDescription>{skill.description}</DialogDescription>
          )}
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs/relaxed">
          {skill?.body}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
