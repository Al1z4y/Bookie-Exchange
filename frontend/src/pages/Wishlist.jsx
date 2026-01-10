import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWishlist, removeFromWishlist, fetchMessages } from '../services/api'
import BookCard from '../components/BookCard'

function Wishlist() {
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [availabilityAlerts, setAvailabilityAlerts] = useState([])

  useEffect(() => {
    loadWishlist()
    loadAvailabilityAlerts()
  }, [])

  const loadAvailabilityAlerts = async () => {
    try {
      // Fetch messages to check for wishlist availability alerts
      const messagesData = await fetchMessages('inbox')
      const messages = messagesData.messages || messagesData || []
      
      // Filter messages that are wishlist availability alerts
      const alerts = messages.filter(msg => 
        msg.subject && msg.subject.toLowerCase().includes('book available') &&
        !msg.is_read
      )
      
      setAvailabilityAlerts(alerts)
    } catch (err) {
      console.error('Error loading availability alerts:', err)
    }
  }

  const loadWishlist = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchWishlist()
      // Handle response format - could be {books: [...]} or just [...]
      const books = response.books || response || []
      setWishlist(Array.isArray(books) ? books : [])
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to load wishlist. Please try again.'
      setError(errorMsg)
      console.error('Error fetching wishlist:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromWishlist = async (bookId) => {
    try {
      await removeFromWishlist(bookId)
      // Remove from local state
      setWishlist(wishlist.filter(book => book.id !== bookId))
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to remove from wishlist. Please try again.'
      alert(errorMsg)
      console.error('Error removing from wishlist:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">My Wishlist</h1>
          <p className="text-black/70">Books you want to exchange</p>
        </div>
      </div>

      {/* Availability Alerts */}
      {availabilityAlerts.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            Availability Alerts ({availabilityAlerts.length})
          </h2>
          {availabilityAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-accent-50 border-2 border-accent-200 rounded-lg p-4 flex items-start justify-between gap-4 animate-pulse"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📚</span>
                  <h3 className="font-bold text-accent-800">{alert.subject}</h3>
                </div>
                <p className="text-accent-700">{alert.content}</p>
                <p className="text-sm text-accent-600 mt-2">
                  Received: {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => navigate('/home/messages')}
                className="btn-accent text-sm whitespace-nowrap"
              >
                View Message
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {wishlist.length === 0 ? (
        <div className="card text-center">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-2xl font-semibold text-black mb-2">Your Wishlist is Empty</h2>
          <p className="text-black/70 mb-6">Start adding books to your wishlist to get notified when they become available!</p>
          <button
            onClick={() => navigate('/home')}
            className="btn-primary"
          >
            Browse Books
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-black/70 flex items-center justify-between">
            <span>
              You have <span className="font-semibold text-primary">{wishlist.length}</span> book{wishlist.length !== 1 ? 's' : ''} in your wishlist
            </span>
            {availabilityAlerts.length > 0 && (
              <span className="text-accent font-semibold flex items-center gap-1">
                <span>🔔</span>
                {availabilityAlerts.length} new availability alert{availabilityAlerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((book) => {
              // Check if this book has an availability alert
              const hasAlert = availabilityAlerts.some(alert => 
                alert.content && alert.content.includes(book.title)
              )
              
              return (
                <div key={book.id} className="relative">
                  {hasAlert && (
                    <div className="absolute -top-2 -right-2 bg-accent text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10 animate-bounce shadow-lg">
                      🔔
                    </div>
                  )}
                  <BookCard book={book} />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => navigate(`/book/${book.id}`)}
                      className="flex-1 btn-primary text-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleRemoveFromWishlist(book.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium border-2 border-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Wishlist
