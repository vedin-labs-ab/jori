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
