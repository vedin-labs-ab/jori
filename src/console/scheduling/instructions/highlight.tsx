import {
  getScheduleSurfaceMentionParts,
  type ScheduleSurfaceProvider,
} from "../surfaces"

export function InstructionHighlight({ value }: { value: string }) {
  const parts = getScheduleSurfaceMentionParts(value)
  let offset = 0

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-2 py-2 text-sm whitespace-pre-wrap break-words md:text-xs/relaxed"
    >
      {parts.map((part) => {
        const key = `${offset}-${part.text}`
        offset += part.text.length

        return (
          <span className={getHighlightClassName(part.provider)} key={key}>
            {part.text}
          </span>
        )
      })}
      {value.endsWith("\n") ? "\u00a0" : null}
    </div>
  )
}

function getHighlightClassName(provider: ScheduleSurfaceProvider | undefined) {
  return provider === undefined
    ? "text-foreground"
    : "text-informational underline decoration-informational/40 underline-offset-2"
}
