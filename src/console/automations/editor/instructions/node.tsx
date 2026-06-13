import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react"
import { Ban, CircleDashed, FilePenLine, FileText, PenLine } from "lucide-react"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import {
  type AutomationReadScope,
  type AutomationSurfaceFormValue,
  getAutomationSurfaceAccessLabel,
  getAutomationSurfaceLabel,
  getNextAutomationSurfaceAccess,
  isAutomationSurfaceProvider,
} from "../../surfaces"
import { type AutomationSurfaceExtensionOptions } from "./extension"
import { AutomationSurfaceRemoveButton } from "./remove"

export function AutomationSurfaceNodeView({
  deleteNode,
  extension,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const provider = isAutomationSurfaceProvider(node.attrs.provider)
    ? node.attrs.provider
    : null
  const access = parseAutomationSurfaceAccess(node.attrs.access)
  const blocked = node.attrs.policy === "blocked"

  if (provider === null) {
    return null
  }

  const toneClassNames = getSurfaceToneClassNames(access, blocked)
  const accessLabel = getAutomationSurfaceAccessLabel(access)
  const providerLabel = getAutomationSurfaceLabel(provider)

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex align-middle"
      contentEditable={false}
      data-automation-surface-view=""
    >
      <ButtonGroup
        aria-label={`${providerLabel} integration access`}
        className={cn(
          "mx-0.5 inline-flex h-5 overflow-hidden rounded-sm border align-middle text-[0.625rem]/none shadow-none",
          toneClassNames.surface,
          selected && "ring-2 ring-ring/40"
        )}
        data-automation-surface-access={access === "" ? "unset" : access}
        data-automation-surface-policy={blocked ? "blocked" : "allowed"}
      >
        <AutomationSurfaceAccessButton
          access={access}
          accessLabel={accessLabel}
          blocked={blocked}
          iconClassName={toneClassNames.scopeIcon}
          onChange={() =>
            updateAttributes({
              access: getNextAutomationSurfaceAccess(
                access,
                getNodeViewReadScope(extension)
              ),
            })
          }
          providerLabel={providerLabel}
        />
        <span
          aria-hidden="true"
          className={cn(
            "w-[0.5px] shrink-0 self-stretch rounded-none",
            toneClassNames.separator
          )}
          data-automation-surface-separator=""
        />
        <AutomationSurfaceRemoveButton
          onRemove={deleteNode}
          provider={provider}
          providerLabel={providerLabel}
        />
      </ButtonGroup>
    </NodeViewWrapper>
  )
}

function getNodeViewReadScope(
  extension: NodeViewProps["extension"]
): AutomationReadScope {
  return (
    extension.options as Partial<AutomationSurfaceExtensionOptions>
  ).getReadScope?.() === "allConnected"
    ? "allConnected"
    : "selected"
}

function AutomationSurfaceAccessButton({
  access,
  accessLabel,
  blocked,
  iconClassName,
  onChange,
  providerLabel,
}: {
  access: AutomationSurfaceFormValue["access"]
  accessLabel: string
  blocked: boolean
  iconClassName: string
  onChange: () => void
  providerLabel: string
}) {
  const Icon = getAccessIcon(access, blocked)
  const label = blocked
    ? `${providerLabel} access: ${accessLabel}, unavailable for automations. Change access.`
    : `${providerLabel} access: ${accessLabel}. Change access.`

  return (
    <button
      aria-label={label}
      className={cn(
        "grid px-1 place-items-center opacity-55 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        iconClassName
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onChange()
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      title={blocked ? "Unavailable for automations" : accessLabel}
      type="button"
    >
      <Icon className="size-3" />
    </button>
  )
}

function getAccessIcon(
  access: AutomationSurfaceFormValue["access"],
  blocked: boolean
) {
  if (blocked) {
    return Ban
  }

  if (access === "read") {
    return FileText
  }

  if (access === "write") {
    return PenLine
  }

  return access === "both" ? FilePenLine : CircleDashed
}

function getSurfaceToneClassNames(
  access: AutomationSurfaceFormValue["access"],
  blocked: boolean
) {
  return blocked
    ? automationSurfaceToneClassNames.blocked
    : automationSurfaceToneClassNames[access]
}

const automationSurfaceToneClassNames = {
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
  blocked: {
    scopeIcon: "text-destructive",
    separator: "bg-destructive/20",
    surface: "border-destructive/50 bg-destructive/5 text-destructive",
  },
} satisfies Record<
  AutomationSurfaceFormValue["access"] | "blocked",
  {
    scopeIcon: string
    separator: string
    surface: string
  }
>

function parseAutomationSurfaceAccess(
  access: unknown
): AutomationSurfaceFormValue["access"] {
  return access === "read" || access === "write" || access === "both"
    ? access
    : ""
}
