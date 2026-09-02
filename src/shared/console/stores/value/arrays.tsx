import { type ReactNode } from "react"
import { type ValueState } from "./convert"
import { type ChangeHandler } from "./inputs"
import { AddItemRow, IndexCell, RemoveButton, valueRowClassName } from "./rows"

// Rows for one array value inside the key/value grid: each item gets a
// muted position in the key column, a quiet remove control, and a ghost
// Add-item row below in the grid's New-row idiom. The item widgets come
// from the caller, which keeps this file out of the form's recursive
// composition in fields.tsx.

type ArrayState = Extract<ValueState, { kind: "array" }>

type RenderItem = (
  item: ValueState,
  itemPath: string,
  itemLabel: string,
  onItemChange: ChangeHandler
) => ReactNode

export function ArrayFields({
  composite,
  depth,
  error,
  label,
  makeItem,
  onChange,
  path,
  renderItem,
  state,
}: {
  /** Nested items render as rows of their own under the position row;
   *  leaf items render inside it. */
  composite: boolean
  depth: number
  error: string | undefined
  label: string
  makeItem: () => ValueState
  onChange: ChangeHandler
  path: string
  renderItem: RenderItem
  state: ArrayState
}) {
  return (
    <>
      {state.items.map((item, index) => (
        <ArrayRow
          composite={composite}
          depth={depth}
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
      <AddItemRow
        depth={depth}
        error={error}
        label={label}
        onAdd={() =>
          onChange({ kind: "array", items: [...state.items, makeItem()] }, path)
        }
      />
    </>
  )
}

function ArrayRow({
  composite,
  depth,
  index,
  item,
  label,
  onChange,
  path,
  renderItem,
  state,
}: {
  composite: boolean
  depth: number
  index: number
  item: ValueState
  label: string
  onChange: ChangeHandler
  path: string
  renderItem: RenderItem
  state: ArrayState
}) {
  const itemLabel = `${label} item ${index + 1}`
  const onItemChange: ChangeHandler = (next, editedPath) =>
    onChange(
      {
        kind: "array",
        items: state.items.map((entry, position) =>
          position === index ? next : entry
        ),
      },
      editedPath
    )
  const remove = (
    <RemoveButton
      label={`Remove ${itemLabel}`}
      onClick={() =>
        onChange(
          {
            kind: "array",
            items: state.items.filter((_, position) => position !== index),
          },
          path
        )
      }
    />
  )
  const body = renderItem(item, `${path}.${index}`, itemLabel, onItemChange)

  if (composite) {
    return (
      <>
        <div className={valueRowClassName}>
          <IndexCell depth={depth} index={index} />
          {remove}
        </div>
        {body}
      </>
    )
  }

  return (
    <div className={valueRowClassName}>
      <IndexCell depth={depth} index={index} />
      <div className="min-w-0 flex-1">{body}</div>
      {remove}
    </div>
  )
}
