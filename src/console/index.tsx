import { LayoutDashboard } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ConsolePage } from "./page"
import { ConsolePageLayout } from "./shared/layout"

export function Console() {
  return (
    <ConsolePage>
      {() => (
        <ConsolePageLayout>
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutDashboard />
              </EmptyMedia>
              <EmptyTitle>No overview yet</EmptyTitle>
              <EmptyDescription>
                Useful workspace activity will appear here when there is
                something to summarize.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ConsolePageLayout>
      )}
    </ConsolePage>
  )
}
