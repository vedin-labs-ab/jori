export type CountedNoun = { plural: string; singular: string }

export function countLabel(count: number, singular: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralize(singular)}`
}

function pluralize(singular: string) {
  return singular.endsWith("y") ? `${singular.slice(0, -1)}ies` : `${singular}s`
}

/** "3 tables" / "1 table" — for nouns whose plural is spelled out. */
export function countNoun(count: number, noun: CountedNoun) {
  return `${count} ${count === 1 ? noun.singular : noun.plural}`
}
