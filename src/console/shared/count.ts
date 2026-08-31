export function countLabel(count: number, singular: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralize(singular)}`
}

function pluralize(singular: string) {
  return singular.endsWith("y") ? `${singular.slice(0, -1)}ies` : `${singular}s`
}
