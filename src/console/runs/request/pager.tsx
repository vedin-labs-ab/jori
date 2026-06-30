import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { type RunRequestNavigation } from "./carousel"

export function RunRequestPager({
  navigation,
}: {
  navigation?: RunRequestNavigation
}) {
  if (navigation === undefined || navigation.count <= 1) {
    return null
  }

  const position = navigation.index + 1
  const label = `${navigation.itemLabel} ${position} of ${navigation.count}`

  return (
    <div className="h-5 shrink-0">
      <ButtonGroup
        aria-label={`${navigation.itemLabel} navigation`}
        className="h-5"
      >
        <Button
          aria-label={`Previous ${navigation.itemLabel}`}
          className="size-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={navigation.onPrevious}
          size="icon-xs"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="size-3" />
        </Button>
        <Button
          aria-label={`Next ${navigation.itemLabel}`}
          className="size-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={navigation.onNext}
          size="icon-xs"
          type="button"
          variant="outline"
        >
          <ChevronRight className="size-3" />
        </Button>
      </ButtonGroup>
      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  )
}
