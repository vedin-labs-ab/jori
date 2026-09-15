import { type Hit } from "@contracts/discovery"
import { useConvex } from "convex/react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { toast } from "sonner"
import { hitDestination } from "@/shared/console/discovery/results"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { api } from "../../../convex/_generated/api"

export function useOpenHit(
  organizationId: string | undefined,
  text: string,
  open: boolean,
  onClose: () => void
) {
  const navigate = useConsoleNavigate()
  const convex = useConvex()
  const current = useRef({ organizationId, text, open, version: 0 })
  useLayoutEffect(() => {
    current.current = { organizationId, text, open, version: 0 }
  }, [organizationId, text, open])
  useEffect(
    () => () => {
      current.current.open = false
    },
    []
  )
  return async (hit: Hit) => {
    const attempt = current.current
    if (!attempt.organizationId || !attempt.open) {
      return
    }
    const version = ++attempt.version
    const active = () =>
      current.current === attempt && attempt.open && attempt.version === version
    try {
      const visible = await convex.query(api.discovery.console.visible, {
        organizationId: attempt.organizationId,
        text: attempt.text,
        candidates: [hit.candidate],
      })
      if (!active()) {
        return
      }
      if (!visible.length) {
        toast.error("This result is no longer available.")
        return
      }
      onClose()
      navigate(hitDestination(visible[0]))
    } catch {
      if (active()) {
        toast.error("Could not open this result. Try again.")
      }
    }
  }
}
