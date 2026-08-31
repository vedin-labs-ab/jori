import { formatUsd } from "@contracts/billing"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { type UsageDay, usageDayLabel } from "./types"

// Daily spend is discrete — a day either cost something or it did not — so
// both charts are bars rather than lines. The palette stays the console's
// neutral chart ramp; failures alone earn a colour, and it is the one the
// rest of the product already uses for something going wrong.

const spendConfig = {
  micros: { label: "Spend", color: "var(--chart-2)" },
} satisfies ChartConfig

const runsConfig = {
  completed: { label: "Completed", color: "var(--chart-2)" },
  failed: { label: "Failed", color: "var(--destructive)" },
} satisfies ChartConfig

/** Wide and short: ninety bars have to stay readable, and the shape of the
 *  month is the point rather than the exact height of any one day. */
const chartClassName = "aspect-auto h-40 w-full"

export function UsageSpendChart({ series }: { series: UsageDay[] }) {
  return (
    <ChartContainer className={chartClassName} config={spendConfig}>
      <BarChart accessibilityLayer data={series} margin={chartMargin}>
        <CartesianGrid vertical={false} />
        <DayAxis />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="tabular-nums">{formatUsd(Number(value))}</span>
              )}
              hideIndicator
              labelFormatter={(label) => usageDayLabel(String(label), "long")}
            />
          }
          cursor={false}
        />
        <Bar dataKey="micros" fill="var(--color-micros)" radius={2} />
      </BarChart>
    </ChartContainer>
  )
}

/** Runs stack rather than overlay: the bar's height is the day's ended
 *  runs, and the slice at its top is how many of those failed, so a bad day
 *  is visible without reading a legend. */
export function UsageRunsChart({ series }: { series: UsageDay[] }) {
  const stacked = series.map((day) => ({
    ...day,
    completed: day.ended - day.failed,
  }))

  return (
    <ChartContainer className={chartClassName} config={runsConfig}>
      <BarChart accessibilityLayer data={stacked} margin={chartMargin}>
        <CartesianGrid vertical={false} />
        <DayAxis />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => usageDayLabel(String(label), "long")}
            />
          }
          cursor={false}
        />
        <Bar
          dataKey="completed"
          fill="var(--color-completed)"
          radius={[0, 0, 2, 2]}
          stackId="runs"
        />
        <Bar
          dataKey="failed"
          fill="var(--color-failed)"
          radius={[2, 2, 0, 0]}
          stackId="runs"
        />
      </BarChart>
    </ChartContainer>
  )
}

const chartMargin = { left: 0, right: 0, top: 4 }

/** Ticks thin themselves out as the window grows, so a ninety-day axis
 *  reads as a handful of dates rather than a smear. */
function DayAxis() {
  return (
    <XAxis
      axisLine={false}
      dataKey="date"
      minTickGap={24}
      tickFormatter={(value: string) => usageDayLabel(value)}
      tickLine={false}
      tickMargin={8}
    />
  )
}
