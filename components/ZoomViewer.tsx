import { useEffect, useLayoutEffect, useRef } from "react"
import clsx from "clsx"
import { twMerge } from "tailwind-merge"
import { useGesture } from "../hooks/useGesture"
import { useReceiveZoomEvent } from "../hooks/useReceiveZoomEvent"
import { getWindowOfElement } from "../utils/elementUtil"

const SCALE_REGEX = /scale\([0-9.]+\)/
const TRANSLATE_REGEX =
  /translate3d\([-]?[0-9.]+px(?:, [-]?[0-9.]+px)?(?:, [-]?[0-9.]+px)?\)/

const MIN_ZOOM_RATIO = 0.5

const FIND_TARGET_ELEMENT_RETRY_MAX_COUNT = 30
const FIND_TARGET_ELEMENT_RETRY_INTERVAL = 200

type Props = {
  isInBounds?: boolean
  fitOnInit?: boolean
  centerOnInit?: boolean
  isDisabled?: boolean
  className?: string
  onWheel?: (event: WheelEvent) => void
  onInit?: (zoomRatio: number) => void
}

/**
 * ZoomViewer
 * @description 확대/축소가 가능한 컴포넌트
 * @param isInBounds - 확대/축소 시 화면 밖으로 나가지 않게 할지 여부
 * @param fitOnInit - 화면에 꽉 차게 보이게 할지 여부
 * @param centerOnInit - 화면 중앙에 위치하게 할지 여부
 * @param className - 컴포넌트에 적용할 클래스
 * @param onWheel - 마우스 휠 이벤트 콜백
 * @param onInit - 초기화 완료 시 콜백
 * @param children - 확대/축소할 컴포넌트
 * @example
 * ```tsx
 * <ZoomViewer>
 * <img src="https://picsum.photos/2000/1000" />
 * </ZoomViewer>
 * ```
 */
export const ZoomViewer = ({
  isInBounds = true,
  fitOnInit = true,
  centerOnInit = true,
  isDisabled = false,
  className,
  onWheel,
  onInit,
  children,
}: React.PropsWithChildren<Props>) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const prevTargetPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const moveElementAfterPanEndFrame = useRef<number | null>(null)
  const findTargetElementRetryCount = useRef<number>(0)

  const { gestureRef, targetElement } = useGesture<HTMLDivElement>({
    onPanStart: () => {
      if (isDisabled) return
      if (moveElementAfterPanEndFrame.current) {
        cancelAnimationFrame(moveElementAfterPanEndFrame.current)
        moveElementAfterPanEndFrame.current = null
      }
      if (!targetElement) return
      prevTargetPosition.current = getPrevTransformedPosition(targetElement)
    },
    onPanning: (panMatrix) => {
      if (isDisabled || !targetElement) return
      const { x: prevX, y: prevY } = prevTargetPosition.current
      const { distanceX, distanceY } = panMatrix
      const nextX = prevX + distanceX
      const nextY = prevY + distanceY
      setTranslate(targetElement, nextX, nextY)
    },
    onPanEnd: (panMatrix) => {
      if (isDisabled || !targetElement) return
      const { x: prevX, y: prevY } = getPrevTransformedPosition(targetElement)
      const { force, directionAngle } = panMatrix
      const { nextX, nextY, isOverBounds } = getNextPosition({
        x: prevX,
        y: prevY,
        inBoundsOffset: 30,
      })

      if (isOverBounds || force === 0) {
        setElementEndPosition({ x: nextX, y: nextY })
        return
      }
      moveElementAfterPanEnd(force, directionAngle, (x, y) => {
        setElementEndPosition({ x, y })
      })
    },
  })

  useReceiveZoomEvent({
    currentWindow: targetElement?.ownerDocument?.defaultView ?? undefined,
    onChangeZoomRatio: (zoomRatio, prevZoomRatio) => {
      zoomTargetElement(zoomRatio - prevZoomRatio)
    },
  })

  const getNextPosition = ({
    x,
    y,
    inBoundsOffset = 0,
    zoomRatio = 1,
  }: {
    x: number
    y: number
    inBoundsOffset?: number
    zoomRatio?: number
  }) => {
    let nextX = x
    let nextY = y
    let isOverBounds = false

    if (!viewerRef.current || !targetElement) return { nextX, nextY }
    const viewerRect = viewerRef.current.getBoundingClientRect()
    const targetRect = targetElement.getBoundingClientRect()

    const targetWidth = targetRect.width * zoomRatio
    const targetHeight = targetRect.height * zoomRatio

    if (isInBounds) {
      const isOverWidth = targetWidth >= viewerRect.width
      const isOverHeight = targetHeight >= viewerRect.height
      const isLeftOverBounds = nextX > inBoundsOffset
      const isRightOverBounds =
        nextX + targetWidth < viewerRect.width - inBoundsOffset
      const isTopOverBounds = nextY > inBoundsOffset
      const isBottomOverBounds =
        nextY + targetHeight < viewerRect.height - inBoundsOffset

      if (!isOverWidth) {
        if (nextX < 0) {
          nextX = 0
          isOverBounds = true
        }
        if (nextX + targetWidth > viewerRect.width) {
          nextX = viewerRect.width - targetWidth
          isOverBounds = true
        }
      } else {
        if (isLeftOverBounds) {
          nextX = 0
          isOverBounds = true
        }
        if (isRightOverBounds) {
          nextX = viewerRect.width - targetWidth
          isOverBounds = true
        }
      }

      if (!isOverHeight) {
        if (nextY < 0) {
          nextY = 0
          isOverBounds = true
        }
        if (nextY + targetHeight > viewerRect.height) {
          nextY = viewerRect.height - targetHeight
          isOverBounds = true
        }
      } else {
        if (isTopOverBounds) {
          nextY = 0
          isOverBounds = true
        }
        if (isBottomOverBounds) {
          nextY = viewerRect.height - targetHeight
          isOverBounds = true
        }
      }

      if (isOverWidth && isOverHeight) {
        isOverBounds = [
          isLeftOverBounds,
          isRightOverBounds,
          isTopOverBounds,
          isBottomOverBounds,
        ].some(Boolean)

        nextX = isLeftOverBounds
          ? 0
          : isRightOverBounds
          ? viewerRect.width - targetWidth
          : nextX
        nextY = isTopOverBounds
          ? 0
          : isBottomOverBounds
          ? viewerRect.height - targetHeight
          : nextY
      }
    }

    return { nextX, nextY, isOverBounds }
  }

  const setElementEndPosition = ({ x, y }: { x: number; y: number }) => {
    if (!targetElement) return
    const { nextX, nextY } = getNextPosition({
      x,
      y,
    })
    setTranslate(targetElement, nextX, nextY, true)
  }

  const moveElementAfterPanEnd = (
    initialForce: number,
    direction: number,
    onEnd?: (x: number, y: number) => void,
  ) => {
    if (!targetElement) return
    const element = targetElement
    const currentWindow = getWindowOfElement(element)
    let force = initialForce
    const directionRadian = (direction * Math.PI) / 180
    const prevScale = getPrevTransformedScale(element)

    const animate = () => {
      const scalingFactor = 3 * (Math.round(prevScale * 0.3) + 1)
      const distance = force * scalingFactor
      const dx = distance * Math.cos(directionRadian)
      const dy = distance * Math.sin(directionRadian)

      const { x: prevX, y: prevY } = getPrevTransformedPosition(element)
      const nextX = prevX + dx
      const nextY = prevY + dy

      const { isOverBounds } = getNextPosition({
        x: nextX,
        y: nextY,
        inBoundsOffset: Math.max(initialForce * 3, 10),
      })

      setTranslate(element, nextX, nextY)

      force *= 0.95

      if (isOverBounds) {
        onEnd?.(nextX, nextY)
        moveElementAfterPanEndFrame.current = null
        return
      }

      if (force > 0.3) {
        // momentum animation 제거
        // moveElementAfterPanEndFrame.current =
        //   currentWindow.requestAnimationFrame(animate)
      } else {
        onEnd?.(nextX, nextY)
        moveElementAfterPanEndFrame.current = null
      }

      return
    }

    currentWindow.requestAnimationFrame(animate)
  }

  const zoomTargetElement = (deltaZoomRatio: number) => {
    if (!viewerRef.current || !targetElement) return
    const { x: prevX, y: prevY } = getPrevTransformedPosition(targetElement)
    const prevZoomRatio = getPrevTransformedScale(targetElement)
    if (prevZoomRatio === 0 || deltaZoomRatio === 0) return
    const nextZoomRatio = prevZoomRatio + deltaZoomRatio
    const { x, y } = getTransformedPosition(
      { x: prevX, y: prevY },
      nextZoomRatio / prevZoomRatio,
      {
        width: viewerRef.current.offsetWidth,
        height: viewerRef.current.offsetHeight,
      },
    )
    const { nextX, nextY } = getNextPosition({
      x,
      y,
      zoomRatio: nextZoomRatio / prevZoomRatio,
    })
    setScale(targetElement, nextZoomRatio, { nextX, nextY })
  }

  const initTargetElement = () => {
    if (!viewerRef.current || !targetElement) return

    const targetRect = targetElement.getBoundingClientRect()

    if (targetRect.width === 0 && targetRect.height === 0) {
      if (isDisabled) return

      findTargetElementRetryCount.current += 1
      if (
        findTargetElementRetryCount.current >
        FIND_TARGET_ELEMENT_RETRY_MAX_COUNT
      )
        return
      setTimeout(() => {
        initTargetElement()
      }, FIND_TARGET_ELEMENT_RETRY_INTERVAL)
      return
    }

    const viewerRect = viewerRef.current.getBoundingClientRect()

    const isOverWidth = targetRect.width >= viewerRect.width
    const isOverHeight = targetRect.height >= viewerRect.height

    let initScale = 1
    const prevScale = getPrevTransformedScale(targetElement)

    if (fitOnInit) {
      const viewerRatio = viewerRect.width / viewerRect.height
      const targetRatio = targetRect.width / targetRect.height

      if (targetRatio > viewerRatio) {
        initScale = viewerRect.width / targetRect.width
      } else {
        initScale = viewerRect.height / targetRect.height
      }

      if (initScale !== 1 && !centerOnInit) {
        setScale(targetElement, prevScale * initScale, undefined, {
          duration: 0,
        })
        onInit?.(prevScale * initScale)
      }
    }

    if (centerOnInit) {
      const prevX = isOverWidth
        ? 0
        : viewerRect.width / 2 - targetRect.width / 2
      const prevY = isOverHeight
        ? 0
        : viewerRect.height / 2 - targetRect.height / 2
      const { x, y } = getTransformedPosition(
        { x: prevX, y: prevY },
        initScale,
        {
          width: viewerRect.width,
          height: viewerRect.height,
        },
      )
      const { nextX, nextY } = getNextPosition({
        x,
        y,
        zoomRatio: initScale,
      })
      setScale(
        targetElement,
        prevScale * initScale,
        { nextX, nextY },
        { duration: 0 },
      )
      onInit?.(prevScale * initScale)
    }

    targetElement.classList.remove("opacity-0")
  }

  useLayoutEffect(() => {
    if (isDisabled) return
    initTargetElement()
  }, [isDisabled, targetElement])

  useEffect(() => {
    if (!viewerRef.current) return
    const handleWheel = (event: WheelEvent) => {
      onWheel?.(event)
    }

    viewerRef.current.addEventListener("wheel", handleWheel, {
      passive: false,
    })
    return () => {
      viewerRef.current?.removeEventListener("wheel", handleWheel)
    }
  }, [targetElement])

  useEffect(() => {
    if (!targetElement) return
    const currentWindow = getWindowOfElement(targetElement)

    const handleResize = () => {
      initTargetElement()
    }

    currentWindow.addEventListener("resize", handleResize)
    return () => {
      currentWindow.removeEventListener("resize", handleResize)
    }
  }, [targetElement])

  return (
    <div
      ref={viewerRef}
      className={twMerge(clsx("h-full w-full overflow-hidden"), className)}
    >
      <div className="relative h-full w-full">
        <div
          ref={gestureRef}
          className="absolute h-fit w-fit origin-top-left transform-gpu overflow-hidden opacity-0 transition-opacity will-change-transform"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const setTranslate = (
  element: HTMLElement,
  x: number,
  y: number,
  animate: boolean = false,
) => {
  if (!animate) {
    const currentTransform = element.style.transform
    const newTranslate = `translate3d(${Math.trunc(x)}px, ${Math.trunc(
      y,
    )}px, 0px)`
    element.style.transform = TRANSLATE_REGEX.test(currentTransform)
      ? currentTransform.replace(TRANSLATE_REGEX, newTranslate)
      : `${currentTransform} ${newTranslate}`
    return
  }

  animateTransform(element, { position: { x, y } })
}

const setScale = (
  element: HTMLElement,
  scale: number,
  position?: {
    nextX?: number
    nextY?: number
  },
  options?: { duration: number },
) => {
  const { nextX = 0, nextY = 0 } = position ?? {}
  animateTransform(
    element,
    {
      scale,
      position: { x: nextX, y: nextY },
    },
    options,
  )
}

const getTransformedPosition = (
  currentPosition: { x: number; y: number } = { x: 0, y: 0 },
  scale: number,
  containerSize: { width: number; height: number },
): { x: number; y: number } => {
  const centerX = containerSize.width / 2
  const centerY = containerSize.height / 2

  const distX = currentPosition.x - centerX
  const distY = currentPosition.y - centerY

  const scaledDistX = distX * scale
  const scaledDistY = distY * scale

  const nextX = centerX + scaledDistX
  const nextY = centerY + scaledDistY

  return {
    x: nextX,
    y: nextY,
  }
}

const getPrevTransformedPosition = (element: HTMLElement) => {
  const transform = getComputedStyle(element).transform
  const matrix = new DOMMatrixReadOnly(transform)
  return { x: matrix.m41, y: matrix.m42 }
}

const getPrevTransformedScale = (element: HTMLElement) => {
  const transform = getComputedStyle(element).transform
  const matrix = new DOMMatrixReadOnly(transform)
  return matrix.m11
}

const animateTransform = (
  element: HTMLElement,
  target: {
    scale?: number
    position?: { x: number; y: number }
  },
  options?: { duration: number },
) => {
  const { scale, position } = target
  const { duration = 150 } = options ?? {}
  const currentWindow = getWindowOfElement(element)
  const startTime = currentWindow.performance.now()

  const { x: prevX, y: prevY } = getPrevTransformedPosition(element)
  const prevScale = getPrevTransformedScale(element)

  const animate = (currentTime: number) => {
    const elapsedTime = currentTime - startTime
    const progress = duration === 0 ? 1 : Math.min(elapsedTime / duration, 1)

    const nextScale = Math.max(
      scale !== undefined ? prevScale + (scale - prevScale) * progress : 0,
      MIN_ZOOM_RATIO,
    )
    const nextX =
      position !== undefined ? prevX + (position.x - prevX) * progress : 0
    const nextY =
      position !== undefined ? prevY + (position.y - prevY) * progress : 0

    const newScale = `scale(${nextScale.toFixed(2)})`
    const newTranslate = `translate3d(${Math.trunc(nextX)}px, ${Math.trunc(
      nextY,
    )}px, 0px)`

    let currentTransform = element.style.transform
    if (position !== undefined) {
      currentTransform = TRANSLATE_REGEX.test(currentTransform)
        ? currentTransform.replace(TRANSLATE_REGEX, newTranslate)
        : `${currentTransform} ${newTranslate}`
    }
    if (scale !== undefined) {
      currentTransform = SCALE_REGEX.test(currentTransform)
        ? currentTransform.replace(SCALE_REGEX, newScale)
        : `${currentTransform} ${newScale}`
    }
    element.style.transform = currentTransform

    if (progress < 1) {
      currentWindow.requestAnimationFrame(animate)
    }

    return
  }

  currentWindow.requestAnimationFrame(animate)
}
