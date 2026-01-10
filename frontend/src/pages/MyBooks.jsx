import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyBooks, deleteBook } from '../services/api'
import BookCard from '../components/BookCard'

function MyBooks() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchMyBooks()
      console.log('My Books Response:', response)
      // Handle both response formats: {books: [...]} or direct array
      if (response && response.books) {
        setBooks(response.books)
      } else if (Array.isArray(response)) {
        setBooks(response)
      } else {
        setBooks([])
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load your books. Please try again.'
      setError(errorMessage)
      console.error('Error fetching books:', err)
      console.error('Error response:', err.response)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book listing?')) {
      return
    }

    try {
      await deleteBook(bookId)
      // Remove book from local state
      setBooks(books.filter(book => book.id !== bookId))
    } catch (err) {
      alert('Failed to delete book. Please try again.')
      console.error('Error deleting book:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Books</h1>
          <p className="text-gray-600">Manage your book listings</p>
        </div>
        <button
          onClick={() => navigate('/home/list-book')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          List New Book
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {books.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Books Listed Yet</h2>
          <p className="text-gray-600 mb-6">Start sharing your books with the community!</p>
          <button
            onClick={() => navigate('/home/list-book')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            List Your First Book
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-gray-600">
            You have <span className="font-semibold text-primary-600">{books.length}</span> book{books.length !== 1 ? 's' : ''} listed
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <div key={book.id} className="relative">
                <BookCard book={book} />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyBooks
