import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { syntaxHighlighting } from "@codemirror/language"
import { EditorState, StateEffect } from "@codemirror/state"
import { EditorView, keymap, lineNumbers } from "@codemirror/view"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { codeTokenClassName } from "../tokens"
import { highlight, loadLanguage } from "./language"

// The CodeMirror binding, loaded lazily by every surface that shows code
// so the console bundle and the server build never carry it. The view is
// created in an effect and torn down with the component. A read-only
// mount keeps the gutter and the highlighting and drops the editing
// extensions.

/** Token colors past the shared palette, scoped to the mirror: classes the
 *  console's other code surfaces never emit. */
const mirrorTokenClassName = cn(
  codeTokenClassName,
  "[&_.hljs-keyword]:text-violet-600 dark:[&_.hljs-keyword]:text-violet-400",
  "[&_.hljs-title]:text-blue-600 dark:[&_.hljs-title]:text-blue-400",
  "[&_.hljs-comment]:text-muted-foreground"
)

/** Squares the editor into the app: transparent over the page background,
 *  the host's monospace text style, and hairline gutters. */
const theme = EditorView.theme({
  "&": { backgroundColor: "transparent", height: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.625" },
  ".cm-content": { caretColor: "var(--color-foreground)" },
  ".cm-cursor": { borderLeftColor: "var(--color-foreground)" },
  // The gutter pins itself to the left edge, so it carries the page's own
  // background rather than a transparent one: a long line scrolling past
  // it passes behind the numbers instead of through them.
  ".cm-gutters": {
    backgroundColor: "var(--color-background)",
    borderRight: "1px solid var(--color-border)",
    color: "var(--color-muted-foreground)",
  },
})

export function Mirror({
  mimeType,
  name = "",
  onBlur,
  onChange,
  readOnly = false,
  value,
}: {
  mimeType: string
  /** The filename, where the code has one: it picks the language ahead of
   *  the mime type. */
  name?: string
  onBlur?: () => void
  onChange?: (text: string) => void
  /** Shows the code without editing it: no caret, no keymap, no history. */
  readOnly?: boolean
  value: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const change = useRef(onChange)
  const blur = useRef(onBlur)

  useEffect(() => {
    change.current = onChange
    blur.current = onBlur
  }, [onBlur, onChange])

  useEffect(() => {
    if (host.current === null) {
      return
    }

    let isMounted = true
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: extensions(readOnly, change, blur),
      }),
    })

    void loadLanguage(name, mimeType).then((language) => {
      if (isMounted && language !== undefined) {
        view.dispatch({ effects: StateEffect.appendConfig.of(language) })
      }
    })

    return () => {
      isMounted = false
      view.destroy()
    }
  }, [mimeType, name, readOnly, value])

  return (
    <div
      className={cn(
        "h-full overflow-hidden pl-1 font-mono text-xs md:pl-3",
        mirrorTokenClassName
      )}
      ref={host}
    />
  )
}

function extensions(
  readOnly: boolean,
  change: { current: ((text: string) => void) | undefined },
  blur: { current: (() => void) | undefined }
) {
  const shared = [lineNumbers(), syntaxHighlighting(highlight), theme]

  if (readOnly) {
    return [
      ...shared,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
    ]
  }

  return [
    ...shared,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.domEventHandlers({ blur: () => blur.current?.() }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        change.current?.(update.state.doc.toString())
      }
    }),
  ]
}
