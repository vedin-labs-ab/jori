import { useCallback, useEffect, useState } from "react"

export type RunRequestNavigation = {
  count: number
  index: number
  itemLabel: string
  onNext: () => void
  onPrevious: () => void
}

export function useRunRequestCarousel(count: number) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex((current) => (count === 0 ? 0 : Math.min(current, count - 1)))
  }, [count])

  const onPrevious = useCallback(() => {
    setIndex((current) => wrapIndex(current - 1, count))
  }, [count])

  const onNext = useCallback(() => {
    setIndex((current) => wrapIndex(current + 1, count))
  }, [count])

  return { index, onNext, onPrevious }
}

function wrapIndex(index: number, count: number) {
  if (count <= 1) {
    return 0
  }

  return (index + count) % count
}
