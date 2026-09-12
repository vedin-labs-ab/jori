import {
  type OrganizationAuthClient,
  useAuth,
  useHasPermission,
} from "@better-auth-ui/react"
import { useConvex } from "convex/react"
import { Download } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Section, SectionHeader } from "@/components/ui/section"
import { saveExport, workspaceExport } from "./download"

export function WorkspaceExport({
  organizationId,
}: {
  organizationId: string
}) {
  const client = useConvex()
  const { authClient } = useAuth()
  const { data: permission } = useHasPermission(
    authClient as OrganizationAuthClient,
    { permissions: { organization: ["delete"] } }
  )
  const [pending, setPending] = useState(false)
  if (!permission?.success) {
    return null
  }
  async function download() {
    setPending(true)
    try {
      saveExport(await workspaceExport(client, organizationId))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again."
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <Section>
      <SectionHeader
        title="Export workspace data"
        icon={<Download />}
        description="Download the chats, jobs, folders, tables, stores and files you can access. For a complete business export, including other members' private content, contact support."
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={download}
          >
            {pending ? "Preparing…" : "Export data"}
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">
        The download uses NDJSON with files embedded as base64. Keep this page
        open until it finishes.
      </p>
    </Section>
  )
}
