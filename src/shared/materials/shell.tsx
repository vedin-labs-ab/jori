import { AlertTriangle } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"

/** Frame around every material share view: who is sharing, what it is, and
 *  a door into the member experience for viewers with an account. */
export function ShareShell({
  children,
  isPublic = false,
  name,
  openPath,
}: {
  children: ReactNode
  /** Reached through public visibility rather than a share link. */
  isPublic?: boolean
  name: string
  openPath: string
}) {
  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">
            {isPublic ? "Public via Jori" : "Shared via Jori"}
          </p>
          <h1 className="truncate font-medium text-sm">{name}</h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={openPath}>Open in Jori</a>
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
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="font-medium text-lg">
          This link is no longer available
        </h1>
        <p className="text-muted-foreground text-sm">
          The share link may have expired or been revoked.
        </p>
      </div>
      <Button asChild variant="outline">
        <a href={openPath}>Open in Jori</a>
      </Button>
    </main>
  )
}
