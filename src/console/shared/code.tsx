import { Fragment, type ReactNode, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog"
import { countLabel } from "@/lib/count"
import { cn } from "@/lib/utils"
import { CopyButton } from "./copy"
import { codeTokenClassName } from "./tokens"

type Composite = Record<string, unknown> | readonly unknown[]

const toggleClassName =
  "-mx-0.5 cursor-pointer rounded-sm px-0.5 outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/30"

/** Terminal-style JSON dialog: a slim header — caller-supplied left side,
 *  copy control right — over a folding JsonView. No chrome beyond that;
 *  the JSON is the whole story. */
export function JsonDialog({
  description,
  headerLeft,
  onOpenChange,
  open,
  value,
}: {
  description: string
  headerLeft: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  value: unknown
}) {
  const json = value === undefined ? "" : JSON.stringify(value, null, 2)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        // Full-bleed: the header divider spans the card, the pre scrolls.
        bodyClassName="gap-0 p-0"
        className="bg-muted sm:max-w-3xl"
        // Autofocusing the copy button pops its tooltip, whose layer then
        // swallows Escape before the dialog can see it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="grid min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-2">
            {headerLeft}
            <CopyButton label="schema" value={json} />
          </div>
          <pre
            className={`max-h-[70vh] min-w-0 overflow-auto px-3 py-2 font-mono text-foreground text-xs leading-relaxed ${codeTokenClassName}`}
          >
            {/* Keyed by content so fold state resets when the JSON swaps. */}
            <code className="block whitespace-pre-wrap break-words" key={json}>
              {value === undefined ? null : <JsonView value={value} />}
            </code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Scrollable folding-JSON pane for detail frames and document views. */
export function JsonBlock({
  className,
  value,
}: {
  className?: string
  value: unknown
}) {
  return (
    <pre
      className={cn(
        "max-h-96 min-w-0 overflow-auto px-2.5 py-2 font-mono text-foreground text-xs leading-relaxed",
        codeTokenClassName,
        className
      )}
    >
      <code className="block whitespace-pre-wrap break-words">
        <JsonView value={value} />
      </code>
    </pre>
  )
}

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
  return countLabel(size, Array.isArray(value) ? "item" : "property")
}

function isComposite(value: unknown): value is Composite {
  return typeof value === "object" && value !== null
}

function pad(indent: number) {
  return "  ".repeat(indent)
}
