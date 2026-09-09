/** All web, export, and launcher artwork uses this geometry. */
export const brand = {
  size: 52,
  ink: "#000000",
  white: "#FFFFFF",
  body: "M12 0h28c6.6 0 12 5.4 12 12v28c0 6.6-5.4 12-12 12H12C5.4 52 0 46.6 0 40V12C0 5.4 5.4 0 12 0Z",
  slit: "M15 33h22c1.7 0 3 1.3 3 3s-1.3 3-3 3H15c-1.7 0-3-1.3-3-3s1.3-3 3-3Z",
} as const

export type BrandTheme = "light" | "dark"
