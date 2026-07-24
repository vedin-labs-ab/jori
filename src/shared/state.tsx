import { type ReactNode } from "react"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { BrandMark } from "@/shared/brand"

/**
 * A whole-page state: not found, or an error the app could not recover from.
 *
 * It is the console's own empty state one size up. Same icon chip, same
 * centred rhythm, so a dead end reads as part of Milo rather than as a
 * different application's error screen. The mark stays top-left to say which
 * app you are still in.
 */
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
    // The mark sits at the page margin, as it does on sign-in, so the corner
    // is the same in every full-page view Milo serves.
    <main className="flex min-h-svh flex-col px-6 py-7 sm:px-10 sm:py-9">
      <header className="flex items-center">
        {/* A plain anchor, not a router link: this frame renders the root
            error boundary, so the way home must not depend on the router
            being in a state that can navigate. */}
        <a aria-label="Milo home" className="rounded-md" href="/">
          <BrandMark />
        </a>
      </header>
      {/* Optically centred: the bottom padding lifts the block off the true
          middle, which is what reads as centred to the eye. */}
      <Empty className="flex-1 pb-20">
        <EmptyHeader className="max-w-md gap-2">
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
          <EmptyTitle className="text-xl">{title}</EmptyTitle>
          <EmptyDescription className="text-sm/relaxed">
            {description}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-lg gap-4">
          {action}
          {children}
        </EmptyContent>
      </Empty>
    </main>
  )
}
