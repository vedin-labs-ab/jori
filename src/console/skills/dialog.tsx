import {
  type Integration,
  integrationLabel,
  integrations,
} from "@contracts/integrations"
import {
  isSkillCategory,
  type SkillCategory,
  skillCategories,
  skillCategoryLabel,
} from "@contracts/skills"
import { Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { IntegrationLogo } from "../shared/logo/integration"
import { skillCategoryIcons } from "./metadata"
import { type Skill, type SkillFormValues } from "./types"

type SkillTextFieldName = Exclude<
  keyof SkillFormValues,
  "associatedIntegrations" | "category"
>

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
  function updateValue(name: SkillTextFieldName, value: string) {
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
            Name the skill, choose a category, describe when Milo should use it,
            and write the instructions in Markdown.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SkillTextField
              id="skill-name"
              label="Name"
              onChange={(value) => updateValue("name", value)}
              placeholder="customer-support"
              value={values.name}
            />
            <SkillCategoryField
              onChange={(category) => onValuesChange({ ...values, category })}
              value={values.category}
            />
          </div>
          <AssociatedIntegrationsField
            onChange={(associatedIntegrations) =>
              onValuesChange({ ...values, associatedIntegrations })
            }
            selectedIntegrations={values.associatedIntegrations}
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

function SkillCategoryField({
  onChange,
  value,
}: {
  onChange: (value: SkillCategory) => void
  value: SkillCategory
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="skill-category">Category</Label>
      <Select
        onValueChange={(category) => {
          if (isSkillCategory(category)) {
            onChange(category)
          }
        }}
        value={value}
      >
        <SelectTrigger className="w-full" id="skill-category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {skillCategories.map((category) => (
            <SelectItem key={category} value={category}>
              <SkillCategoryOption category={category} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SkillCategoryOption({ category }: { category: SkillCategory }) {
  const Icon = skillCategoryIcons[category]

  return (
    <>
      <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
      <span>{skillCategoryLabel(category)}</span>
    </>
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
  onChange,
  selectedIntegrations,
}: {
  onChange: (integrations: Integration[]) => void
  selectedIntegrations: Integration[]
}) {
  const anchor = useComboboxAnchor()

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="skill-integrations">Associated integrations</Label>
        <span className="text-muted-foreground text-xs">(optional)</span>
      </div>
      <Combobox
        items={integrations}
        multiple
        onValueChange={onChange}
        value={selectedIntegrations}
      >
        <ComboboxChips className="w-full" ref={anchor}>
          <ComboboxValue>
            {selectedIntegrations.map((integration) => (
              <ComboboxChip key={integration}>
                <IntegrationLogo
                  className="size-3.5"
                  decorative
                  integration={integration}
                />
                {integrationLabel(integration)}
              </ComboboxChip>
            ))}
          </ComboboxValue>
          <ComboboxChipsInput
            id="skill-integrations"
            placeholder="Add integrations"
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No integrations found.</ComboboxEmpty>
          <ComboboxList>
            {(integration: Integration) => (
              <ComboboxItem key={integration} value={integration}>
                <IntegrationOption integration={integration} />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Info aria-hidden="true" className="size-3.5 shrink-0" />
        <span>
          Used for internal categorization and filtering. It does not change how
          the skill runs.
        </span>
      </p>
    </div>
  )
}

function IntegrationOption({ integration }: { integration: Integration }) {
  return (
    <>
      <IntegrationLogo
        className="size-3.5"
        decorative
        integration={integration}
      />
      <span>{integrationLabel(integration)}</span>
    </>
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
      <Label htmlFor="skill-description">When to use</Label>
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
