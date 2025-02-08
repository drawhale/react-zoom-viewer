import { useEffect, useReducer, useRef } from "react"
import { getWindowOfElement } from "../utils/elementUtil"

export type SwiperMatrix = {
  startX: number
  startY: number
  startTimeStamp: number
  distanceX: number
  distanceY: number
  direction: "none" | "left" | "right" | "up" | "down"
  acceleration: number
  positions: { x: number; y: number; timeStamp: number }[]
  force: number
  directionAngle: number
}

type SwipeProps = {
  directionType?: "horizontal" | "vertical"
  threshold?: number
  isEnabled?: boolean
  isSwipeEventPropagable?: boolean
  onStart?: (swiperMatrix: SwiperMatrix) => void
  onMove?: (swiperMatrix: SwiperMatrix) => void
  onEnd?: (swiperMatrix: SwiperMatrix, overThreshold: boolean) => void
}

export const useSwipe = <T extends HTMLElement>({
  directionType = "horizontal",
  threshold = 30,
  isEnabled = true,
  isSwipeEventPropagable = true,
  onStart,
  onMove,
  onEnd,
}: SwipeProps) => {
  const swiperRef = useRef<T | null>(null)
  const swiperMatrix = useRef<SwiperMatrix>({
    startX: 0,
    startY: 0,
    startTimeStamp: 0,
    distanceX: 0,
    distanceY: 0,
    direction: "none",
    acceleration: 0,
    positions: [{ x: 0, y: 0, timeStamp: 0 }],
    force: 0,
    directionAngle: 0,
  })
  const isSwiping = useRef(false)
  const [_, forceUpdate] = useReducer(() => ({}), {})

  const setSwiperRef = (element: T | null) => {
    swiperRef.current = element
    forceUpdate()
  }

  useEffect(() => {
    if (!isEnabled || !swiperRef.current) return
    const swiperElement = swiperRef.current
    const currentWindow = getWindowOfElement(swiperElement)

    const handleStart = (event: TouchEvent | MouseEvent) => {
      if (event.cancelable) event.preventDefault()
      if (!isSwipeEventPropagable) event.stopPropagation()

      const { clientX, clientY } = "touches" in event ? event.touches[0] : event
      isSwiping.current = true
      swiperMatrix.current.startX = clientX
      swiperMatrix.current.startY = clientY
      swiperMatrix.current.startTimeStamp = event.timeStamp
      swiperMatrix.current.positions = [
        { x: clientX, y: clientY, timeStamp: event.timeStamp },
      ]
      onStart?.(swiperMatrix.current)

      const handleMove = (event: TouchEvent | MouseEvent) => {
        if (!isSwiping.current) return
        if (!isSwipeEventPropagable) event.stopPropagation()

        const { clientX, clientY } =
          "touches" in event ? event.touches[0] : event
        swiperMatrix.current.distanceX = clientX - swiperMatrix.current.startX
        swiperMatrix.current.distanceY = clientY - swiperMatrix.current.startY
        swiperMatrix.current.direction = getDirection(
          directionType,
          swiperMatrix.current.distanceX,
          swiperMatrix.current.distanceY,
        )
        swiperMatrix.current.positions.push({
          x: clientX,
          y: clientY,
          timeStamp: event.timeStamp,
        })
        onMove?.(swiperMatrix.current)
      }

      const handleEnd = (event: TouchEvent | MouseEvent) => {
        if (!isSwipeEventPropagable) event.stopPropagation()

        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event
        isSwiping.current = false
        swiperMatrix.current.distanceX = clientX - swiperMatrix.current.startX
        swiperMatrix.current.distanceY = clientY - swiperMatrix.current.startY
        swiperMatrix.current.direction = getDirection(
          directionType,
          swiperMatrix.current.distanceX,
          swiperMatrix.current.distanceY,
        )
        swiperMatrix.current.positions.push({
          x: clientX,
          y: clientY,
          timeStamp: event.timeStamp,
        })

        const distance =
          directionType === "horizontal"
            ? swiperMatrix.current.distanceX
            : swiperMatrix.current.distanceY

        const { force, directionAngle } = calculateForceAndDirection(
          swiperMatrix.current.positions,
        )
        swiperMatrix.current.force = force
        swiperMatrix.current.directionAngle = directionAngle

        if (Math.abs(distance) > threshold) {
          swiperMatrix.current.acceleration = Math.abs(
            distance / (event.timeStamp - swiperMatrix.current.startTimeStamp),
          )

          onEnd?.(swiperMatrix.current, true)
        } else {
          onEnd?.(swiperMatrix.current, false)
        }

        currentWindow.removeEventListener(getEventName("move"), handleMove)
        currentWindow.removeEventListener(getEventName("end"), handleEnd)
        currentWindow.removeEventListener("mouseleave", handleEnd)
      }

      currentWindow.addEventListener(getEventName("move"), handleMove)
      currentWindow.addEventListener(getEventName("end"), handleEnd)
      currentWindow.addEventListener("mouseleave", handleEnd)
    }

    swiperElement.addEventListener(getEventName("start"), handleStart)
    return () =>
      swiperElement.removeEventListener(getEventName("start"), handleStart)
  }, [
    swiperRef.current,
    isEnabled,
    isSwipeEventPropagable,
    directionType,
    threshold,
    onMove,
    onEnd,
  ])

  return { swiperRef, setSwiperRef }
}

const getDirection = (
  directionType: "horizontal" | "vertical",
  distanceX: number,
  distanceY: number,
) =>
  directionType === "horizontal"
    ? distanceX === 0
      ? "none"
      : distanceX < 0
      ? "left"
      : "right"
    : distanceY === 0
    ? "none"
    : distanceY < 0
    ? "up"
    : "down"

const getEventName = (type: "start" | "move" | "end") => {
  switch (type) {
    case "start":
      if ("ontouchstart" in window) {
        return "touchstart"
      }
      return "mousedown"
    case "move":
      if ("ontouchmove" in window) {
        return "touchmove"
      }
      return "mousemove"
    case "end":
      if ("ontouchend" in window) {
        return "touchend"
      }
      return "mouseup"
  }
}

const calculateForceAndDirection = (positions: SwiperMatrix["positions"]) => {
  const LAST_POSITION_COUNT = 10
  const MIN_DISPLACEMENT = 10
  const MIN_TOTAL_TIME = 100
  const MAX_FORCE = 7
  const ROUND_ANGLE = 15

  let isForceZero = true
  let force = 0
  let totalDx = 0
  let totalDy = 0

  const relevantPositions = positions.slice(
    Math.max(positions.length - LAST_POSITION_COUNT, 0),
  )

  for (let i = 1; i < relevantPositions.length - 1; i++) {
    const dx = relevantPositions[i].x - relevantPositions[i - 1].x
    const dy = relevantPositions[i].y - relevantPositions[i - 1].y
    const dt =
      relevantPositions[i].timeStamp - relevantPositions[i - 1].timeStamp

    const speed = dt === 0 ? 0 : Math.sqrt(dx * dx + dy * dy) / dt
    force += speed
    totalDx += dx
    totalDy += dy
  }

  const angle = Math.atan2(totalDy, totalDx) * (180 / Math.PI)

  let totalLastTime = 0
  let totalLastDisplacement = 0

  for (
    let i = 1;
    i < Math.min(LAST_POSITION_COUNT, positions.length - 1);
    i++
  ) {
    const dx =
      positions[positions.length - i].x - positions[positions.length - 1 - i].x
    const dy =
      positions[positions.length - i].y - positions[positions.length - 1 - i].y
    const dt =
      positions[positions.length - i].timeStamp -
      positions[positions.length - 1 - i].timeStamp

    totalLastTime += dt
    totalLastDisplacement += Math.sqrt(dx * dx + dy * dy)

    if (
      totalLastDisplacement > MIN_DISPLACEMENT &&
      totalLastTime < MIN_TOTAL_TIME
    ) {
      isForceZero = false
      break
    }
  }

  if (isForceZero) {
    force = 0
  }

  return {
    force: Math.min(force, MAX_FORCE),
    directionAngle: Math.round(angle / ROUND_ANGLE) * ROUND_ANGLE,
  }
}
