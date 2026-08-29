import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { syntaxHighlighting } from "@codemirror/language"
import { EditorState, StateEffect } from "@codemirror/state"
import { EditorView, keymap, lineNumbers } from "@codemirror/view"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { codeTokenClassName } from "../../shared/tokens"
import { highlight, loadLanguage } from "./language"

// The CodeMirror binding, loaded lazily by the editor section so the
// console bundle and the server build never carry it. The view is created
// in an effect and torn down with the component.

/** Token colors past the shared palette, scoped to the editor: classes the
 *  console's other code surfaces never emit. */
const editorTokenClassName = cn(
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
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--color-border)",
    color: "var(--color-muted-foreground)",
  },
})

export function Mirror({
  mimeType,
  name,
  onChange,
  value,
}: {
  mimeType: string
  name: string
  onChange: (text: string) => void
  value: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const change = useRef(onChange)

  useEffect(() => {
    change.current = onChange
  }, [onChange])

  useEffect(() => {
    if (host.current === null) {
      return
    }

    let isMounted = true
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: value, extensions: extensions(change) }),
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
  }, [mimeType, name, value])

  return (
    <div
      className={cn(
        "h-full overflow-hidden pl-1 font-mono text-xs md:pl-3",
        editorTokenClassName
      )}
      ref={host}
    />
  )
}

function extensions(change: { current: (text: string) => void }) {
  return [
    lineNumbers(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    syntaxHighlighting(highlight),
    theme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        change.current(update.state.doc.toString())
      }
    }),
  ]
}
