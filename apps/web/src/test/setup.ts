import '@testing-library/jest-dom/vitest';

// React Flow measures its container with ResizeObserver / getBoundingClientRect,
// neither implemented by jsdom. Provide inert stubs so the canvas can render in
// component tests (it just reports a 0×0 viewport, which is fine for assertions).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (!('DOMMatrixReadOnly' in globalThis)) {
  class DOMMatrixReadOnlyStub {
    m22 = 1;
  }
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyStub as unknown as typeof DOMMatrixReadOnly;
}

// Radix UI primitives (DropdownMenu, Select, AlertDialog…) rely on pointer
// capture and scroll APIs that jsdom does not implement. Stub them so opening a
// menu / select in a component test doesn't throw.
const elementProto = globalThis.Element?.prototype as
  | (Element & Record<string, unknown>)
  | undefined;
if (elementProto) {
  elementProto.hasPointerCapture ??= () => false;
  elementProto.setPointerCapture ??= () => {};
  elementProto.releasePointerCapture ??= () => {};
  elementProto.scrollIntoView ??= () => {};
}

// sonner's <Toaster> queries prefers-color-scheme via matchMedia. jsdom declares
// the property but leaves it unimplemented (throws), so assign unconditionally.
globalThis.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof globalThis.matchMedia;
