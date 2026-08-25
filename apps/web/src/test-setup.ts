import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/* jsdom ships no ResizeObserver, and Board picks its renderer from the
   container width rather than a media query. The stub records the callback so
   a test can drive a resize instead of waiting for a layout that never
   happens in jsdom. */
type Observer = { callback: ResizeObserverCallback; targets: Set<Element> }

const observers = new Set<Observer>()

class StubResizeObserver implements ResizeObserver {
  #entry: Observer

  constructor(callback: ResizeObserverCallback) {
    this.#entry = { callback, targets: new Set() }
    observers.add(this.#entry)
  }

  observe(target: Element): void {
    this.#entry.targets.add(target)
    /* The real observer fires once on observe. Board relies on that first
       callback for its initial renderer, so the stub has to fire too. */
    this.#entry.callback([entryFor(target)], this)
  }

  unobserve(target: Element): void {
    this.#entry.targets.delete(target)
  }

  disconnect(): void {
    this.#entry.targets.clear()
    observers.delete(this.#entry)
  }
}

function entryFor(target: Element): ResizeObserverEntry {
  const width = target.getBoundingClientRect().width
  return {
    target,
    contentRect: { width, height: width } as DOMRectReadOnly,
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
  } as unknown as ResizeObserverEntry
}

const realRect = Element.prototype.getBoundingClientRect

/** Sets the width every observed element reports, then fires the observers. */
export function resizeTo(width: number): void {
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    return {
      width,
      height: width,
      top: 0,
      left: 0,
      right: width,
      bottom: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
  for (const observer of observers) {
    for (const target of observer.targets) {
      observer.callback([entryFor(target)], null as unknown as ResizeObserver)
    }
  }
}

globalThis.ResizeObserver = StubResizeObserver

/* jsdom ships no matchMedia, and the client asks it exactly one question:
   prefers-reduced-motion. A test that is about what the table says rather
   than how it moves answers yes and gets the whole chain at once. */
let reduced = false

export function setReducedMotion(value: boolean): void {
  reduced = value
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        media: query,
        matches: query.includes('prefers-reduced-motion: reduce') ? reduced : false,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  })
}

/* Node 26 exposes a global `localStorage` that needs --localstorage-file, and
   it shadows the one jsdom would otherwise install. The session token has to
   be persisted for its test to mean anything, so put a real Storage back. */
if (typeof window !== 'undefined' && !window.localStorage) {
  const entries = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, String(value))
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
}

afterEach(() => {
  cleanup()
  reduced = false
  vi.useRealTimers()
  Element.prototype.getBoundingClientRect = realRect
  observers.clear()
})
