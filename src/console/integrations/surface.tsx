import { type ReactNode } from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type IntegrationLogo =
  | {
      alt: string
      src: string
    }
  | {
      mark: ReactNode
    }

export function IntegrationSurface({
  action,
  children,
  description,
  logo,
  status,
  title,
}: {
  action?: ReactNode
  children?: ReactNode
  description: string
  logo: IntegrationLogo
  status?: ReactNode
  title: string
}) {
  return (
    <Card className="gap-0 py-0 md:col-span-2">
      <CardHeader className="gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <IntegrationLogoMark logo={logo} />
          <div className="grid min-w-0 gap-2">
            <div className="grid gap-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              {status}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {action === undefined ? null : (
          <CardAction className="static row-auto self-start justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end">
            {action}
          </CardAction>
        )}
      </CardHeader>
      {children === undefined ? null : (
        <div className="border-t">
          <CardContent className="grid gap-4 px-5 py-5 sm:px-6">
            {children}
          </CardContent>
        </div>
      )}
    </Card>
  )
}

function IntegrationLogoMark({ logo }: { logo: IntegrationLogo }) {
  if ("src" in logo) {
    return (
      <img
        alt={logo.alt}
        className="size-11 shrink-0 object-contain"
        referrerPolicy="no-referrer"
        src={logo.src}
      />
    )
  }

  return logo.mark
}
