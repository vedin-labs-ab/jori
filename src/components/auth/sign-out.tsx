"use client"

import { useAuth, useSignOut } from "@better-auth-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FullscreenSkeletonLoader } from "@/shared/loading"

/** Starts sign-out once and keeps the loading state latched through redirect. */
export function useSignOutFlow() {
  const { authClient, basePaths, navigate, viewPaths } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const startedRef = useRef(false)
  const navigateToSignIn = useCallback(() => {
    navigate({
      to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
      replace: true
    })
  }, [basePaths.auth, navigate, viewPaths.auth.signIn])

  const { mutate } = useSignOut(authClient, {
    onError: navigateToSignIn,
    onSuccess: navigateToSignIn
  })

  const signOut = useCallback(() => {
    if (startedRef.current) return

    startedRef.current = true
    setIsSigningOut(true)
    mutate()
  }, [mutate])

  return { isSigningOut, signOut }
}

/** Direct-entry fallback that signs out on mount behind the shared loader. */
export function SignOut() {
  const { signOut } = useSignOutFlow()

  useEffect(() => {
    signOut()
  }, [signOut])

  return <FullscreenSkeletonLoader />
}
