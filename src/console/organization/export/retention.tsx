import { useQuery } from "convex/react"
import { CalendarX2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Section, SectionHeader } from "@/components/ui/section"
import { longDate } from "@/shared/console/time"
import { api } from "../../../../convex/_generated/api"

/** The deletion an ended subscription schedules, as one row in the
 *  construction the danger zone uses, placed first: the date leads, then
 *  the cause and the two ways out, and the way that keeps the data is one
 *  click away. */
export function RetentionNotice({
  onOpenBilling,
  organizationId,
}: {
  onOpenBilling: () => void
  organizationId: string
}) {
  const retention = useQuery(api.retention.console.status, { organizationId })
  if (!retention) {
    return null
  }
  const retained = retention.state === "retained"
  return (
    <Section role="status">
      <SectionHeader
        icon={<CalendarX2 className="text-destructive" />}
        title="Scheduled deletion"
      />
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              {retained
                ? `This organization will be deleted on ${longDate(retention.deletesAt)}`
                : "This organization is being deleted"}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {retained
                ? "The subscription has ended. Subscribe again to keep everything, or export your data before that date."
                : "Its data can no longer be restored."}
              {retention.blocked && (
                <> Contact support@usejori.com to finish closing the account.</>
              )}
            </CardDescription>
          </div>
          {retained && (
            <Button onClick={onOpenBilling} size="sm" variant="outline">
              Open Billing
            </Button>
          )}
        </CardContent>
      </Card>
    </Section>
  )
}
