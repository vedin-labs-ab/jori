import { type RefObject, useLayoutEffect, useRef } from "react"
import { type Binding, registerShortcuts } from "./registry"

/** Omit scope for product-wide shortcuts; pass an element for temporary
 * shortcuts in a dialog or view. Callbacks always use the latest render. */
export function useShortcuts(
  bindings: readonly Binding[],
  options: { enabled?: boolean; scope?: RefObject<HTMLElement | null> } = {}
) {
  const latest = useRef(bindings)
  useLayoutEffect(() => {
    latest.current = bindings
  })
  const { enabled = true, scope } = options
  useLayoutEffect(() => {
    if (enabled) {
      return registerShortcuts(() => ({
        bindings: latest.current,
        element: scope?.current,
      }))
    }
  }, [enabled, scope])
}
