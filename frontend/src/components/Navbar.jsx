import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  // TODO: Get auth state from context/store
  const isAuthenticated = false

  const handleLogout = () => {
    // TODO: Implement logout logic
    localStorage.removeItem('token')
    console.log('Logout clicked')
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-lg border-b-2 border-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">📚 BooksExchange</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/home" className="text-black hover:text-primary transition-colors font-medium">
              Home
            </Link>
            <Link to="/exchange" className="text-black hover:text-primary transition-colors font-medium">
              Exchange
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="text-black hover:text-primary transition-colors font-medium">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-black hover:text-primary transition-colors font-medium">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-black hover:bg-primary-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link to="/home" className="block px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors">
              Home
            </Link>
            <Link to="/exchange" className="block px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors">
              Exchange
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="block px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors">
                  Login
                </Link>
                <Link to="/register" className="block px-4 py-2 text-black hover:bg-primary-100 rounded transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
