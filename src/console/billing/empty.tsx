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
    <Empty className="mt-3 h-48">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptText />
        </EmptyMedia>
        <EmptyTitle>No billing activity yet</EmptyTitle>
        <EmptyDescription>Costs appear here as Milo works.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
