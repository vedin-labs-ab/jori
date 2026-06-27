import { useMutation } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { FactsBody } from "./facts"
import { type ContextFacts, hasFacts, type OrganizationProfile } from "./types"

export function ContextProfile({
  tenantId,
  profile,
}: {
  tenantId: string
  profile: OrganizationProfile | undefined
}) {
  if (profile === undefined) {
    return <Skeleton className="h-44 w-full rounded-xl" />
  }

  return (
    <div className="grid gap-4">
      {profile?.proposed === undefined ? null : (
        <ProposedCard tenantId={tenantId} proposed={profile.proposed} />
      )}
      <ApprovedCard facts={profile} approvedAt={profile?.approvedAt} />
    </div>
  )
}

function ProposedCard({
  tenantId,
  proposed,
}: {
  tenantId: string
  proposed: ContextFacts
}) {
  const approve = useMutation(api.organization.profile.approve)
  const [isApproving, setIsApproving] = useState(false)

  const onApprove = async () => {
    setIsApproving(true)

    try {
      await approve({ tenantId })
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Proposed update</CardTitle>
        <CardDescription>
          Milo drafted this from your website. Review, then approve to use it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FactsBody facts={proposed} />
      </CardContent>
      <CardFooter>
        <Button onClick={() => void onApprove()} disabled={isApproving}>
          {isApproving ? "Approving…" : "Approve"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function ApprovedCard({
  facts,
  approvedAt,
}: {
  facts: ContextFacts | null
  approvedAt: number | undefined
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization profile</CardTitle>
        <CardDescription>
          {approvedAt === undefined
            ? "Approved facts are added to every run as context."
            : `Last approved ${formatDate(approvedAt)}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {facts !== null && hasFacts(facts) ? (
          <FactsBody facts={facts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Add your website to discover your organization.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
