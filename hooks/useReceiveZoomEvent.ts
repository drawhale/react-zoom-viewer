import { useEffect, useRef } from "react"
import { PAPER_ZOOM_EVENT_NAME, type PaperZoomEvent } from "./useZoomController"

type Props = {
  currentWindow?: Window
  onChangeZoomRatio: (zoomRatio: number, prevZoomRatio: number) => void
}

export const useReceiveZoomEvent = ({
  currentWindow = globalThis.window,
  onChangeZoomRatio,
}: Props) => {
  const zoomRatioRef = useRef(1)
  const prevZoomRatioRef = useRef(1)

  useEffect(() => {
    const handleZoom = (event: PaperZoomEvent) => {
      const { zoomRatio, prevZoomRatio } = event.detail
      zoomRatioRef.current = zoomRatio
      prevZoomRatioRef.current = prevZoomRatio
      onChangeZoomRatio(zoomRatio, prevZoomRatio)
    }

    currentWindow.addEventListener(
      PAPER_ZOOM_EVENT_NAME,
      handleZoom as EventListener,
    )

    return () => {
      currentWindow.removeEventListener(
        PAPER_ZOOM_EVENT_NAME,
        handleZoom as EventListener,
      )
    }
  }, [onChangeZoomRatio])

  return {
    getZoomRatio: () => zoomRatioRef.current,
    getPrevZoomRatio: () => prevZoomRatioRef.current,
  }
}
