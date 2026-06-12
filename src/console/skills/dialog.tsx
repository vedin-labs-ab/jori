import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type Skill, type SkillFormValues } from "./types"

export function SkillDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  skill,
  values,
}: {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: SkillFormValues) => void
  skill: Skill | undefined
  values: SkillFormValues
}) {
  function updateValue(name: keyof SkillFormValues, value: string) {
    onValuesChange({ ...values, [name]: value })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSaving) {
          return
        }

        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {skill === undefined ? "Add skill" : "Edit skill"}
          </DialogTitle>
          <DialogDescription>
            Name the skill, describe when Milo should use it, and write the
            instructions in Markdown.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              placeholder="customer-support"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skill-description">Description</Label>
            <Textarea
              id="skill-description"
              value={values.description}
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
              placeholder="Use when Milo is handling customer support requests."
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skill-body">Instructions</Label>
            <Textarea
              id="skill-body"
              className="min-h-56 font-mono text-xs"
              value={values.body}
              onChange={(event) => updateValue("body", event.target.value)}
              placeholder={[
                "# Customer Support",
                "",
                "- Start with the customer's goal.",
                "- Keep replies concise and specific.",
              ].join("\n")}
            />
          </div>
        </div>

        {error === undefined ? null : (
          <Alert variant="destructive">
            <AlertTitle>Could not save skill</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
