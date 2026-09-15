export type Shortcut = {
  key: string
  alt?: boolean
  shift?: boolean
  mod?: boolean
}

const apple =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

export function shortcutLabel(shortcut: Shortcut) {
  const modifiers = [
    shortcut.mod && (apple ? "⌘" : "Ctrl"),
    shortcut.alt && (apple ? "⌥" : "Alt"),
    shortcut.shift && (apple ? "⇧" : "Shift"),
  ].filter(Boolean)
  return [...modifiers, shortcut.key.toUpperCase()]
    .filter(Boolean)
    .join(apple ? "" : "+")
}

export function shortcutAria(shortcut: Shortcut) {
  return [
    shortcut.mod && (apple ? "Meta" : "Control"),
    shortcut.alt && "Alt",
    shortcut.shift && "Shift",
    shortcut.key.toUpperCase(),
  ]
    .filter(Boolean)
    .join("+")
}

export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut) {
  // Option changes event.key on macOS, even for digits. Use the physical
  // letter/digit for modified bindings so displayed shortcuts still work.
  const key = event.code.replace(/^(Key|Digit)/, "").toLowerCase()
  return (
    (key || event.key.toLowerCase()) === shortcut.key.toLowerCase() &&
    matchesModifiers(event, shortcut)
  )
}

export function matchesModifiers(
  event: KeyboardEvent,
  shortcut: Omit<Shortcut, "key">
) {
  return (
    event.altKey === Boolean(shortcut.alt) &&
    event.shiftKey === Boolean(shortcut.shift) &&
    (apple ? event.metaKey : event.ctrlKey) === Boolean(shortcut.mod) &&
    !(apple ? event.ctrlKey : event.metaKey) &&
    !event.getModifierState("AltGraph")
  )
}
