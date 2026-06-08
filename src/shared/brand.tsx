export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/brand/mark/mark-black.svg"
        alt=""
        className="block size-8 dark:hidden"
      />
      <img
        src="/brand/mark/mark-white.svg"
        alt=""
        className="hidden size-8 dark:block"
      />
      <span className="text-base font-medium">Milo</span>
    </div>
  )
}
