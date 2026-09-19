import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeader } from "@/components/ui/section"
import { api } from "../../../../convex/_generated/api"
import { gb } from "./format"

export function StorageNotice({ organizationId }: { organizationId: string }) {
  const [limit, setLimit] = useState(50)
  const notice = useQuery(api.files.capacity.retention.console.overview, {
    organizationId,
    limit,
  })
  if (notice == null) {
    return <StorageFull />
  }
  if (notice.excessBytes <= 0) {
    return null
  }
  return (
    <Section className="rounded-lg border p-4">
      <SectionHeader
        title="Your files exceed your storage capacity"
        description={`Free ${gb(notice.excessBytes)} GB or restore capacity in Billing. Downloads and deletion remain available.`}
      />
      <p className="text-sm">
        {notice.deadline === undefined
          ? "We will notify the workspace owner before a 30-day cleanup period begins."
          : `The newest excess files below are scheduled for deletion on ${new Date(notice.deadline).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}. Reducing usage or restoring capacity stops deletion.`}
      </p>
      {notice.files.length > 0 ? (
        <ul className="divide-y text-sm">
          {notice.files.map((file) => (
            <li
              className="flex items-center justify-between gap-3 py-2"
              key={file.fileId}
            >
              <Link
                className="truncate underline underline-offset-4"
                to="/files/$fileId"
                params={{ fileId: file.fileId }}
              >
                {file.name}
              </Link>
              <span className="shrink-0 tabular-nums">{gb(file.size)} GB</span>
            </li>
          ))}
        </ul>
      ) : null}
      {notice.hiddenCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {notice.hiddenCount} other files are private. Their contents and names
          are not shown.
        </p>
      ) : null}
      {notice.more ? (
        limit < 500 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit(Math.min(500, limit + 100))}
          >
            Show more files
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            More files are affected. Restore capacity or remove enough storage
            to keep the remaining files.
          </p>
        )
      ) : null}
    </Section>
  )
}

export function StorageFull() {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      Storage is full. Add capacity in Billing or delete files to upload more.
      Downloads remain available.
    </p>
  )
}
