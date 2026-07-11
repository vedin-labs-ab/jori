// Radix dialog-family layers defer their outside dismissal to the gesture's
// click, while popup layers (selects, menus, popovers) dismiss on its
// pointerdown. By click time the popup has unmounted and its suppression is
// gone, so the same gesture would also close the dialog beneath it. The fix
// mirrors who knows what: a popup's pointer-down-outside handler only runs
// when it is the acting, topmost layer, so it claims the gesture; deferred
// containers decline gestures a popup already claimed.

let claimed = false

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    () => {
      claimed = false
    },
    { capture: true }
  )
}

/** Popup contents call this from onPointerDownOutside: the gesture that
 *  dismisses them is spent. */
export function claimDismissGesture() {
  claimed = true
}

/** Wraps a content's onPointerDownOutside so the popup claims the gesture
 *  before the caller's own handler runs. */
export function claimingPointerDownOutside<Event>(
  handler: ((event: Event) => void) | undefined
) {
  return (event: Event) => {
    claimDismissGesture()
    handler?.(event)
  }
}

/** Deferred containers (dialog, sheet) skip dismissal for claimed gestures. */
export function isDismissGestureClaimed() {
  return claimed
}
