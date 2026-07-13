import { Link } from "@tanstack/react-router"
import { BrandMark } from "."

/** The brand mark as the way home on public surfaces. */
export function BrandLink() {
  return (
    <Link aria-label="Milo home" className="rounded-md" to="/">
      <BrandMark />
    </Link>
  )
}
