import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchBook, createExchangeRequest, addToWishlist, removeFromWishlist, fetchWishlist } from '../services/api'

function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [exchangeLoading, setExchangeLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [exchangeMessage, setExchangeMessage] = useState('')

  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true)
        const data = await fetchBook(id)
        setBook(data)
        
        // Check if book is in wishlist
        try {
          const wishlistData = await fetchWishlist()
          // Handle both possible response formats
          const books = wishlistData.books || wishlistData || []
          const isInList = Array.isArray(books) && books.some(b => b.id === parseInt(id))
          setIsInWishlist(isInList)
        } catch (err) {
          console.error('Error checking wishlist:', err)
          // If wishlist fetch fails, assume not in wishlist
          setIsInWishlist(false)
        }
      } catch (err) {
        setError('Failed to load book details.')
        console.error('Error fetching book:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadBook()
    }
  }, [id])

  const handleAddToWishlist = async () => {
    if (!book) return
    
    try {
      setWishlistLoading(true)
      setError(null)
      setSuccessMessage(null)
      
      if (isInWishlist) {
        await removeFromWishlist(book.id)
        setIsInWishlist(false)
        setSuccessMessage('Removed from wishlist')
      } else {
        await addToWishlist(book.id)
        setIsInWishlist(true)
        setSuccessMessage('Added to wishlist')
      }
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update wishlist. Please try again.'
      setError(errorMsg)
      console.error('Error updating wishlist:', err)
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleRequestExchange = async () => {
    if (!book) return
    
    // Check if user is trying to request their own book
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.id === book.owner_id) {
      setError('You cannot request an exchange for your own book.')
      setShowExchangeModal(false)
      return
    }
    
    try {
      setExchangeLoading(true)
      setError(null)
      setSuccessMessage(null)
      
      await createExchangeRequest({
        book_id: book.id,
        message: exchangeMessage || undefined,
      })
      
      setSuccessMessage('Exchange request sent successfully!')
      setShowExchangeModal(false)
      setExchangeMessage('')
      
      // Refresh book data to update availability
      const updatedBook = await fetchBook(id)
      setBook(updatedBook)
      
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send exchange request. Please try again.'
      setError(errorMsg)
      console.error('Error creating exchange request:', err)
    } finally {
      setExchangeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading book details...</p>
        </div>
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Book not found'}
        </div>
        <button onClick={() => navigate('/')} className="mt-4 btn-secondary">
          Back to Home
        </button>
      </div>
    )
  }

  const conditionColors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-primary-600 hover:text-primary-700">
        ← Back
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Book Images */}
        <div>
          <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
            {book.image_urls && book.image_urls.length > 0 ? (
              <img
                src={book.image_urls[0]}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-9xl">📖</span>
            )}
          </div>
          
          {book.image_urls && book.image_urls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {book.image_urls.slice(1, 5).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${book.title} ${index + 2}`}
                  className="aspect-[3/4] object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>

        {/* Book Details */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
          <p className="text-xl text-gray-600 mb-4">by {book.author}</p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  conditionColors[book.condition] || conditionColors.good
                }`}
              >
                {book.condition}
              </span>
              <span className="text-2xl font-bold text-primary-600">
                {book.point_value} points
              </span>
            </div>

            {book.location && (
              <div>
                <span className="text-gray-600">Location: </span>
                <span className="font-medium">{book.location}</span>
              </div>
            )}

            {book.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700">{book.description}</p>
              </div>
            )}

            <div>
              <span className="text-gray-600">Listed by: </span>
              <span className="font-medium">{book.owner_username || 'Unknown'}</span>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {(() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}')
              const isOwnBook = user.id === book.owner_id
              
              if (isOwnBook) {
                return (
                  <button className="w-full btn-secondary" disabled>
                    This is your book
                  </button>
                )
              } else if (book.is_available) {
                return (
                  <button 
                    onClick={() => setShowExchangeModal(true)}
                    disabled={exchangeLoading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exchangeLoading ? 'Processing...' : 'Request Exchange'}
                  </button>
                )
              } else {
                return (
                  <button className="w-full btn-secondary" disabled>
                    Currently Unavailable
                  </button>
                )
              }
            })()}
            <button 
              onClick={handleAddToWishlist}
              disabled={wishlistLoading}
              className={`w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed ${
                isInWishlist ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''
              }`}
            >
              {wishlistLoading 
                ? 'Processing...' 
                : isInWishlist 
                  ? 'Remove from Wishlist' 
                  : 'Add to Wishlist'
              }
            </button>
          </div>

          {/* Exchange Request Modal */}
          {showExchangeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Request Exchange</h2>
                <p className="text-gray-600 mb-4">
                  You are requesting to exchange <strong>{book.point_value} points</strong> for this book.
                </p>
                <div className="mb-4">
                  <label htmlFor="exchange-message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    id="exchange-message"
                    value={exchangeMessage}
                    onChange={(e) => setExchangeMessage(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Add a message to the book owner..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRequestExchange}
                    disabled={exchangeLoading}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exchangeLoading ? 'Sending...' : 'Send Request'}
                  </button>
                  <button
                    onClick={() => {
                      setShowExchangeModal(false)
                      setExchangeMessage('')
                    }}
                    disabled={exchangeLoading}
                    className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookDetail
