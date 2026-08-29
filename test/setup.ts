// Top-level await below needs module context, and this file has no imports.
export {}

// Full-suite runs keep every core busy with jsdom workers and Vite
// transforms, so a findBy/waitFor poll that settles in milliseconds on an
// idle machine can need seconds of wall clock under contention. The default
// 1s deadline turns that scheduling noise into failures; a wider deadline
// changes nothing about what is asserted, only how long a poll may wait
// before giving up. Loaded on demand so node-environment tests, which never
// import testing-library, do not pay for it in every worker.
if (typeof window !== "undefined") {
  const { configure } = await import("@testing-library/dom")

  configure({ asyncUtilTimeout: 4000 })
}

// jsdom leaves out ResizeObserver, which Radix form controls reach for once
// they sit inside a <form> and render their hidden form-bubbling inputs.
// Browsers always have it; the tests only need it to exist.
class ResizeObserverStub {
  disconnect() {
    return undefined
  }

  observe() {
    return undefined
  }

  unobserve() {
    return undefined
  }
}

if (
  typeof window !== "undefined" &&
  typeof window.ResizeObserver === "undefined"
) {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
