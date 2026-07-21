import { getProviderName } from "@better-auth-ui/core"
import type { SocialProvider } from "better-auth/social-providers"

const providerParameter = "authProvider"

type OAuthFeedback = {
  message: string
}

export function signInErrorCallbackURL(provider: SocialProvider) {
  const errorCallbackURL = cleanOAuthURL(new URL(window.location.href))
  errorCallbackURL.searchParams.set(providerParameter, provider)

  return errorCallbackURL.toString()
}

export function readOAuthFeedback({
  url = new URL(window.location.href),
}: {
  url?: URL
} = {}): OAuthFeedback | null {
  const provider = socialProvider(url.searchParams.get(providerParameter))

  if (provider === null) {
    return null
  }

  const error = url.searchParams.get("error")

  if (error === null) {
    return null
  }

  return {
    message: oauthErrorMessage({ error, provider }),
  }
}

export function clearOAuthFeedback() {
  const url = cleanOAuthURL(new URL(window.location.href))
  window.history.replaceState(window.history.state, "", url)
}

function cleanOAuthURL(url: URL) {
  url.searchParams.delete(providerParameter)
  url.searchParams.delete("error")
  url.searchParams.delete("error_description")
  return url
}

function socialProvider(value: string | null): SocialProvider | null {
  return value === "google" || value === "microsoft" ? value : null
}

function oauthErrorMessage({
  error,
  provider,
}: {
  error: string
  provider: SocialProvider
}) {
  const providerName = getProviderName(provider)

  if (error === "access_denied") {
    return `${providerName} sign-in was canceled.`
  }

  if (error === "account_not_linked") {
    return `This Milo account does not use ${providerName} sign-in. Use the provider you originally chose.`
  }

  if (error === "state_not_found" || error === "state_mismatch") {
    return `The ${providerName} sign-in request expired. Try again.`
  }

  return `We couldn't complete ${providerName} sign-in. Try again.`
}
