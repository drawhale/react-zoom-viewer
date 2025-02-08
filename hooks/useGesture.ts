import { useRef, useState } from "react"
import { useMergedRef } from "./useMergedRef"
import { type SwiperMatrix, useSwipe } from "./useSwipe"

type Props = {
  onPanStart?: (panMatrix: SwiperMatrix) => void
  onPanning?: (panMatrix: SwiperMatrix) => void
  onPanEnd?: (panMatrix: SwiperMatrix) => void
}

export const useGesture = <T extends HTMLElement = HTMLElement>({
  onPanStart,
  onPanning,
  onPanEnd,
}: Props) => {
  const gestureRef = useRef<T | null>(null)
  const [targetElement, setTargetElement] = useState<T | null>(null)
  const [gestureStatus, setGestureStatus] = useState({
    isPanning: false,
  })

  const { swiperRef } = useSwipe<T>({
    onStart: (swiperMatrix) => {
      setGestureStatus((prev) => ({
        ...prev,
        isPanning: true,
      }))
      onPanStart?.(swiperMatrix)
    },
    onMove: (swiperMatrix) => {
      onPanning?.(swiperMatrix)
    },
    onEnd: (swiperMatrix) => {
      setGestureStatus((prev) => ({
        ...prev,
        isPanning: false,
      }))
      onPanEnd?.(swiperMatrix)
    },
  })

  const mergedRef = useMergedRef<T>(gestureRef, swiperRef)

  const setRef = (element: T) => {
    if (gestureRef.current !== null) return
    mergedRef(element)
    setTimeout(() => {
      setTargetElement(element)
    }, 0)
  }

  return {
    gestureRef: setRef,
    targetElement,
    ...gestureStatus,
  }
}
