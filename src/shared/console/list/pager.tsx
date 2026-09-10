import { Loader2 } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { ConsoleListFooter } from "./frame"
import { ConsoleListLoading } from "./loading"

type ConsolePagerState = {
  canGoNext: boolean
  footerLabel: string | undefined
  isLoadingMore?: boolean
  isReady: boolean
  next: () => void
  pageIndex: number
  previous: () => void
}

export function ConsoleListPager({
  pagination,
}: {
  pagination: ConsolePagerState
}) {
  if (!pagination.isReady) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 @lg/list:flex-row @lg/list:items-center">
      <p className="min-h-4 text-muted-foreground text-xs">
        {pagination.footerLabel}
      </p>
      <Pagination className="mx-0 w-fit justify-start @lg/list:ml-auto @lg/list:justify-end">
        <PaginationContent className="gap-2">
          <PaginationItem>
            <Button
              disabled={pagination.pageIndex === 0}
              onClick={pagination.previous}
              type="button"
              variant="outline"
            >
              Previous
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              disabled={!pagination.canGoNext || pagination.isLoadingMore}
              onClick={pagination.next}
              type="button"
              variant="outline"
            >
              {pagination.isLoadingMore ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

/** The list region over its query: a spinner until the first result, then
 *  the list, with the pager underneath once there are rows to page. */
export function ConsoleListBody({
  children,
  isLoading,
  pagination,
}: {
  children: ReactNode
  isLoading: boolean
  pagination: ConsolePagerState | undefined
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  return (
    <>
      {children}
      {pagination === undefined ? null : (
        <ConsoleListFooter>
          <ConsoleListPager pagination={pagination} />
        </ConsoleListFooter>
      )}
    </>
  )
}
