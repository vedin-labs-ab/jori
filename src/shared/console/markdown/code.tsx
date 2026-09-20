import { CopyButton } from "../copy"
import { HighlightedCode } from "./highlight"

/** A fenced block: the code highlighted when its language is known, and
 *  a copy control pinned to its corner. The block scrolls sideways on its
 *  own so a long line never widens the message. */
export function CodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  return (
    <div className="group/code relative min-w-0">
      <pre data-language={language === "" ? undefined : language}>
        <code>
          <HighlightedCode code={code} language={language} />
        </code>
      </pre>
      <CopyButton
        className="absolute top-1 right-1 bg-background/80 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/code:opacity-100 pointer-coarse:opacity-100"
        label="code"
        value={code}
      />
    </div>
  )
}
