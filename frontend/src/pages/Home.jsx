import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BookCard from '../components/BookCard'
import { fetchBooks } from '../services/api'

function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [authorFilter, setAuthorFilter] = useState(searchParams.get('author') || '')
  const [conditionFilter, setConditionFilter] = useState(searchParams.get('condition') || '')
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '')
  const [minPoints, setMinPoints] = useState(searchParams.get('min_points') || '')
  const [maxPoints, setMaxPoints] = useState(searchParams.get('max_points') || '')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true)
        const filters = {}
        
        if (searchQuery) filters.query = searchQuery
        if (authorFilter) filters.author = authorFilter
        if (conditionFilter) filters.condition = conditionFilter
        if (locationFilter) filters.location = locationFilter
        if (minPoints) filters.min_points = parseInt(minPoints)
        if (maxPoints) filters.max_points = parseInt(maxPoints)
        filters.is_available = true
        filters.page = 1
        filters.page_size = 20
        
        const data = await fetchBooks(filters)
        setBooks(data.books || [])
      } catch (err) {
        setError('Failed to load books. Please try again later.')
        console.error('Error fetching books:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadBooks()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, authorFilter, conditionFilter, locationFilter, minPoints, maxPoints])

  // Sync with URL search params from Dashboard
  useEffect(() => {
    const queryFromUrl = searchParams.get('q')
    if (queryFromUrl && queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl)
    }
  }, [searchParams, searchQuery])

  const clearFilters = () => {
    setSearchQuery('')
    setAuthorFilter('')
    setConditionFilter('')
    setLocationFilter('')
    setMinPoints('')
    setMaxPoints('')
    setSearchParams({})
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-black mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Available Books
            </h1>
            <p className="text-gray-700">
              {books.length > 0 ? `${books.length} books available for exchange` : 'Browse our collection'}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary text-sm"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                <input
                  type="text"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="Filter by author"
                  className="input-field text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All Conditions</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by location"
                  className="input-field text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Points</label>
                <input
                  type="number"
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  placeholder="Minimum points"
                  className="input-field text-sm"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                <input
                  type="number"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  placeholder="Maximum points"
                  className="input-field text-sm"
                  min="0"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full btn-secondary text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Books Grid */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading books...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {books.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-cream-50 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-900 font-semibold text-lg mb-2">No books found matching your criteria.</p>
              <p className="text-gray-600 mb-6">Try adjusting your filters or be the first to list a book!</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={clearFilters}
                  className="btn-primary"
                >
                  Clear All Filters
                </button>
                <button
                  onClick={() => navigate('/home/list-book')}
                  className="btn-secondary"
                >
                  List Your Book
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Home
