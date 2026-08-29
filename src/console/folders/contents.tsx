import { Link } from "@tanstack/react-router"
import {
  CalendarClock,
  Database,
  Folder,
  FolderInput,
  FolderMinus,
  MoreHorizontal,
  Table2,
} from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fileKind } from "@/shared/files/kind"
import { ConsoleEmptyState } from "../shared/list/empty"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { MaterialScopeMark } from "../shared/materials/scope"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { type FolderContentsResult, type FolderResource } from "./types"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, each linking to its own surface. */
export function FolderContents({
  contents,
  newMenu,
  onMove,
  onUnfile,
}: {
  contents: FolderContentsResult | undefined
  /** The header's "New" menu again, as the empty state's call to action. */
  newMenu: ReactNode
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
}) {
  if (contents === undefined) {
    return <ConsoleListSkeleton />
  }

  if (contents.status !== "ready") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the folder</AlertTitle>
        <AlertDescription>
          {contents.status === "unauthorized"
            ? contents.message
            : "The folder may have been deleted."}
        </AlertDescription>
      </Alert>
    )
  }

  if (contents.folders.length === 0 && contents.resources.length === 0) {
    return (
      <ConsoleEmptyState
        action={newMenu}
        description="File tables, stores, files, and automations here, or add a subfolder."
        icon={Folder}
        title="Empty folder"
      />
    )
  }

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.folders.map((folder) => (
            <SubfolderRow folder={folder} key={folder.folderId} />
          ))}
          {contents.resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              onMove={onMove}
              onUnfile={onUnfile}
              resource={resource}
            />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

function SubfolderRow({
  folder,
}: {
  folder: FolderContentsResult["folders"][number]
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <Link
          className="flex items-center gap-2 font-medium hover:underline"
          params={{ folderId: folder.folderId }}
          title={folder.name}
          to="/folders/$folderId"
        >
          <Folder className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{folder.name}</span>
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">Folder</TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(folder.updatedAt)}
      >
        {relativeTime(folder.updatedAt, now)}
      </TableCell>
      <TableCell />
    </TableRow>
  )
}

function ResourceRow({
  onMove,
  onUnfile,
  resource,
}: {
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
  resource: FolderResource
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <ResourceLink resource={resource} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {resourceKindLabel(resource)}
          {resource.status === "paused" || resource.status === "completed" ? (
            <Badge variant="secondary">
              {resource.status === "paused" ? "Paused" : "Completed"}
            </Badge>
          ) : null}
        </span>
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(resource.updatedAt)}
      >
        {relativeTime(resource.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Open actions for ${resource.name}`}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onMove(resource)}>
              <FolderInput />
              Move to folder…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUnfile(resource)}>
              <FolderMinus />
              Remove from folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

/** The resource's own surface. Automations have no detail page — their list
 *  opens the editor — so an automation row lands on the list. */
function ResourceLink({ resource }: { resource: FolderResource }) {
  const Icon = resourceIcon(resource)
  const label = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{resource.name}</span>
      {resource.scope === "personal" ? (
        <MaterialScopeMark scope="personal" />
      ) : null}
    </>
  )
  const className = "flex items-center gap-2 font-medium hover:underline"

  switch (resource.type) {
    case "table":
      return (
        <Link
          className={className}
          params={{ tableId: resource.id }}
          title={resource.name}
          to="/tables/$tableId"
        >
          {label}
        </Link>
      )
    case "store":
      return (
        <Link
          className={className}
          params={{ storeId: resource.id }}
          title={resource.name}
          to="/stores/$storeId"
        >
          {label}
        </Link>
      )
    case "file":
      return (
        <Link
          className={className}
          params={{ fileId: resource.id }}
          title={resource.name}
          to="/files/$fileId"
        >
          {label}
        </Link>
      )
    case "automation":
      return (
        <Link className={className} title={resource.name} to="/automations">
          {label}
        </Link>
      )
  }
}

function resourceIcon(resource: FolderResource) {
  switch (resource.type) {
    case "table":
      return Table2
    case "store":
      return Database
    case "file":
      return fileKind(resource.mimeType ?? "", resource.name).icon
    case "automation":
      return CalendarClock
  }
}

function resourceKindLabel(resource: FolderResource) {
  switch (resource.type) {
    case "table":
      return "Table"
    case "store":
      return "Store"
    case "file":
      return fileKind(resource.mimeType ?? "", resource.name).label
    case "automation":
      return "Automation"
  }
}
