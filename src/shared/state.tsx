import { type ReactNode } from "react"
import { BrandMark } from "@/shared/brand"

export function RootStateFrame({
  action,
  children,
  description,
  icon,
  title,
}: {
  action: ReactNode
  children?: ReactNode
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-10 px-6 py-8">
      <BrandMark />
      <section className="grid max-w-xl gap-4">
        <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-muted-foreground *:size-4">
          {icon}
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-medium tracking-normal">{title}</h1>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
        {children}
        <div>{action}</div>
      </section>
    </main>
  )
}
