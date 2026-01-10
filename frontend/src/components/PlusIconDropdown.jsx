import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function PlusIconDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const menuItems = [
    { label: 'Buy Points', icon: '💰', path: '/home/buy-points', action: () => navigate('/home/buy-points') },
    { label: 'List Book', icon: '📚', path: '/home/list-book', action: () => navigate('/home/list-book') },
    { label: 'Add to Wishlist', icon: '❤️', path: '/home/wishlist', action: () => navigate('/home/wishlist') },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Plus Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
        aria-label="More options"
      >
        <svg
          className={`h-6 w-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 transition-all duration-200 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              item.action()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors duration-150"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PlusIconDropdown
