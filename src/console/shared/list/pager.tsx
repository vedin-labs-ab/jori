import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

export type ConsolePagerState = {
  canGoNext: boolean
  footerLabel: string
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">{pagination.footerLabel}</p>
      <Pagination className="mx-0 w-fit justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={pagination.pageIndex === 0}
              className={cn(
                pagination.pageIndex === 0 &&
                  "pointer-events-none opacity-50 shadow-none"
              )}
              href="#"
              onClick={(event) => {
                event.preventDefault()
                pagination.previous()
              }}
            />
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
