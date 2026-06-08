import { type useOrganization } from "@clerk/tanstack-react-start"
import { useAction } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../convex/_generated/api"

export function OrganizationCard({
  organization,
}: {
  organization: NonNullable<ReturnType<typeof useOrganization>["organization"]>
}) {
  const [website, setWebsite] = useState(
    readWebsite(organization.publicMetadata)
  )
  const updateWebsite = useAction(api.identity.organization.updateWebsite)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  )

  useEffect(() => {
    setWebsite(readWebsite(organization.publicMetadata))
    setSaveStatus("idle")
  }, [organization.publicMetadata])

  async function saveWebsite() {
    setSaveStatus("saving")
    await updateWebsite({
      tenantId: organization.id,
      website: website.trim(),
    })
    setSaveStatus("saved")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          Clerk owns identity and organization setup.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1">
          <div className="text-sm font-medium">{organization.name}</div>
          <div className="text-xs text-muted-foreground">{organization.id}</div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="website">Website</Label>
          <div className="flex gap-2">
            <Input
              id="website"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value)
                setSaveStatus("idle")
              }}
              placeholder="https://company.com"
              type="url"
            />
            <Button
              type="button"
              variant="outline"
              onClick={saveWebsite}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function readWebsite(metadata: unknown) {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "website" in metadata &&
    typeof metadata.website === "string"
  ) {
    return metadata.website
  }

  return ""
}
