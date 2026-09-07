import { createFileRoute } from "@tanstack/react-router"
import { handleIntegrationCallback } from "@/shared/session/handoff"
import { getToken } from "@/shared/session/server"

export const Route = createFileRoute("/api/integrations/callback")({
  server: {
    handlers: {
      GET: ({ request }) =>
        handleIntegrationCallback(request, {
          siteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
          getToken,
        }),
    },
  },
})
