import { useAuth, useListSessions, useSession } from "@better-auth-ui/react"
import { Card, CardContent } from "@/components/ui/card"
import { Section, SectionHeader } from "@/components/ui/section"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ActiveSession } from "./active-session"

export type ActiveSessionsProps = {
  className?: string
}

/** Active session list with current-session and revoke actions. */
export function ActiveSessions({ className }: ActiveSessionsProps) {
  const { authClient, localization } = useAuth()
  const { data: session } = useSession(authClient)

  const { data: sessions, isPending } = useListSessions(authClient)

  const activeSessions = [...(sessions ?? [])].sort((activeSession) =>
    activeSession.id === session?.session.id ? -1 : 1
  )

  return (
    <Section className={className}>
      <SectionHeader title={localization.settings.activeSessions} />

      <Card className="p-0">
        <CardContent className="p-0">
          {isPending ? (
            <SessionRowSkeleton />
          ) : (
            activeSessions?.map((activeSession, index) => (
              <div key={activeSession.id}>
                {index > 0 && <Separator />}

                <ActiveSession activeSession={activeSession} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Section>
  )
}

function SessionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="size-10 rounded-md" />

      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}
