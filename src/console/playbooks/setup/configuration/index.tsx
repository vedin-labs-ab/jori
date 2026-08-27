import {
  isPlaybookOptionEnabled,
  type PlaybookOptionValues,
  type PlaybookSetupSection,
  playbookOptionFields,
} from "@contracts/playbooks/options"
import { PlaybookSection } from "../../meta"
import { BehaviorList } from "./behavior"
import { OptionField } from "./control"

export function PlaybookConfiguration({
  disabled,
  issue,
  onChange,
  setup,
  values,
}: {
  disabled: boolean
  issue?: string
  onChange: (key: string, value: boolean | number | string) => void
  setup: readonly PlaybookSetupSection[]
  values: PlaybookOptionValues
}) {
  const fields = playbookOptionFields(setup)

  return setup.map((section, index) => {
    const invalid = issue !== undefined && index === setup.length - 1
    const issueId = `playbook-setup-${section.key}-issue`
    const heading =
      section.kind === "fields" &&
      planSectionFields(section, fields, values).labeled
        ? undefined
        : section.label

    return (
      <PlaybookSection key={section.key} label={heading}>
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
              onChange={onChange}
              values={values}
            />
          </fieldset>
        ) : (
          <SectionFields
            disabled={disabled}
            fields={fields}
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

/** A fields section labels either the section or every field, never both:
 *  a lone field named like its section leans on the heading, while fields
 *  with names of their own make the heading redundant. */
function planSectionFields(
  section: Extract<PlaybookSetupSection, { kind: "fields" }>,
  fields: ReturnType<typeof playbookOptionFields>,
  values: PlaybookOptionValues
) {
  const visible = section.fields.filter((field) =>
    isPlaybookOptionEnabled(field, fields, values)
  )

  return {
    visible,
    labeled:
      visible.length > 1 ||
      visible.some((field) => field.label !== section.label),
  }
}

function SectionFields({
  disabled,
  fields,
  onChange,
  section,
  values,
}: {
  disabled: boolean
  fields: ReturnType<typeof playbookOptionFields>
  onChange: (key: string, value: boolean | number | string) => void
  section: Extract<PlaybookSetupSection, { kind: "fields" }>
  values: PlaybookOptionValues
}) {
  const { labeled, visible } = planSectionFields(section, fields, values)

  return (
    // The same field grid the behavior rows use, so labeled fields keep
    // one rhythm everywhere in the dialog.
    <div className="grid gap-3 sm:grid-cols-2">
      {visible.map((field) => (
        <OptionField
          disabled={disabled}
          field={field}
          key={field.key}
          label={labeled}
          onChange={(value) => onChange(field.key, value)}
          value={values[field.key]}
        />
      ))}
    </div>
  )
}
