import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { CircleDashed, FilePenLine, FileText, PenLine } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import {
  getNextScheduleSurfaceAccess,
  getScheduleSurfaceAccessLabel,
  getScheduleSurfaceLabel,
  isScheduleSurfaceProvider,
  type ScheduleSurfaceFormValue,
} from "../surfaces"
import { ScheduleSurfaceRemoveButton } from "./remove"

export function ScheduleSurfaceNodeView({
  deleteNode,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const provider = isScheduleSurfaceProvider(node.attrs.provider)
    ? node.attrs.provider
    : null
  const access = parseScheduleSurfaceAccess(node.attrs.access)

  if (provider === null) {
    return null
  }

  const toneClassNames = getSurfaceToneClassNames(access)
  const accessLabel = getScheduleSurfaceAccessLabel(access)
  const providerLabel = getScheduleSurfaceLabel(provider)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-schedule-surface-view=""
    >
      <ButtonGroup
        aria-label={`${providerLabel} integration access`}
        className={cn(
          "mx-0.5 inline-flex h-5 overflow-hidden rounded-sm border align-middle text-[0.625rem]/none shadow-none",
          toneClassNames.surface,
          selected && "ring-2 ring-ring/40"
        )}
      >
        <ScheduleSurfaceAccessButton
          access={access}
          accessLabel={accessLabel}
          iconClassName={toneClassNames.scopeIcon}
          onChange={() =>
            updateAttributes({ access: getNextScheduleSurfaceAccess(access) })
          }
          providerLabel={providerLabel}
        />
        <span
          aria-hidden="true"
          className={cn(
            "w-px shrink-0 self-stretch rounded-none",
            toneClassNames.separator
          )}
          data-schedule-surface-separator=""
        />
        <ScheduleSurfaceRemoveButton
          onRemove={deleteNode}
          provider={provider}
          providerLabel={providerLabel}
        />
      </ButtonGroup>
    </NodeViewWrapper>
  )
}

function ScheduleSurfaceAccessButton({
  access,
  accessLabel,
  iconClassName,
  onChange,
  providerLabel,
}: {
  access: ScheduleSurfaceFormValue["access"]
  accessLabel: string
  iconClassName: string
  onChange: () => void
  providerLabel: string
}) {
  const Icon = getAccessIcon(access)

  return (
    <button
      aria-label={`${providerLabel} access: ${accessLabel}. Change access.`}
      className={cn(
        "grid px-1 place-items-center opacity-55 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        iconClassName
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onChange()
      }}
      title={accessLabel}
      type="button"
    >
      <Icon className="size-3" />
    </button>
  )
}

function getAccessIcon(access: ScheduleSurfaceFormValue["access"]) {
  if (access === "read") {
    return FileText
  }

  if (access === "write") {
    return PenLine
  }

  return access === "both" ? FilePenLine : CircleDashed
}

function getSurfaceToneClassNames(access: ScheduleSurfaceFormValue["access"]) {
  return scheduleSurfaceToneClassNames[access]
}

const scheduleSurfaceToneClassNames = {
  "": {
    scopeIcon: "text-[#78716C]",
    separator: "bg-[#D6D3D1]",
    surface: "border-[#D6D3D1] bg-[#FAFAF9] text-[#57534E]",
  },
  both: {
    scopeIcon: "text-[#6256C7]",
    separator: "bg-[#DDD6F5]",
    surface: "border-[#D4C8F3] bg-[#FAF8FF] text-[#1F2937]",
  },
  read: {
    scopeIcon: "text-[#2563EB]",
    separator: "bg-[#C9D7ED]",
    surface: "border-[#BFD3F2] bg-[#F7FAFF] text-[#1F2937]",
  },
  write: {
    scopeIcon: "text-[#2F7D4F]",
    separator: "bg-[#C9DED1]",
    surface: "border-[#BDD8C7] bg-[#F6FBF7] text-[#1F2937]",
  },
} satisfies Record<
  ScheduleSurfaceFormValue["access"],
  {
    scopeIcon: string
    separator: string
    surface: string
  }
>

function parseScheduleSurfaceAccess(
  access: unknown
): ScheduleSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}
