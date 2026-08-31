import { useQuery } from "convex/react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { scrollFadeX } from "@/shared/fade"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../convex/_generated/api"
import { useShareExpired } from "./link"
import { ShareShell, ShareUnavailable } from "./shell"

/** Views a store through a share link or its public visibility, without a
 *  signed-in session: the current document, its version, and the schema it
 *  satisfies. */
export function StoreShareView({
  secret,
  storeId,
}: {
  secret: string | null
  storeId: string
}) {
  const store = useQuery(api.stores.share.get, {
    storeId,
    secret: secret ?? undefined,
  })
  const isExpired = useShareExpired(store?.expiresAt)
  const openPath = `/stores/${encodeURIComponent(storeId)}`

  if (store === undefined) {
    return <FullscreenSkeletonLoader aria-label="Loading store" />
  }

  if (store === null || isExpired) {
    return <ShareUnavailable openPath={openPath} />
  }

  return (
    <ShareShell
      isPublic={store.access === "public"}
      name={store.name}
      openPath={openPath}
    >
      {store.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{store.description}</p>
      )}
      <section className="grid gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">Document</h2>
          <Badge variant="secondary">v{store.version}</Badge>
        </div>
        <SharedJson
          empty="Nothing has been written to this store yet."
          value={store.value}
        />
      </section>
      <section className="grid gap-2">
        <h2 className="font-medium text-sm">Schema</h2>
        <SharedJson empty="No schema." value={store.schema} />
      </section>
    </ShareShell>
  )
}

function SharedJson({ empty, value }: { empty: string; value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-muted-foreground text-sm">{empty}</p>
  }

  return (
    <pre
      className={cn(
        scrollFadeX,
        "overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed"
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
