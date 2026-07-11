import { type ReactNode } from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type SurfaceLogo =
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
  logo: SurfaceLogo
  status?: ReactNode
  title: string
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <IntegrationLogoMark logo={logo} />
          <div className="grid min-w-0 gap-2">
            <div className="grid gap-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              {status}
            </div>
            <p className="max-w-3xl text-muted-foreground text-sm">
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
        <div className="mt-auto border-t">
          <CardContent className="grid gap-4 p-4 sm:p-5">
            {children}
          </CardContent>
        </div>
      )}
    </Card>
  )
}

function IntegrationLogoMark({ logo }: { logo: SurfaceLogo }) {
  const containerClassName =
    "flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted"

  if ("src" in logo) {
    return (
      <div className={containerClassName}>
        <img
          alt={logo.alt}
          className="size-6 object-contain"
          referrerPolicy="no-referrer"
          src={logo.src}
        />
      </div>
    )
  }

  return (
    <div className={`${containerClassName} [&>svg]:size-6`}>{logo.mark}</div>
  )
}
