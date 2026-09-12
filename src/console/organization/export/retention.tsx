import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"

export function RetentionNotice({
  organizationId,
}: {
  organizationId: string
}) {
  const retention = useQuery(api.retention.console.status, { organizationId })
  if (!retention) {
    return null
  }
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {retention.state === "retained" ? (
        <>
          This workspace is scheduled for deletion on{" "}
          {new Date(retention.deletesAt).toLocaleDateString(undefined, {
            dateStyle: "long",
          })}
          . Reactivate your subscription to keep it, or export your data before
          then.
        </>
      ) : (
        "This workspace is being deleted. You can no longer restore its data."
      )}
      {retention.blocked && (
        <> Contact support@usejori.com to complete the account closure.</>
      )}
    </p>
  )
}
