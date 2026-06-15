import { BookOpenCheck } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ConsolePage } from "../page"

export function Playbooks() {
  return (
    <ConsolePage>
      {() => (
        <Empty className="min-h-64">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck />
            </EmptyMedia>
            <EmptyTitle>No playbooks yet</EmptyTitle>
            <EmptyDescription>
              Curated playbooks will appear here when they are ready to enable.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </ConsolePage>
  )
}
