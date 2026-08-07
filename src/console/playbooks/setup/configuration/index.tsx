import {
  isPlaybookOptionEnabled,
  type PlaybookOptionValues,
  type PlaybookSetupSection,
  playbookOptionFields,
} from "@contracts/playbooks/options"
import { type ReactNode } from "react"
import { PlaybookSection } from "../../meta"
import { BehaviorList } from "./behavior"
import { OptionField } from "./control"

export function PlaybookConfiguration({
  disabled,
  hints,
  issue,
  onChange,
  setup,
  values,
}: {
  disabled: boolean
  hints?: Partial<Record<string, ReactNode>>
  issue?: string
  onChange: (key: string, value: boolean | number | string) => void
  setup: readonly PlaybookSetupSection[]
  values: PlaybookOptionValues
}) {
  const fields = playbookOptionFields(setup)

  return setup.map((section, index) => {
    const invalid = issue !== undefined && index === setup.length - 1
    const issueId = `playbook-setup-${section.key}-issue`

    return (
      <PlaybookSection key={section.key} label={section.label}>
        {section.kind === "behaviors" ? (
          <fieldset
            aria-describedby={invalid ? issueId : undefined}
            aria-invalid={invalid || undefined}
            className="divide-y overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          >
            <legend className="sr-only">{section.label}</legend>
            <BehaviorList
              behaviors={section.behaviors}
              disabled={disabled}
              fields={fields}
              hints={hints}
              onChange={onChange}
              values={values}
            />
          </fieldset>
        ) : (
          <SectionFields
            disabled={disabled}
            fields={fields}
            hints={hints}
            onChange={onChange}
            section={section}
            values={values}
          />
        )}
        {invalid ? (
          <p className="text-destructive" id={issueId} role="alert">
            {issue}
          </p>
        ) : null}
      </PlaybookSection>
    )
  })
}

function SectionFields({
  disabled,
  fields,
  hints,
  onChange,
  section,
  values,
}: {
  disabled: boolean
  fields: ReturnType<typeof playbookOptionFields>
  hints?: Partial<Record<string, ReactNode>>
  onChange: (key: string, value: boolean | number | string) => void
  section: Extract<PlaybookSetupSection, { kind: "fields" }>
  values: PlaybookOptionValues
}) {
  const visible = section.fields.filter((field) =>
    isPlaybookOptionEnabled(field, fields, values)
  )

  return (
    // The same field grid the behavior rows use, so labeled fields keep
    // one rhythm everywhere in the dialog.
    <div className="grid gap-3 sm:grid-cols-2">
      {visible.map((field) => (
        <OptionField
          disabled={disabled}
          field={field}
          hint={hints?.[field.key]}
          key={field.key}
          label={visible.length > 1 || field.label !== section.label}
          onChange={(value) => onChange(field.key, value)}
          value={values[field.key]}
        />
      ))}
    </div>
  )
}
