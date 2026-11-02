import { useEffect, useRef } from 'react'
import { AX_BackNavigation } from '../utils/AX_BackNavigation.js'
import { generateUUID } from '../utils/AX_UUID.js'

export function useBodyScrollLock(isLocked = true, onClose = null) {
  const onCloseRef = useRef(onClose)
  const modalIdRef = useRef(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isLocked) return

    const originalOverflow = document.body.style.overflow
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    if (typeof onCloseRef.current === 'function') {
      const modalId = generateUUID()
      modalIdRef.current = modalId

      AX_BackNavigation.registerModal(modalId, () => {
        if (typeof onCloseRef.current === 'function') {
          onCloseRef.current()
        }
      })
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = ''
      if (modalIdRef.current) {
        AX_BackNavigation.unregisterModal(modalIdRef.current)
        modalIdRef.current = null
      }
    }
  }, [isLocked])
}

export default useBodyScrollLock
