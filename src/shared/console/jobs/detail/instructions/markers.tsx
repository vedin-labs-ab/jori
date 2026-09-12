import { type JSONContent } from "@tiptap/core"
import { BookOpen, Wrench } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  MentionChip,
  mentionChipClassName,
} from "@/shared/console/mentions/chip"
import { ProviderLogo } from "@/shared/logo/provider"
import {
  getJobSurfaceAccess,
  getJobSurfaceAccessLabel,
  getJobSurfaceLabel,
} from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import {
  getJobSurfaceAccessIcon,
  getJobSurfaceToneClassNames,
  jobReferenceToneClassNames,
} from "../../editor/instructions/access/tone"
import {
  parseJobReferenceKind,
  parseJobSurfaceIntegration,
  parseJobSurfaceTools,
} from "../../editor/instructions/document"

// The editor's pills with nothing to press: the same construction and
// tones, so a brief reads the same on the page as in the editor.

const markerClassName = mentionChipClassName

/** An integration mention: its mark and name, then its access and how
 *  many of its tools the job may call. */
export function SurfaceMarker({
  node,
  permissions,
}: {
  node: JSONContent
  permissions: JobPolicyPermissions
}) {
  const integration = parseJobSurfaceIntegration(node.attrs?.integration)

  if (integration === null) {
    return null
  }

  const tools = parseJobSurfaceTools(node.attrs?.tools)
  const access = getJobSurfaceAccess({ integration, tools }, permissions)
  const tone = getJobSurfaceToneClassNames(access, false)
  const Icon = getJobSurfaceAccessIcon(access, false)
  const accessLabel = getJobSurfaceAccessLabel(access)

  return (
    <span
      className={cn(markerClassName, tone.surface)}
      data-job-surface={integration}
      title={
        tools.length === 0
          ? accessLabel
          : `${accessLabel}: ${tools.length} enabled`
      }
    >
      <MarkerName
        icon={<ProviderLogo className="size-3" surface={integration} />}
        label={getJobSurfaceLabel(integration)}
      />
      <span
        aria-hidden="true"
        className={cn("w-[0.5px] shrink-0 self-stretch", tone.separator)}
      />
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1 font-medium",
          tone.icon
        )}
      >
        <Icon className="size-3" />
        {tools.length > 0 ? (
          <span className="tabular-nums">{tools.length}</span>
        ) : null}
      </span>
    </span>
  )
}

/** A skill or tool mention: the shared chip with nothing to press. */
export function ReferenceMarker({ node }: { node: JSONContent }) {
  const kind = parseJobReferenceKind(node.attrs?.kind)
  const id = node.attrs?.id

  if (kind === null || typeof id !== "string") {
    return null
  }

  const tone = jobReferenceToneClassNames[kind]
  const Icon = kind === "skill" ? BookOpen : Wrench

  return (
    <MentionChip
      data-job-reference={kind}
      icon={<Icon aria-hidden="true" className={cn("size-3", tone.icon)} />}
      kind={kind}
      label={id}
    />
  )
}

function MarkerName({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 px-1 font-medium">
      <span className="grid w-4 place-items-center">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  )
}
