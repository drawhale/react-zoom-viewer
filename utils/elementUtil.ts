export const findScrollContainer = (
  element: HTMLElement,
  direction: "vertical" | "horizontal",
) => {
  if (!element) {
    return undefined
  }

  let parent = element.parentElement
  while (parent) {
    const { overflowX, overflowY } = window.getComputedStyle(parent)
    const overflow = direction === "vertical" ? overflowY : overflowX
    const isOverflow =
      direction === "vertical"
        ? parent.scrollHeight > parent.clientHeight
        : parent.scrollWidth > parent.clientWidth
    if (
      overflow.split(" ").every((o) => o === "auto" || o === "scroll") &&
      isOverflow
    ) {
      return parent
    }
    parent = parent.parentElement
  }

  return document
}

export const getWindowOfElement = (element?: HTMLElement | null) => {
  return element?.ownerDocument.defaultView || window
}
