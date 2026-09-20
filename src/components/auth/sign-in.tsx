import { authMutationKeys } from "@better-auth-ui/core"
import { useAuth, useFetchOptions, useSignInEmail } from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import { type ReactNode, type SyntheticEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { OAuthFeedback } from "./oauth-feedback"
import { ProviderButtons, type SocialLayout } from "./provider-buttons"

export type SignInProps = {
  className?: string
  description?: ReactNode
  headerContent?: ReactNode
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
  title?: ReactNode
}

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * @param className - Optional additional container class names
 * @param description - Optional supporting copy rendered below the title
 * @param headerContent - Optional content rendered between the title and form
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @param title - Optional title override
 * @returns The rendered sign-in UI as a JSX element
 */
export function SignIn({
  className,
  description,
  headerContent,
  socialLayout,
  socialPosition = "bottom",
  title
}: SignInProps) {
  const {
    authClient,
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link
  } = useAuth()

  const { fetchOptions, resetFetchOptions } = useFetchOptions()

  const [password, setPassword] = useState("")

  const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
    authClient,
    {
      onError: (error, { email }) => {
        setPassword("")

        if (error.error?.code === "EMAIL_NOT_VERIFIED") {
          sessionStorage.setItem("better-auth-ui.verify-email", email)
          navigate({
            to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`
          })
        }

        resetFetchOptions()
      },
      onSuccess: () => navigate({ to: redirectTo })
    }
  )

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all
  })
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all
  })
  const isPending = signInMutating + signUpMutating > 0

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const rememberMe = formData.get("rememberMe") === "on"

    signInEmail({
      email,
      password,
      ...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
      fetchOptions
    })
  }

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <OAuthFeedback />
      <CardHeader>
        <CardTitle
          aria-level={1}
          className="text-center text-2xl font-semibold tracking-tight"
          role="heading"
        >
          {title ?? localization.auth.signIn}
        </CardTitle>
        {description && (
          <CardDescription className="mt-1 text-center text-sm/relaxed">
            {description}
          </CardDescription>
        )}
        {headerContent}
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card m-0 text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={!!fieldErrors.email}>
                  <Label htmlFor="email">{localization.auth.email}</Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={localization.auth.emailPlaceholder}
                    required
                    disabled={isPending}
                    onChange={() => {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined
                      }))
                    }}
                    onInvalid={(e) => {
                      e.preventDefault()
                      const el = e.target as HTMLInputElement
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : localization.auth.invalidEmail

                      setFieldErrors((prev) => ({
                        ...prev,
                        email: msg
                      }))
                    }}
                    aria-describedby={fieldErrors.email ? "sign-in-email-error" : undefined}
                  aria-invalid={!!fieldErrors.email}
                  />

                  <FieldError id="sign-in-email-error">{fieldErrors.email}</FieldError>
                </Field>

                <Field data-invalid={!!fieldErrors.password}>
                  <Label htmlFor="password">{localization.auth.password}</Label>

                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)

                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined
                      }))
                    }}
                    placeholder={localization.auth.passwordPlaceholder}
                    required
                    minLength={emailAndPassword?.minPasswordLength}
                    maxLength={emailAndPassword?.maxPasswordLength}
                    disabled={isPending}
                    onInvalid={(e) => {
                      e.preventDefault()
                      const el = e.target as HTMLInputElement
                      const min = emailAndPassword?.minPasswordLength
                      const max = emailAndPassword?.maxPasswordLength
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : el.validity.tooShort
                          ? localization.auth.tooShort.replace(
                              "{{min}}",
                              String(min)
                            )
                          : localization.auth.tooLong.replace(
                              "{{max}}",
                              String(max)
                            )

                      setFieldErrors((prev) => ({
                        ...prev,
                        password: msg
                      }))
                    }}
                    aria-describedby={fieldErrors.password ? "sign-in-password-error" : undefined}
                  aria-invalid={!!fieldErrors.password}
                  />

                  <FieldError id="sign-in-password-error">{fieldErrors.password}</FieldError>
                </Field>

                {emailAndPassword.rememberMe && (
                  <Field className="my-1">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="rememberMe"
                        name="rememberMe"
                        disabled={isPending}
                      />

                      <Label
                        htmlFor="rememberMe"
                        className="cursor-pointer text-sm font-normal"
                      >
                        {localization.auth.rememberMe}
                      </Label>
                    </div>
                  </Field>
                )}

                {Captcha && (
                  <div className="flex justify-center">{Captcha}</div>
                )}

                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={isPending}>
                    {signInEmailPending && <Spinner />}

                    {localization.auth.signIn}
                  </Button>

                  {plugins.flatMap((plugin) =>
                    (plugin.authButtons ?? []).map((AuthButton, index) => (
                      <AuthButton
                        key={`${plugin.id}-${index.toString()}`}
                        view="signIn"
                      />
                    ))
                  )}
                </div>
              </FieldGroup>
            </form>
          )}

          {socialPosition === "bottom" && (
            <>
              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}
            </>
          )}
        </div>

        {emailAndPassword?.enabled && (
          <div className="mt-4 flex w-full flex-col items-center gap-3">
            {emailAndPassword.forgotPassword && (
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
                className="self-center text-sm underline-offset-4 hover:underline"
              >
                {localization.auth.forgotPasswordLink}
              </Link>
            )}
            <FieldDescription className="text-center">
              {localization.auth.needToCreateAnAccount}{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
                className="underline underline-offset-4"
              >
                {localization.auth.signUp}
              </Link>
            </FieldDescription>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
