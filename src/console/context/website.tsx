import { useAction } from "convex/react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "../../../convex/_generated/api"

export function WebsitePanel({
  tenantId,
  website,
  isRunning,
}: {
  tenantId: string
  website: string | undefined
  isRunning: boolean
}) {
  const discover = useAction(api.organization.onboarding.discover)
  const [value, setValue] = useState(website ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = isRunning || isSubmitting
  const websiteMissing = website === undefined && value.trim() === ""
  const isDisabled = [busy, websiteMissing].some(Boolean)

  const onSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const trimmed = value.trim()
      await discover({
        tenantId,
        website: trimmed === "" ? undefined : trimmed,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't start.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Website</CardTitle>
        <CardDescription>
          Milo reads your public site to keep this profile current.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="yourcompany.com"
            disabled={busy}
          />
          <Button onClick={() => void onSubmit()} disabled={isDisabled}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {discoverLabel(website, busy)}
          </Button>
        </div>
        {error === null ? null : (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function discoverLabel(website: string | undefined, busy: boolean) {
  if (busy) {
    return "Discovering"
  }

  return website === undefined ? "Discover" : "Re-run"
}
