import "@testing-library/jest-dom/vitest";

// Radix UI Select calls `scrollIntoView` when its listbox opens, which jsdom
// does not implement.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}