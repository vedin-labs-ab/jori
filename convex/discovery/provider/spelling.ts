export function words(text: string) {
  return (
    text
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
}

// A deletion neighborhood handles short typos and transpositions that the
// provider's >=6-character fuzzy operator cannot. Only titles get this index.
export function spellingKeys(title: string) {
  return [
    ...new Set(
      words(title).flatMap((word) => {
        const letters = Array.from(word)
        if (letters.length < 3 || letters.length > 32) {
          return []
        }
        return [
          word,
          ...letters.map((_, i) => letters.filter((_, j) => i !== j).join("")),
        ]
      })
    ),
  ]
}

export function lexicalBoost(query: string, title: string, snippet: string) {
  const needle = query.toLocaleLowerCase().trim()
  const name = title.toLocaleLowerCase()
  if (name === needle) {
    return 100
  }
  if (name.includes(needle)) {
    return 50
  }
  if (snippet.toLocaleLowerCase().includes(needle)) {
    return 25
  }
  const tokens = words(needle)
  const titleWords = words(title)
  if (
    tokens.length &&
    tokens.every((word) =>
      titleWords.some((candidate) => candidate.startsWith(word))
    )
  ) {
    return 15
  }
  return 0
}
