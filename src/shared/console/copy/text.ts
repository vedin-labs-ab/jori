/** Puts the text, or what the getter fetches, on the clipboard. Answers
 *  whether it got there; a refusal is nothing to shout about. */
export function copyText(value: string | (() => Promise<string>)) {
  const text = typeof value === "string" ? Promise.resolve(value) : value()

  return text
    .then((resolved) => navigator.clipboard.writeText(resolved))
    .then(
      () => true,
      () => false
    )
}
