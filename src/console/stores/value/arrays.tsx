import { Plus, X } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { type ValueState } from "./convert"
import { type ChangeHandler } from "./inputs"
import { FieldError } from "./rows"

// Add/remove rows for one array value, mirroring the schema builder's row
// styling. The item widgets come from the caller, which keeps this file
// out of the form's recursive composition in fields.tsx.

type ArrayState = Extract<ValueState, { kind: "array" }>

export function ArrayFields({
  error,
  label,
  makeItem,
  onChange,
  path,
  renderItem,
  state,
}: {
  error: string | undefined
  label: string
  makeItem: () => ValueState
  onChange: ChangeHandler
  path: string
  renderItem: (
    item: ValueState,
    itemPath: string,
    itemLabel: string,
    onItemChange: ChangeHandler
  ) => ReactNode
  state: ArrayState
}) {
  return (
    <div className="grid gap-2">
      {state.items.map((item, index) => (
        <ArrayRow
          index={index}
          item={item}
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are fully controlled and have no identity beyond their position
          key={index}
          label={label}
          onChange={onChange}
          path={path}
          renderItem={renderItem}
          state={state}
        />
      ))}
      <Button
        className="w-fit"
        onClick={() =>
          onChange({ kind: "array", items: [...state.items, makeItem()] }, path)
        }
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        Add item
      </Button>
      <FieldError message={error} />
    </div>
  )
}

function ArrayRow({
  index,
  item,
  label,
  onChange,
  path,
  renderItem,
  state,
}: {
  index: number
  item: ValueState
  label: string
  onChange: ChangeHandler
  path: string
  renderItem: (
    item: ValueState,
    itemPath: string,
    itemLabel: string,
    onItemChange: ChangeHandler
  ) => ReactNode
  state: ArrayState
}) {
  const itemLabel = `${label} item ${index + 1}`

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {renderItem(item, `${path}.${index}`, itemLabel, (next, editedPath) =>
          onChange(
            {
              kind: "array",
              items: state.items.map((entry, position) =>
                position === index ? next : entry
              ),
            },
            editedPath
          )
        )}
      </div>
      <Button
        aria-label={`Remove ${itemLabel}`}
        onClick={() =>
          onChange(
            {
              kind: "array",
              items: state.items.filter((_, position) => position !== index),
            },
            path
          )
        }
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}
