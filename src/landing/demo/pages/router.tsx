import { type ReactElement } from "react"
import {
  parseUsageDays,
  type UsageDays,
} from "@/shared/console/folders/usage/types"
import { type FolderId } from "../fixtures/types"
import { type DemoLocation } from "../navigation"
import { MaterialPage, PlatformPage } from "./detail"
import { FolderPage, RootFoldersPage } from "./folders"
import { JobsPage } from "./jobs"
import { FilesPage, StoresPage, TablesPage } from "./lists"
import { RunsPage } from "./runs"
import { TablePage } from "./table"
import { UsagePage } from "./usage"

const materialLists: Record<string, () => ReactElement> = {
  files: FilesPage,
  stores: StoresPage,
  tables: TablesPage,
}

/** The page for a path, the way the console's routes divide them. */
export function DemoPage({
  location,
  openRunId,
}: {
  location: DemoLocation
  /** The run the Activity page shows open from the start. */
  openRunId?: string
}) {
  const { pathname, search } = location
  const [, surface = "", id, tail] = pathname.split("/")

  if (surface === "folders") {
    return (
      <FolderSurface
        days={parseUsageDays(Number(search.days))}
        id={id}
        tail={tail}
      />
    )
  }

  if (surface === "runs") {
    return <RunsPage openRunId={openRunId} />
  }

  if (surface === "jobs") {
    return <JobsPage />
  }

  const List = materialLists[surface]

  if (List === undefined) {
    return <PlatformPage surface={surface} />
  }

  if (id === undefined) {
    return <List />
  }

  return surface === "tables" ? (
    <TablePage tableId={id} />
  ) : (
    <MaterialPage materialId={id} />
  )
}

/** Under /folders: the roots, the whole tree's usage, one folder, or that
 *  folder's usage. */
function FolderSurface({
  days,
  id,
  tail,
}: {
  days: UsageDays
  id: string | undefined
  tail: string | undefined
}) {
  if (id === undefined) {
    return <RootFoldersPage />
  }

  if (id === "usage") {
    return <UsagePage days={days} />
  }

  if (tail === "usage") {
    return <UsagePage days={days} folderId={id as FolderId} />
  }

  return <FolderPage folderId={id} />
}
