import { useRef } from "react"
import { throttle } from "../utils/functionUtil"

export const PAPER_ZOOM_EVENT_NAME = "paper-zoom"
export type PaperZoomEvent = CustomEvent<{
  zoomRatio: number
  prevZoomRatio: number
}>

type Props = {
  currentWindow?: Window
  zoomRatioStep?: number
  minZoomRatio?: number
  initialZoomRatio?: number
}

/**
 * useZoomController
 * @description 확대/축소에 필요한 기능을 담당하는 컨트롤러
 * @param currentWindow - 현재 window 객체
 * @param zoomRatioStep - 확대/축소할 때마다 증감할 배율 (기본값: 0.5)
 * @param minZoomRatio - 최소 배율 (기본값: 0.5)
 * @param initialZoomRatio - 초기 배율 (기본값: 1)
 * @returns
 * getZoomRatio - 현재 배율을 반환하는 함수
 * setZoomRatio - 현재 배율을 설정하는 함수
 * zoomIn - 확대하는 함수
 * zoomOut - 축소하는 함수
 * handleWheel - 휠 이벤트 핸들러
 * @example
 * const {
 *  getZoomRatio,
 *  setZoomRatio,
 *  zoomIn,
 *  zoomOut,
 *  handleWheel,
 * } = useZoomController()
 */
export const useZoomController = ({
  currentWindow = globalThis.window,
  zoomRatioStep = 0.5,
  minZoomRatio = 0.5,
  initialZoomRatio = 1,
}: Props = {}) => {
  const prevZoomRatioRef = useRef(initialZoomRatio)

  const getZoomRatio = () => prevZoomRatioRef.current

  const zoom = (direction: "in" | "out") => {
    const prevZoomRatio = prevZoomRatioRef.current
    const nextZoomRatio = Number(
      Math.max(
        prevZoomRatio + zoomRatioStep * (direction === "in" ? 1 : -1),
        minZoomRatio,
      ).toFixed(2),
    )
    prevZoomRatioRef.current = nextZoomRatio

    const paperZoomEvent = new CustomEvent(PAPER_ZOOM_EVENT_NAME, {
      detail: {
        zoomRatio: Number(nextZoomRatio),
        prevZoomRatio: Number(prevZoomRatio),
      },
    })
    currentWindow.dispatchEvent(paperZoomEvent)

    return prevZoomRatioRef.current
  }

  const zoomIn = () => zoom("in")
  const zoomOut = () => zoom("out")

  const throttledZoom = throttle((deltaY: number) => {
    zoom(deltaY > 0 ? "out" : "in")
  }, 150)

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    event.stopPropagation()
    throttledZoom(event.deltaY)
  }

  const setZoomRatio = (zoomRatio: number) => {
    prevZoomRatioRef.current = zoomRatio
  }

  return {
    getZoomRatio,
    setZoomRatio,
    zoomIn,
    zoomOut,
    handleWheel,
  }
}
