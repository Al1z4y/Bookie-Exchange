import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { addToWishlist, removeFromWishlist, fetchWishlist } from '../services/api'
import { WishlistIcon } from './Icons'

function BookCard({ book }) {
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  
  const bookData = book || {
    id: 1,
    title: 'Sample Book',
    author: 'Author Name',
    condition: 'good',
    point_value: 12,
    image_urls: [],
    is_available: true,
  }

  useEffect(() => {
    const checkWishlist = async () => {
      try {
        const wishlistData = await fetchWishlist()
        const books = wishlistData.books || wishlistData || []
        const isInList = Array.isArray(books) && books.some(b => b.id === bookData.id)
        setIsInWishlist(isInList)
      } catch (err) {
        console.error('Error checking wishlist:', err)
      }
    }
    checkWishlist()
  }, [bookData.id])

  const conditionColors = {
    excellent: 'bg-accent-100 text-accent-800 border border-accent-200',
    good: 'bg-primary-100 text-primary-600 border border-primary-300',
    fair: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    poor: 'bg-orange-100 text-orange-800 border border-orange-200',
  }

  const handleWishlistToggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      setWishlistLoading(true)
      if (isInWishlist) {
        await removeFromWishlist(bookData.id)
        setIsInWishlist(false)
      } else {
        await addToWishlist(bookData.id)
        setIsInWishlist(true)
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err)
      // Show error message to user
      const errorMsg = err.response?.data?.detail || 'Failed to update wishlist. Please try again.'
      alert(errorMsg)
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <Link to={`/book/${bookData.id}`} className="block">
      <div className="card-hover h-full relative group">
        {/* Wishlist Heart Icon */}
        <button
          onClick={handleWishlistToggle}
          disabled={wishlistLoading}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full bg-cream-50/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200 ${
            isInWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
          }`}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <WishlistIcon className="w-5 h-5" filled={isInWishlist} />
        </button>

        {/* Book Cover Image */}
        <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
          {bookData.image_urls && bookData.image_urls.length > 0 ? (
            <img
              src={bookData.image_urls[0]}
              alt={bookData.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl text-gray-400">📖</span>
          )}
        </div>

        {/* Book Info */}
        <div>
          <h3 className="text-lg font-semibold mb-1 line-clamp-2 text-gray-900 group-hover:text-primary-600 transition-colors">
            {bookData.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3">{bookData.author}</p>
          
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                conditionColors[bookData.condition] || conditionColors.good
              }`}
            >
              {bookData.condition}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-primary-600 font-bold text-lg">{bookData.point_value}</span>
              <span className="text-gray-500 text-sm">pts</span>
            </div>
          </div>

          {!bookData.is_available && (
            <div className="text-sm text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 mb-3">
              Currently Unavailable
            </div>
          )}

          {bookData.is_available && (
            <Link
              to={`/book/${bookData.id}`}
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="block w-full mt-3"
            >
              <button className="w-full btn-primary text-sm py-2.5 rounded-lg">
                Request Exchange
              </button>
            </Link>
          )}
        </div>
      </div>
    </Link>
  )
}

export default BookCard
