import { Progress } from "@/components/ui/progress"
import { BrandIcon } from "@/shared/brand"
import { Prop } from "../section"

/**
 * The console's billing band, in miniature.
 *
 * The page claims usage is billed at cost, drawn from prepaid credit, and
 * visible as a live tally. That is three sentences a reader has to take on
 * faith, or one picture of the thing itself: what is left, what it came from,
 * and what a month of real work actually spent.
 *
 * The numbers are a plausible month for a team of this size, not a promise.
 * The shape is what is being shown.
 */
export function UsageMeter() {
  return (
    <Prop
      label={
        <>
          <BrandIcon className="size-4" />
          <span className="font-medium text-foreground">Usage</span>
          <span className="ml-auto">Copperline</span>
        </>
      }
    >
      <div className="px-5 pt-4 pb-5">
        <p className="text-muted-foreground text-xs">Available usage</p>
        <p className="mt-1 font-medium text-2xl tabular-nums tracking-tight">
          $61.20
        </p>
        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 text-xs">
          <span className="text-muted-foreground">Monthly</span>
          <div className="flex min-w-0 items-center gap-3">
            <Progress className="h-1.5 flex-1" value={64} />
            <span className="shrink-0 tabular-nums">
              $48.20 <span className="text-muted-foreground">of $75.00</span>
            </span>
          </div>
          <span className="text-muted-foreground">Wallet</span>
          <span className="tabular-nums">
            $13.00 <span className="text-muted-foreground">· rolls over</span>
          </span>
        </div>
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        No invoice at the end of the month. Auto top-up is opt-in, and capped.
      </p>
    </Prop>
  )
}
