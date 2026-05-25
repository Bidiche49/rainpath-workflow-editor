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
