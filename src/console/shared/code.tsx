import { Fragment, useState } from "react"

type Composite = Record<string, unknown> | readonly unknown[]

const toggleClassName =
  "-mx-0.5 cursor-pointer rounded-sm px-0.5 outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/30"

/** JSON rendered as a collapsible structure: every bracket that opens a
 *  non-empty object or array folds its region, DevTools-style. Emits the
 *  exact `JSON.stringify(value, null, 2)` layout with `hljs-*` token
 *  classes — pair with codeTokenClassName (shared/tokens.ts) on a parent. */
export function JsonView({ value }: { value: unknown }) {
  return (
    <>
      <JsonNode indent={0} value={value} />
      {"\n"}
    </>
  )
}

function JsonNode({ indent, value }: { indent: number; value: unknown }) {
  const [collapsed, setCollapsed] = useState(false)

  if (!isComposite(value)) {
    return <JsonLeaf value={value} />
  }

  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"]
  const size = Array.isArray(value) ? value.length : Object.keys(value).length

  if (size === 0) {
    return open + close
  }

  if (collapsed) {
    return (
      <button
        aria-expanded={false}
        className={toggleClassName}
        onClick={() => setCollapsed(false)}
        title={`Expand ${describeSize(size, value)}`}
        type="button"
      >
        {open} <span className="text-muted-foreground">…</span> {close}
      </button>
    )
  }

  return (
    <>
      <button
        aria-expanded={true}
        className={toggleClassName}
        onClick={() => setCollapsed(true)}
        title={`Collapse ${describeSize(size, value)}`}
        type="button"
      >
        {open}
      </button>
      {"\n"}
      <JsonEntries indent={indent + 1} value={value} />
      {pad(indent) + close}
    </>
  )
}

function JsonEntries({ indent, value }: { indent: number; value: Composite }) {
  const entries = Array.isArray(value)
    ? value.map((item, index) => ({ item, key: String(index) }))
    : Object.entries(value).map(([key, item]) => ({ item, key }))

  return entries.map((entry, index) => (
    <Fragment key={entry.key}>
      {pad(indent)}
      {Array.isArray(value) ? null : (
        <>
          <span className="hljs-attr">{JSON.stringify(entry.key)}</span>
          {": "}
        </>
      )}
      <JsonNode indent={indent} value={entry.item} />
      {index < entries.length - 1 ? "," : ""}
      {"\n"}
    </Fragment>
  ))
}

function JsonLeaf({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <span className="hljs-string">{JSON.stringify(value)}</span>
  }

  if (typeof value === "number") {
    return <span className="hljs-number">{String(value)}</span>
  }

  if (typeof value === "boolean" || value === null) {
    return <span className="hljs-literal">{String(value)}</span>
  }

  return String(value)
}

function describeSize(size: number, value: Composite) {
  if (Array.isArray(value)) {
    return size === 1 ? "1 item" : `${size} items`
  }

  return size === 1 ? "1 property" : `${size} properties`
}

function isComposite(value: unknown): value is Composite {
  return typeof value === "object" && value !== null
}

function pad(indent: number) {
  return "  ".repeat(indent)
}
