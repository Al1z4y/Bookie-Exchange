import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BookCard from '../components/BookCard'
import { fetchBooks } from '../services/api'

function Home() {
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
        filters.is_available = true // Only show available books
        
        const data = await fetchBooks(filters)
        setBooks(data.books || [])
      } catch (err) {
        setError('Failed to load books. Please try again later.')
        console.error('Error fetching books:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
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
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
          Welcome to BooksExchange
        </h1>
        <p className="text-xl text-black/70 max-w-2xl mx-auto">
          Swap books, share stories, and build a community of readers. 
          Exchange your favorite books with others and discover new adventures.
        </p>
      </div>

      {/* Filters Section */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Browse & Discover</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary text-sm"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'} {showFilters ? '▲' : '▼'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-primary-50 rounded-lg border-2 border-primary-100">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Author</label>
              <input
                type="text"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                placeholder="Filter by author"
                className="input-field text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">Condition</label>
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
              <label className="block text-sm font-medium text-black mb-1">Location</label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter by location"
                className="input-field text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">Min Points</label>
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
              <label className="block text-sm font-medium text-black mb-1">Max Points</label>
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
        )}
      </div>

      {/* Featured Books Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">
            Available Books {books.length > 0 && `(${books.length})`}
          </h2>
        </div>
        
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-black/70">Loading books...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
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
              <div className="text-center py-12 bg-primary-50 rounded-lg border-2 border-primary-100">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-black font-medium">No books found matching your criteria.</p>
                <p className="text-black/70 mt-2">Try adjusting your filters or be the first to list a book!</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 btn-primary"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="text-center card">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold mb-2 text-black">Easy Exchange</h3>
          <p className="text-black/70">
            Swap books with other members using our point-based system.
          </p>
        </div>
        <div className="text-center card">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2 text-black">Discover Books</h3>
          <p className="text-black/70">
            Browse through thousands of books from fellow readers.
          </p>
        </div>
        <div className="text-center card">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-xl font-semibold mb-2 text-black">Join Community</h3>
          <p className="text-black/70">
            Connect with book lovers and share your reading journey.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Home
