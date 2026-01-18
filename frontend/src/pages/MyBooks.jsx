import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyBooks, deleteBook } from '../services/api'
import BookCard from '../components/BookCard'

function MyBooks() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    console.log('MyBooks component mounted')
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      console.log('Loading books...')
      setLoading(true)
      setError(null)
      const response = await fetchMyBooks()
      console.log('My Books API Response:', response)
      
      // Check if response is an error object (validation error format)
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        // Check for validation error format: {type, loc, msg, input, url}
        if (response.type || response.loc || (response.msg && !response.books)) {
          // This is a validation error object - extract readable message
          let errorMsg = 'Invalid request format'
          if (response.msg && typeof response.msg === 'string') {
            errorMsg = response.msg
          } else if (response.detail) {
            if (typeof response.detail === 'string') {
              errorMsg = response.detail
            } else if (Array.isArray(response.detail)) {
              errorMsg = response.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
            }
          } else if (response.loc && Array.isArray(response.loc)) {
            errorMsg = `Validation error at ${response.loc.join('.')}`
          }
          setError(errorMsg)
          setBooks([])
          return
        }
        
        // Check if response has books property
        if (response.books) {
          console.log('Found books in response.books:', response.books.length)
          setBooks(Array.isArray(response.books) ? response.books : [])
          return
        }
        
        // If response is an object but not an error and has no books, it might be empty
        if (!response.books && !response.type && !response.loc) {
          console.log('Response is object but no books property, setting empty array')
          setBooks([])
          return
        }
      }
      
      // Handle direct array response
      if (Array.isArray(response)) {
        console.log('Response is direct array:', response.length)
        setBooks(response)
      } else {
        console.log('No books found, setting empty array')
        setBooks([])
      }
    } catch (err) {
      console.error('Error fetching books:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        data: err.response?.data
      })
      
      // Extract error message properly - handle different error formats
      let errorMessage = 'Failed to load your books. Please try again.'
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        // Handle validation error array (Pydantic format)
        if (Array.isArray(errorData)) {
          const firstError = errorData[0]
          if (firstError && typeof firstError === 'object') {
            errorMessage = firstError.msg || firstError.detail || firstError.message || JSON.stringify(firstError)
          } else if (typeof firstError === 'string') {
            errorMessage = firstError
          } else {
            errorMessage = JSON.stringify(errorData)
          }
        }
        // Handle single error object
        else if (typeof errorData === 'object' && errorData !== null) {
          // Try common error message fields in order of preference
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            // Handle array of validation errors
            errorMessage = errorData.detail
              .map(e => {
                if (typeof e === 'string') return e
                if (typeof e === 'object' && e !== null) {
                  return e.msg || e.detail || e.message || JSON.stringify(e)
                }
                return String(e)
              })
              .filter(m => m && m !== '[object Object]')
              .join(', ')
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message
          } else if (typeof errorData.msg === 'string') {
            errorMessage = errorData.msg
          } else if (typeof errorData.error === 'string') {
            errorMessage = errorData.error
          } else if (errorData.loc && errorData.msg) {
            // Pydantic validation error format
            const loc = Array.isArray(errorData.loc) ? errorData.loc.join('.') : String(errorData.loc)
            errorMessage = `${loc}: ${errorData.msg}`
          } else {
            // Last resort: try to create a readable message
            try {
              const keys = Object.keys(errorData).filter(k => k !== 'type' && k !== 'url' && k !== 'input')
              if (keys.length > 0 && keys.some(k => typeof errorData[k] === 'string')) {
                const stringValue = errorData[keys.find(k => typeof errorData[k] === 'string')]
                errorMessage = stringValue
              } else {
                errorMessage = 'An error occurred while loading books'
              }
            } catch {
              errorMessage = 'An error occurred while processing the response'
            }
          }
        }
        // Handle string error
        else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      // Final safety check - ensure errorMessage is always a readable string
      if (!errorMessage || 
          errorMessage === '[object Object]' || 
          typeof errorMessage !== 'string' ||
          (typeof errorMessage === 'object' && errorMessage !== null)) {
        errorMessage = 'Failed to load your books. Please try again.'
      }
      
      // Ensure it's a string and replace any remaining [object Object] strings
      errorMessage = String(errorMessage).replace(/\[object Object\]/g, 'An error occurred')
      
      setError(errorMessage)
      setBooks([])
    } finally {
      console.log('Loading complete')
      setLoading(false)
    }
  }

  const handleDeleteClick = (bookId) => {
    const book = books.find(b => b.id === bookId)
    setBookToDelete({ id: bookId, title: book?.title || 'this book' })
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return

    try {
      setDeleting(true)
      await deleteBook(bookToDelete.id)
      // Remove book from local state
      setBooks(books.filter(book => book.id !== bookToDelete.id))
      setShowDeleteModal(false)
      setBookToDelete(null)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete book. Please try again.'
      setError(errorMsg)
      setShowDeleteModal(false)
      setBookToDelete(null)
      console.error('Error deleting book:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setBookToDelete(null)
  }

  // Early returns with proper error boundaries
  if (loading) {
    console.log('Rendering loading state')
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="ml-4 text-gray-600">Loading your books...</p>
      </div>
    )
  }

  console.log('Rendering MyBooks component', { booksCount: books.length, error })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">My Books</h1>
          <p className="text-gray-600">Manage your book listings</p>
        </div>
        <button
          onClick={() => navigate('/home/list-book')}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          List New Book
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error loading books:</p>
          <p>{typeof error === 'string' ? error : 'An unexpected error occurred'}</p>
          <button
            onClick={loadBooks}
            className="mt-2 text-sm underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {!error && books.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-black mb-2">No Books Listed Yet</h2>
          <p className="text-gray-600 mb-6">Start sharing your books with the community!</p>
          <button
            onClick={() => navigate('/home/list-book')}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            List Your First Book
          </button>
        </div>
      ) : !error && books.length > 0 ? (
        <div>
          <div className="mb-4 text-gray-600">
            You have <span className="font-semibold text-primary-600">{books.length}</span> book{books.length !== 1 ? 's' : ''} listed
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => {
              // Safety check for book data
              if (!book || !book.id) {
                console.warn('Invalid book data:', book)
                return null
              }
              
              try {
                return (
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
                        onClick={() => handleDeleteClick(book.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              } catch (err) {
                console.error('Error rendering book card:', err, book)
                return (
                  <div key={book.id || Math.random()} className="border border-red-200 p-4 rounded">
                    <p className="text-red-600">Error displaying book</p>
                  </div>
                )
              }
            })}
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Delete Book?</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{bookToDelete?.title}"</span>? 
              This will permanently remove the book from your listings.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyBooks
