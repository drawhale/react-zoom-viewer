export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): T => {
  let lastTime = 0

  return ((...args: Parameters<T>) => {
    const now = new Date().getTime()
    if (now - lastTime < delay) {
      return
    }

    lastTime = now
    return func(...args)
  }) as T
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }) as T
}
