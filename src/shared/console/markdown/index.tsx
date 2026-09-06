import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { BlockTokens } from "./blocks"
import { parseMarkdown } from "./parse"
import { markdownProseClassName } from "./style"

/** Markdown laid out at the console's prose scale. While `streaming`, the
 *  text is read as the reply it is becoming, so an open fence or a table
 *  header renders as code or a table before its closing line arrives. */
export function Markdown({
  className,
  streaming = false,
  text,
}: {
  className?: string
  streaming?: boolean
  text: string
}) {
  const tokens = useMemo(
    () => parseMarkdown(text, streaming),
    [streaming, text]
  )

  return (
    <div
      className={cn(
        "min-w-0 max-w-full break-words leading-6 [overflow-wrap:anywhere]",
        markdownProseClassName,
        className
      )}
      data-markdown=""
    >
      <BlockTokens tokens={tokens} />
    </div>
  )
}
