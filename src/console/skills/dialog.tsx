import {
  type Integration,
  integrationLabel,
  integrations,
} from "@contracts/integrations"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

type SkillTextFieldName = Exclude<
  keyof SkillFormValues,
  "associatedIntegrations"
>

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
  function updateValue(name: SkillTextFieldName, value: string) {
    onValuesChange({ ...values, [name]: value })
  }

  function updateAssociatedIntegration(
    integration: Integration,
    isSelected: boolean
  ) {
    onValuesChange({
      ...values,
      associatedIntegrations: isSelected
        ? [...values.associatedIntegrations, integration]
        : values.associatedIntegrations.filter((item) => item !== integration),
    })
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
            Name the skill, choose a category, describe when Milo should use it,
            and write the instructions in Markdown.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <SkillTextField
            id="skill-name"
            label="Name"
            onChange={(value) => updateValue("name", value)}
            placeholder="customer-support"
            value={values.name}
          />
          <SkillTextField
            id="skill-category"
            label="Category"
            onChange={(value) => updateValue("category", value)}
            placeholder="Support"
            required
            value={values.category}
          />
          <AssociatedIntegrationsField
            selectedIntegrations={values.associatedIntegrations}
            onSelectionChange={updateAssociatedIntegration}
          />
          <SkillDescriptionField
            onChange={(value) => updateValue("description", value)}
            value={values.description}
          />
          <SkillInstructionsField
            onChange={(value) => updateValue("body", value)}
            value={values.body}
          />
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

function SkillTextField({
  id,
  label,
  onChange,
  placeholder,
  required,
  value,
}: {
  id: string
  label: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

function AssociatedIntegrationsField({
  onSelectionChange,
  selectedIntegrations,
}: {
  onSelectionChange: (integration: Integration, isSelected: boolean) => void
  selectedIntegrations: Integration[]
}) {
  return (
    <div className="grid gap-2">
      <Label>Associated integrations</Label>
      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
        {integrations.map((integration) => {
          const checkboxId = `skill-integration-${integration}`

          return (
            <div className="flex items-center gap-2" key={integration}>
              <Checkbox
                id={checkboxId}
                checked={selectedIntegrations.includes(integration)}
                onCheckedChange={(checked) =>
                  onSelectionChange(integration, checked === true)
                }
              />
              <Label className="font-normal text-xs" htmlFor={checkboxId}>
                {integrationLabel(integration)}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillDescriptionField({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="skill-description">Description</Label>
      <Textarea
        id="skill-description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Use when Milo is handling customer support requests."
        rows={3}
      />
    </div>
  )
}

function SkillInstructionsField({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="skill-body">Instructions</Label>
      <Textarea
        id="skill-body"
        className="min-h-56 font-mono text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={[
          "# Customer Support",
          "",
          "- Start with the customer's goal.",
          "- Keep replies concise and specific.",
        ].join("\n")}
      />
    </div>
  )
}
