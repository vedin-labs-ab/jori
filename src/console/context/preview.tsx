import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { type OrganizationDiscovery } from "./types"
import { DiscoveryWorkingStep } from "./website"

type PreviewMode = "failed" | "running" | "succeeded"
type PreviewDiscovery = NonNullable<OrganizationDiscovery>

const searchParam = "discoveryPreview"
const baseTime = Date.UTC(2026, 5, 27, 10, 30)

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
  return discovery({
    status: "running",
    steps: [
      homepageStep(0),
      aboutStep(12),
      enterpriseStep(24),
      step(37, "extracting", "Summarizing what we found"),
    ],
  })
}

function failedDiscovery(): PreviewDiscovery {
  return discovery({
    endedAt: baseTime + 52_000,
    error:
      "We could not read enough public website content to draft a profile.",
    status: "failed",
    steps: [
      homepageStep(0),
      aboutStep(18),
      businessStep(31),
      step(52, "error", "Stopped before extraction"),
    ],
  })
}

function succeededDiscovery(): PreviewDiscovery {
  return discovery({
    endedAt: baseTime + 64_000,
    status: "succeeded",
    steps: [
      homepageStep(0),
      aboutStep(14),
      enterpriseStep(33),
      step(48, "extracting", "Summarizing what we found"),
      step(64, "done", "Draft ready for review"),
    ],
  })
}

function discovery(
  input: Pick<PreviewDiscovery, "status" | "steps"> &
    Partial<Pick<PreviewDiscovery, "endedAt" | "error">>
): PreviewDiscovery {
  return {
    _creationTime: baseTime,
    _id: "preview-discovery" as PreviewDiscovery["_id"],
    startedAt: baseTime,
    tenantId: "preview-tenant",
    ...input,
  }
}

function homepageStep(offsetSeconds: number) {
  return step(
    offsetSeconds,
    "reading",
    "Reading epidemicsound.com",
    "https://www.epidemicsound.com/"
  )
}

function aboutStep(offsetSeconds: number) {
  return step(
    offsetSeconds,
    "exploring",
    "Exploring /about",
    "https://www.epidemicsound.com/about"
  )
}

function businessStep(offsetSeconds: number) {
  return step(
    offsetSeconds,
    "exploring",
    "Exploring /business",
    "https://www.epidemicsound.com/business"
  )
}

function enterpriseStep(offsetSeconds: number) {
  return step(
    offsetSeconds,
    "exploring",
    "Exploring /enterprise",
    "https://www.epidemicsound.com/enterprise"
  )
}

function step(
  offsetSeconds: number,
  kind: PreviewDiscovery["steps"][number]["kind"],
  label: string,
  url?: string
) {
  return {
    at: baseTime + offsetSeconds * 1000,
    kind,
    label,
    ...(url === undefined ? {} : { url }),
  }
}
