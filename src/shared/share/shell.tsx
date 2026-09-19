import { Link } from "@tanstack/react-router"
import { AlertTriangle } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { RootStateFrame } from "@/shared/state"

/** Frame around every material share view: who is sharing, what it is, and
 *  a door into the member experience for viewers with an account. */
export function ShareShell({
  children,
  name,
  openPath,
}: {
  children: ReactNode
  name: string
  openPath: string
}) {
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Shared via Jori</p>
          <h1 className="truncate font-medium text-sm">{name}</h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={openPath}>Open in Jori</Link>
        </Button>
      </header>
      <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6">
        {children}
      </div>
    </main>
  )
}

export function ShareUnavailable({ openPath }: { openPath: string }) {
  return (
    <RootStateFrame
      title="This link is no longer available"
      description="The share link may have expired or been revoked."
      icon={<AlertTriangle />}
      action={
        <Button asChild variant="outline">
          <Link to={openPath}>Open in Jori</Link>
        </Button>
      }
    />
  )
}
