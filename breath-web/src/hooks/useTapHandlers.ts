/**
 * Handles content area tap: close settings if open, otherwise show info overlay.
 */
export function useTapHandlers(
  showSettings: boolean,
  setShowSettings: (v: boolean) => void,
  setShowInfo: (v: boolean) => void
) {
  const handleContentClick = () => {
    if (showSettings) {
      setShowSettings(false)
      setShowInfo(true) /* treat closing settings as a tap: start timer, keep on-tap items visible */
      return
    }
    setShowInfo(true)
  }
  return { handleContentClick }
}
