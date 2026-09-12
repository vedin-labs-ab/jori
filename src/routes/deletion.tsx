import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { PublicConsoleFrame } from "@/console/shell/public"
import { useSession } from "@/shared/session/auth"

export const Route = createFileRoute("/deletion")({
  component: DeletionPage,
  head: () => ({ meta: [{ title: "Workspace deletion · Jori" }] }),
})

function DeletionPage() {
  const { data: session } = useSession()
  return (
    <PublicConsoleFrame isSignedIn={Boolean(session)}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">
          Workspace deletion has started
        </h1>
        <p className="text-sm text-muted-foreground">
          Jori is stopping connected work and removing this workspace's data.
          This cannot be undone. Your account and other workspaces remain
          available.
        </p>
        <p className="text-sm text-muted-foreground">
          For help, contact{" "}
          <a className="underline" href="mailto:support@usejori.com">
            support@usejori.com
          </a>
          .
        </p>
        <Button asChild variant="outline">
          <a href="/">Back to Jori</a>
        </Button>
      </div>
    </PublicConsoleFrame>
  )
}
