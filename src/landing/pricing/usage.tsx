import { Progress } from "@/components/ui/progress"
import { BrandIcon } from "@/shared/brand"
import { Organization } from "../demo/organization"
import { Prop } from "../section"

/** Illustrative balances show how monthly usage and prepaid credit combine. */
export function UsageMeter() {
  return (
    <Prop
      hint={<Organization />}
      label={
        <>
          <BrandIcon className="size-4" />
          Example usage
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
        Monthly is what the plan includes. Wallet is credit you add on top.
      </p>
    </Prop>
  )
}
