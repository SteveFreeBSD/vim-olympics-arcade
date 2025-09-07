import React, { useEffect } from 'react'

export default function Toast({ show, message, onClose, duration = 3200 }) {
  useEffect(() => {
    if (!show) return
    const id = setTimeout(() => onClose && onClose(), duration)
    return () => clearTimeout(id)
  }, [show, duration, onClose])
  if (!show) return null
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="px-3 py-2 rounded-lg border border-amber-400 bg-amber-500/10 text-amber-100 shadow-lg animate-[fadeIn_.2s_ease-out]">
        {message}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
