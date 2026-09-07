import { memo, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { BlockTokens } from "./blocks"
import { createStreamingParser, parseMarkdown } from "./parse"
import { prefetchGrammars } from "./prefetch"
import { markdownProseClassName } from "./style"

/** Markdown laid out at the console's prose scale. While `streaming`, the
 *  text is read as the reply it is becoming, so an open fence or a table
 *  header renders as code or a table before its closing line arrives.
 *  Memoized: a finished message's text never changes, and parsing it
 *  again for a render of the thread would be the thread's whole cost. A
 *  streaming text is lexed as it grows, its settled blocks kept between
 *  writes. */
export const Markdown = memo(function Markdown({
  className,
  streaming = false,
  text,
}: {
  className?: string
  streaming?: boolean
  text: string
}) {
  const [parseStreaming] = useState(createStreamingParser)
  const tokens = useMemo(
    () => (streaming ? parseStreaming(text) : parseMarkdown(text)),
    [parseStreaming, streaming, text]
  )

  useEffect(prefetchGrammars, [])

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
})
