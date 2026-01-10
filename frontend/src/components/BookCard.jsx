import { Link } from 'react-router-dom'

function BookCard({ book }) {
  // Default book data if not provided
  const bookData = book || {
    id: 1,
    title: 'Sample Book',
    author: 'Author Name',
    condition: 'good',
    point_value: 12,
    image_urls: [],
    is_available: true,
  }

  const conditionColors = {
    excellent: 'bg-accent-100 text-accent-800 border-2 border-accent-200',
    good: 'bg-primary-100 text-primary-800 border-2 border-primary-200',
    fair: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200',
    poor: 'bg-red-100 text-red-800 border-2 border-red-200',
  }

  return (
    <Link to={`/book/${bookData.id}`} className="block">
      <div className="card hover:shadow-xl transition-all duration-200 hover:border-primary-200">
        {/* Book Image */}
        <div className="aspect-[3/4] bg-primary-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden border-2 border-primary-100">
          {bookData.image_urls && bookData.image_urls.length > 0 ? (
            <img
              src={bookData.image_urls[0]}
              alt={bookData.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">📖</span>
          )}
        </div>

        {/* Book Info */}
        <div>
          <h3 className="text-lg font-semibold mb-1 line-clamp-2 text-black">{bookData.title}</h3>
          <p className="text-black/70 mb-2">{bookData.author}</p>
          
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                conditionColors[bookData.condition] || conditionColors.good
              }`}
            >
              {bookData.condition}
            </span>
            <span className="text-primary font-bold text-lg">
              {bookData.point_value} pts
            </span>
          </div>

          {!bookData.is_available && (
            <div className="text-sm text-red-600 font-medium bg-red-50 px-3 py-1 rounded-lg border-2 border-red-200">Unavailable</div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default BookCard
