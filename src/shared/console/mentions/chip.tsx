import { X } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type MentionKind } from "./scan"
import { mentionTones } from "./tone"

/** The pill every mention wears: a fixed-height, tinted, bordered inline
 *  box that sits on the text's baseline, in the editor and in the message
 *  alike. */
export const mentionChipClassName =
  "mx-0.5 inline-flex h-5 items-center overflow-hidden rounded-sm border align-middle text-[0.625rem]/none"

type MentionChipProps = Omit<ComponentProps<"span">, "children"> & {
  icon: ReactNode
  kind: MentionKind
  label: string
  /** Set, the name opens what it stands for. */
  onOpen?: () => void
  /** Set, the icon swaps to a remove control on hover or focus. */
  onRemove?: () => void
  selected?: boolean
  /** Segments after the name, each bringing its own separator. */
  trailing?: ReactNode
}

/** One mention as a chip: its kind's icon and its name, in its kind's
 *  tone. In an editor the icon gives way to a remove control; in a
 *  message the name opens the resource; on a page it is inert. The same
 *  chip renders everywhere so a mention reads the same wherever it is. */
export function MentionChip({
  className,
  icon,
  kind,
  label,
  onOpen,
  onRemove,
  selected = false,
  trailing,
  ...attributes
}: MentionChipProps) {
  return (
    <span
      className={cn(
        mentionChipClassName,
        mentionTones[kind].surface,
        className,
        selected && "ring-2 ring-ring/40"
      )}
      data-mention-kind={kind}
      {...attributes}
    >
      {onRemove === undefined ? (
        <MentionName icon={icon} label={label} onOpen={onOpen} />
      ) : (
        <MentionRemoveButton icon={icon} label={label} onRemove={onRemove} />
      )}
      {trailing}
    </span>
  )
}

/** A chip's identity segment when nothing removes it: the icon and the
 *  name, as a button when the name opens something. */
function MentionName({
  icon,
  label,
  onOpen,
}: {
  icon: ReactNode
  label: string
  onOpen: (() => void) | undefined
}) {
  const content = (
    <>
      <span className="grid w-4 place-items-center">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </>
  )

  if (onOpen === undefined) {
    return (
      <span className="flex items-center gap-1 px-1 font-medium">
        {content}
      </span>
    )
  }

  return (
    <button
      className="flex cursor-pointer items-center gap-1 self-stretch px-1 font-medium outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/30"
      onClick={onOpen}
      type="button"
    >
      {content}
    </button>
  )
}

/** A chip's identity segment in an editor: the kind icon that swaps to a
 *  remove button on hover or focus, next to the name. */
export function MentionRemoveButton({
  icon,
  label,
  onRemove,
  ...attributes
}: ComponentProps<"span"> & {
  icon: ReactNode
  label: string
  onRemove: () => void
}) {
  return (
    <span
      className="group/remove flex items-center gap-1 px-1 font-medium"
      {...attributes}
    >
      <button
        aria-label={`Remove ${label}`}
        className="group/x grid w-6 place-items-center self-stretch outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30 lg:w-4"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onRemove()
        }}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        title={`Remove ${label}`}
        type="button"
      >
        <span className="hidden place-items-center lg:grid lg:group-focus-within/remove:hidden lg:group-hover/remove:hidden">
          {icon}
        </span>
        <X className="block size-3 opacity-100 transition-opacity duration-150 ease-out lg:hidden lg:opacity-55 lg:group-focus-within/remove:block lg:group-hover/remove:block lg:group-focus-visible/x:opacity-100 lg:group-hover/x:opacity-100" />
      </button>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  )
}

/** A chip's action segment: a quiet icon button in the pill's own tone,
 *  brightening on hover, that must not steal the editor's selection. */
export function MentionActionButton({
  ariaLabel,
  children,
  className,
  onOpen,
  onWarm,
  title,
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  onOpen: () => void
  /** First sign of pointer or focus intent; lets callers warm data early. */
  onWarm?: () => void
  title: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 self-stretch px-1 font-medium opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen()
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onFocus={onWarm}
      onPointerOver={onWarm}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}
