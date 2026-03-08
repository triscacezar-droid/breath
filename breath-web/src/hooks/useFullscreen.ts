import { useEffect, useState } from 'react'

const doc = document
const docEl = doc.documentElement

function isFullscreenSupported(): boolean {
  const el = docEl as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
  return !!(el.requestFullscreen || el.webkitRequestFullscreen)
}

function getFullscreenElement(): Element | null {
  return (
    doc.fullscreenElement ||
    (doc as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
    null
  )
}

function requestFullscreen(): Promise<void> {
  const el = docEl as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
  if (el.requestFullscreen) {
    return el.requestFullscreen()
  }
  if (el.webkitRequestFullscreen) {
    return el.webkitRequestFullscreen()
  }
  return Promise.reject(new Error('Fullscreen not supported'))
}

function exitFullscreen(): Promise<void> {
  if (doc.exitFullscreen) {
    return doc.exitFullscreen()
  }
  const webkit = (doc as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen
  if (webkit) {
    return webkit.call(doc)
  }
  return Promise.reject(new Error('Fullscreen not supported'))
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported] = useState(isFullscreenSupported)

  useEffect(() => {
    if (!isSupported) return

    const onFullscreenChange = () => {
      setIsFullscreen(!!getFullscreenElement())
    }

    doc.addEventListener('fullscreenchange', onFullscreenChange)
    doc.addEventListener('webkitfullscreenchange', onFullscreenChange)

    return () => {
      doc.removeEventListener('fullscreenchange', onFullscreenChange)
      doc.removeEventListener('webkitfullscreenchange', onFullscreenChange)
    }
  }, [isSupported])

  const toggleFullscreen = () => {
    if (!isSupported) return
    if (getFullscreenElement()) {
      exitFullscreen()
    } else {
      requestFullscreen()
    }
  }

  return { isFullscreen, toggleFullscreen, isSupported }
}
