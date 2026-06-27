import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { type OrganizationDiscovery } from "./types"
import { DiscoveryWorkingStep } from "./website"

type PreviewMode = "failed" | "running" | "succeeded"
type PreviewDiscovery = NonNullable<OrganizationDiscovery>

const searchParam = "discoveryPreview"
const previewElapsedMs = 48_000

// Temporary design harness for iterating on the discovery modal.
// Remove this file and the render in context/index.tsx when the design settles.
export function DiscoveryModalPreview() {
  const [mode, setMode] = useState<PreviewMode | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    setMode(readPreviewMode(window.location.search))
  }, [])

  if (mode === null) {
    return null
  }

  return (
    <Dialog open onOpenChange={(open) => !open && setMode(null)}>
      <DialogContent className="sm:max-w-md">
        <DiscoveryWorkingStep
          discovery={previewDiscovery(mode)}
          onClose={() => setMode(null)}
        />
      </DialogContent>
    </Dialog>
  )
}

function readPreviewMode(search: string): PreviewMode | null {
  const value = new URLSearchParams(search).get(searchParam)

  if (value === null) {
    return null
  }

  if (value === "failed" || value === "succeeded") {
    return value
  }

  return "running"
}

function previewDiscovery(mode: PreviewMode): PreviewDiscovery {
  if (mode === "failed") {
    return failedDiscovery()
  }

  if (mode === "succeeded") {
    return succeededDiscovery()
  }

  return runningDiscovery()
}

function runningDiscovery(): PreviewDiscovery {
  const startedAt = previewStartedAt()

  return discovery(startedAt, {
    status: "running",
    steps: [
      homepageStep(startedAt, 0),
      aboutStep(startedAt, 12),
      linkedInStep(startedAt, 32),
      youtubeStep(startedAt, 70),
    ],
  })
}

function failedDiscovery(): PreviewDiscovery {
  const startedAt = previewStartedAt()

  return discovery(startedAt, {
    endedAt: startedAt + 52_000,
    error:
      "We could not read enough public website content to draft a profile.",
    status: "failed",
    steps: [
      homepageStep(startedAt, 0),
      aboutStep(startedAt, 18),
      businessStep(startedAt, 31),
      step(startedAt, 52, "error", "Stopped before extraction"),
    ],
  })
}

function succeededDiscovery(): PreviewDiscovery {
  const startedAt = previewStartedAt()

  return discovery(startedAt, {
    endedAt: startedAt + 64_000,
    status: "succeeded",
    steps: [
      homepageStep(startedAt, 0),
      aboutStep(startedAt, 14),
      enterpriseStep(startedAt, 33),
      step(startedAt, 48, "extracting", "Summarizing what we found"),
      step(startedAt, 64, "done", "Draft ready for review"),
    ],
  })
}

function discovery(
  startedAt: number,
  input: Pick<PreviewDiscovery, "status" | "steps"> &
    Partial<Pick<PreviewDiscovery, "endedAt" | "error">>
): PreviewDiscovery {
  return {
    _creationTime: startedAt,
    _id: "preview-discovery" as PreviewDiscovery["_id"],
    startedAt,
    tenantId: "preview-tenant",
    ...input,
  }
}

function previewStartedAt() {
  return Date.now() - previewElapsedMs
}

function homepageStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "reading",
    "Reading epidemicsound.com",
    "https://www.epidemicsound.com/"
  )
}

function aboutStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "exploring",
    "Exploring /about",
    "https://www.epidemicsound.com/about"
  )
}

function businessStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "exploring",
    "Exploring /business",
    "https://www.epidemicsound.com/business"
  )
}

function enterpriseStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "exploring",
    "Exploring /enterprise",
    "https://www.epidemicsound.com/enterprise"
  )
}

function linkedInStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "exploring",
    "Exploring linkedin.com/company/epidemic-sound",
    "https://www.linkedin.com/company/epidemic-sound"
  )
}

function youtubeStep(startedAt: number, offsetSeconds: number) {
  return step(
    startedAt,
    offsetSeconds,
    "exploring",
    "Exploring youtube.com/@epidemicsound",
    "https://www.youtube.com/@epidemicsound"
  )
}

function step(
  startedAt: number,
  offsetSeconds: number,
  kind: PreviewDiscovery["steps"][number]["kind"],
  label: string,
  url?: string
) {
  return {
    at: startedAt + offsetSeconds * 1000,
    kind,
    label,
    ...(url === undefined ? {} : { url }),
  }
}
