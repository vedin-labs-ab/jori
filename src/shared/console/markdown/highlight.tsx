import { lazy, Suspense } from "react"

// The grammars weigh more than the rest of the markdown put together, so
// they load on their own: a block reads as plain text until they arrive,
// then takes its colors. The same markup either way, only the spans differ.
const GrammarCode = lazy(async () => ({
  default: (await import("./grammars")).GrammarCode,
}))

/** Code as `hljs-*` spans once the grammars are here, and as the plain
 *  text it is until then, or for a language the palette does not know. */
export function HighlightedCode({
  code,
  language,
}: {
  code: string
  language: string
}) {
  return (
    <Suspense fallback={code}>
      <GrammarCode code={code} language={language} />
    </Suspense>
  )
}
