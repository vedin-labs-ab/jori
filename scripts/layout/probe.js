;(() => {
  const identities = new WeakMap()
  let sequence = 0
  let lastAction = { label: "load", at: 0 }
  const shifts = []
  const round = (value) => Math.round(value * 100) / 100
  const box = (rect) => ({
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  })

  function selector(node) {
    if (!(node instanceof Element)) {
      return String(node)
    }
    const parts = []
    for (let el = node; el && parts.length < 12; el = el.parentElement) {
      let part = el.tagName.toLowerCase()
      if (el.id) {
        parts.unshift(`${part}#${CSS.escape(el.id)}`)
        break
      }
      const slot = el.getAttribute("data-slot")
      if (slot) {
        part += `[data-slot="${slot}"]`
      }
      const siblings = el.parentElement
        ? [...el.parentElement.children].filter((s) => s.tagName === el.tagName)
        : [el]
      part += `:nth-of-type(${siblings.indexOf(el) + 1})`
      parts.unshift(part)
    }
    return parts.join(" > ")
  }

  const snippet = (node) => (node?.textContent ?? "").trim().slice(0, 80)
  function isClipped(node, rect) {
    let left = Math.max(0, rect.left)
    let top = Math.max(0, rect.top)
    let right = Math.min(innerWidth, rect.right)
    let bottom = Math.min(innerHeight, rect.bottom)
    for (
      let parent = node.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent)
      const bounds = parent.getBoundingClientRect()
      if (style.overflowX !== "visible") {
        left = Math.max(left, bounds.left)
        right = Math.min(right, bounds.right)
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, bounds.top)
        bottom = Math.min(bottom, bounds.bottom)
      }
    }
    return left >= right || top >= bottom
  }

  function sampleNode(node) {
    if (
      !node.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    ) {
      return null
    }
    const rect = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    if (
      !rect.width ||
      !rect.height ||
      style.visibility === "hidden" ||
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.top > innerHeight ||
      rect.left > innerWidth
    ) {
      return null
    }
    if (isClipped(node, rect)) {
      return null
    }
    if (!identities.has(node)) {
      identities.set(node, ++sequence)
    }
    return {
      uid: identities.get(node),
      selector: selector(node),
      text: snippet(node),
      box: box(rect),
      animation: `${style.animationName} ${style.transitionProperty}`,
    }
  }

  function snapshot() {
    const nodes = []
    const scroll = []
    for (const node of document.querySelectorAll("body, body *")) {
      const sample = sampleNode(node)
      if (sample) {
        nodes.push(sample)
      }
      if (
        node.scrollHeight > node.clientHeight ||
        node.scrollWidth > node.clientWidth ||
        /auto|scroll/.test(
          `${getComputedStyle(node).overflowX} ${getComputedStyle(node).overflowY}`
        )
      ) {
        scroll.push({
          selector: selector(node),
          top: node.scrollTop,
          left: node.scrollLeft,
        })
      }
    }
    scroll.push({ selector: "window", top: scrollY, left: scrollX })
    return { at: performance.now(), nodes, scroll }
  }

  const mark = (label) => {
    lastAction = { label, at: performance.now() }
  }
  window.__mark = mark
  window.__layout = { mark, shifts, snapshot }
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const record = {
        action: lastAction.label,
        at: entry.startTime,
        msAfterAction: Math.round(entry.startTime - lastAction.at),
        value: entry.value,
        hadRecentInput: entry.hadRecentInput,
        sources: (entry.sources ?? []).map((source) => ({
          node: `${selector(source.node)} "${snippet(source.node)}"`,
          from: box(source.previousRect),
          to: box(source.currentRect),
        })),
      }
      shifts.push(record)
      window.__layoutRecord?.(record).catch(() => {})
    }
  }).observe({ type: "layout-shift", buffered: true })
})()
