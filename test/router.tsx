/**
 * A stand-in for TanStack Router's `Link`, for component tests that render a
 * link but do not mount a router. Substitutes route params positionally, the
 * way the real router resolves `$param` segments.
 */
export const Link = ({
  params,
  to,
  ...props
}: {
  params?: Record<string, string>
  to: string
} & React.ComponentProps<"a">) => (
  <a
    href={Object.values(params ?? {}).reduce(
      (path, value) => path.replace(/\$\w+/, value),
      to
    )}
    {...props}
  />
)
