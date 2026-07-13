export type RunSectionLabelValue = {
  count: number
  singular: string
}

export function RunSectionLabel({ label }: { label: RunSectionLabelValue }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1">
      <span>{sectionLabelText(label)}</span>
      {label.count > 1 ? (
        <span className="font-normal text-[0.625rem] text-muted-foreground leading-none tabular-nums">
          {label.count}
        </span>
      ) : null}
    </span>
  )
}

function sectionLabelText(label: RunSectionLabelValue) {
  return label.count === 1 ? label.singular : `${label.singular}s`
}
