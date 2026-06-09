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
  children: ReactNode
  description: string
  logo: IntegrationLogo
  status?: ReactNode
  title: string
}) {
  return (
    <Card className="md:col-span-2">
      <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-start gap-4">
          <IntegrationLogoMark logo={logo} />
          <div className="grid min-w-0 gap-2">
            <div className="grid gap-1">
              <CardTitle className="text-base">{title}</CardTitle>
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
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

function IntegrationLogoMark({ logo }: { logo: IntegrationLogo }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-background">
      {"src" in logo ? (
        <img
          alt={logo.alt}
          className="size-7 object-contain"
          referrerPolicy="no-referrer"
          src={logo.src}
        />
      ) : (
        logo.mark
      )}
    </div>
  )
}
