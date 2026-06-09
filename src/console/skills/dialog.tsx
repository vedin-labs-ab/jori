import { Loader2 } from "lucide-react"
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
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  skill,
  values,
}: {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {skill === undefined ? "Add skill" : "Edit skill"}
          </DialogTitle>
          <DialogDescription>
            Use a lowercase hyphenated name, a clear trigger description, and
            Markdown instructions.
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
