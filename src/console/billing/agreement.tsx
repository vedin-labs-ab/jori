import { useId } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { marketingUrl } from "@/shared/region/paths"

export function PurchaseAgreement({
  accepted,
  onChange,
}: {
  accepted: boolean
  onChange: (accepted: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 text-sm leading-6">
      <Checkbox
        checked={accepted}
        className="mt-1"
        id={id}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <label htmlFor={id}>
        I'm buying for business use, including freelance or sole-trader work,
        and I'm authorized to accept Jori's{" "}
        <a
          className="underline underline-offset-4"
          href={marketingUrl("/terms")}
          target="_blank"
          rel="noreferrer"
        >
          Terms
        </a>{" "}
        for this business.
      </label>
    </div>
  )
}
