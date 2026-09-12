import {
  type OrganizationAuthClient,
  useAuth,
  useHasPermission,
} from "@better-auth-ui/react"
import { useConvex } from "convex/react"
import { HardDriveDownload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Section, SectionHeader } from "@/components/ui/section"
import { saveExport, workspaceExport } from "./download"

/** The workspace's data as a download, for whoever may delete the
 *  workspace: one row in the construction the danger zone uses, since
 *  export is what comes before leaving. The file is NDJSON with files
 *  embedded as base64, which the download itself shows. */
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
      <SectionHeader icon={<HardDriveDownload />} title="Data" />
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Export data</CardTitle>
            <CardDescription className="mt-0.5">
              Download the chats, jobs, folders, tables, stores, and files you
              can access. Keep this page open until it finishes.
            </CardDescription>
          </div>
          <Button
            disabled={pending}
            onClick={download}
            size="sm"
            variant="outline"
          >
            {pending ? "Preparing…" : "Export"}
          </Button>
        </CardContent>
      </Card>
    </Section>
  )
}
