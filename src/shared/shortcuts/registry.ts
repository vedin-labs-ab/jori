import { matchesShortcut, type Shortcut } from "./keys"

export type Binding = {
  shortcut: Shortcut
  run: () => void
  allowInInput?: boolean
}
export type Scope = {
  bindings: readonly Binding[]
  element?: HTMLElement | null
}
const scopes = new Set<() => Scope>()
const dialog = '[role="dialog"], [role="alertdialog"], [role="menu"]'
const editing =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'

/** Newest matching scope wins. A scoped binding never escapes its element;
 * global bindings leave dialogs and typing alone unless explicitly allowed. */
function dispatch(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229
  ) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  const ordered = [...scopes]
    .reverse()
    .map((read) => read())
    .sort(
      (a, b) =>
        Number(b.element !== undefined) - Number(a.element !== undefined)
    )
  for (const scope of ordered) {
    const binding = scope.bindings.find(
      (item) =>
        matchesShortcut(event, item.shortcut) &&
        isShortcutTarget(target, scope.element, item.allowInInput)
    )
    if (binding) {
      event.preventDefault()
      binding.run()
      return
    }
  }
}

function containsTarget(scope: Pick<Scope, "element">, target: Element) {
  if (scope.element === undefined) {
    return !target.closest(dialog)
  }
  return Boolean(
    scope.element?.contains(target) &&
      scope.element.closest(dialog) === target.closest(dialog)
  )
}

export function registerShortcuts(read: () => Scope) {
  if (!scopes.size) {
    window.addEventListener("keydown", dispatch)
  }
  scopes.add(read)
  return () => {
    scopes.delete(read)
    if (!scopes.size) {
      window.removeEventListener("keydown", dispatch)
    }
  }
}

export function isShortcutTarget(
  target: EventTarget | null,
  element: HTMLElement | null | undefined,
  allowInInput = false
) {
  return (
    target instanceof Element &&
    containsTarget({ element }, target) &&
    (allowInInput || !target.closest(editing))
  )
}
