import { type ReactElement } from "react"
import {
  parseUsageDays,
  type UsageDays,
} from "@/shared/console/folders/usage/types"
import { type FolderId } from "../fixtures/types"
import { type DemoLocation } from "../navigation"
import { FolderPage, RootFoldersPage } from "./folders"
import { JobsPage } from "./jobs"
import { FilesPage, StoresPage, TablesPage } from "./lists"
import { FilePage } from "./materials/file"
import { StorePage } from "./materials/store"
import { TablePage } from "./materials/table"
import { PlatformPage } from "./platform"
import { RunsPage } from "./runs"
import { UsagePage } from "./usage"

/** Each material surface: its list, and the page for one of its own. */
const materialSurfaces: Record<
  string,
  { List: () => ReactElement; Page: (props: { id: string }) => ReactElement }
> = {
  files: { List: FilesPage, Page: ({ id }) => <FilePage fileId={id} /> },
  stores: { List: StoresPage, Page: ({ id }) => <StorePage storeId={id} /> },
  tables: { List: TablesPage, Page: ({ id }) => <TablePage tableId={id} /> },
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

  const material = materialSurfaces[surface]

  if (material === undefined) {
    return <PlatformPage surface={surface} />
  }

  return id === undefined ? <material.List /> : <material.Page id={id} />
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
