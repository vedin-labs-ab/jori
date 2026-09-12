/** A mark as the provider ships it. An `ink` mark is drawn in a single
 *  dark ink and inverts with the scheme; a colored one holds its brand
 *  colors on either ground. */
export type LogoFile = {
  ink?: boolean
  src: string
}

const providerLogos: Record<string, LogoFile> = {
  github: { ink: true, src: "/logos/integrations/github.svg" },
  gmail: { src: "/logos/integrations/gmail.svg" },
  googleCalendar: { src: "/logos/integrations/google-calendar.svg" },
  linear: { src: "/logos/integrations/linear.svg" },
  microsoftCalendar: { src: "/logos/integrations/microsoft-calendar.svg" },
  microsoftEmail: { src: "/logos/integrations/microsoft-email.svg" },
  notion: { src: "/logos/integrations/notion.svg" },
  slack: { src: "/logos/integrations/slack.svg" },
}

export function providerLogo(surface: string | undefined) {
  return surface === undefined ? undefined : providerLogos[surface]
}
