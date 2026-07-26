import { ReceiptText } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function BillingActivityEmpty() {
  return (
    <Empty className="min-h-40 rounded-none p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle>No billing activity yet</EmptyTitle>
        <EmptyDescription>Costs appear here as Jori works.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
