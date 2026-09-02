import { Ban, CircleDashed, FilePenLine, FileText, PenLine } from "lucide-react"
import {
  type getJobSurfaceAccess,
  type JobMentionKind,
} from "@/shared/console/jobs/access"

export function getJobSurfaceAccessIcon(
  access: ReturnType<typeof getJobSurfaceAccess>,
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

export function getJobSurfaceToneClassNames(
  access: ReturnType<typeof getJobSurfaceAccess>,
  blocked: boolean
) {
  return blocked
    ? jobSurfaceToneClassNames.blocked
    : jobSurfaceToneClassNames[access]
}

/** Skill and tool pills share the integration pills' pastel construction —
 *  soft tinted surface, saturated icon, foreground text — on their own
 *  adjacent hues. */
export const jobReferenceToneClassNames = {
  skill: {
    icon: "text-[#B45309]",
    separator: "bg-[#EDD9B9]",
    surface: "border-[#EDD9B9] bg-[#FDFAF2] text-[#1F2937]",
  },
  tool: {
    icon: "text-[#0F766E]",
    separator: "bg-[#B9DDD6]",
    surface: "border-[#B9DDD6] bg-[#F4FBF9] text-[#1F2937]",
  },
} satisfies Record<
  Exclude<JobMentionKind, "integration">,
  { icon: string; separator: string; surface: string }
>

const jobSurfaceToneClassNames = {
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
  ReturnType<typeof getJobSurfaceAccess> | "blocked",
  {
    scopeIcon: string
    separator: string
    surface: string
  }
>
