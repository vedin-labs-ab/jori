/** The element a skip link lands on. Whatever carries it is the page's main
 *  content, and it needs `tabIndex={-1}` so focus can actually go there. */
export const mainContentId = "main-content"

/**
 * The first thing in the tab order, on every shell.
 *
 * The console repeats a sidebar of eight destinations and an organization
 * switcher ahead of the page on every route, and the marketing site repeats
 * its header. Getting past that with the keyboard should take one key rather
 * than eleven, which is what WCAG 2.4.1 asks for.
 *
 * A plain anchor, so it works before hydration.
 */
export function SkipToContent() {
  return (
    <a
      // Plain `focus`, not `focus-visible`: the link is clipped to a pixel, so
      // the keyboard is the only way to reach it and it has to appear however
      // focus arrived. Every visual property waits for that moment; left on
      // the element at rest they would beat `sr-only`'s own reset and give the
      // hidden link a box.
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:bg-background focus:px-3 focus:py-2 focus:font-medium focus:text-foreground focus:text-sm focus:shadow-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
      href={`#${mainContentId}`}
    >
      Skip to content
    </a>
  )
}
