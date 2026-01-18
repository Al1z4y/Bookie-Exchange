import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Only clear error when user starts typing, not on every change
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await register(formData)
      // Token and user are already stored in api.js
      // Redirect to home after successful registration
      navigate('/home')
    } catch (err) {
      console.error('Registration error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed. Please try again.'
      setError(errorMessage)
      setLoading(false) // Set loading to false here to keep error visible
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream-500">
      {/* Left Side - Image Section */}
      <div className="hidden md:flex md:w-1/2 bg-primary-50 relative overflow-hidden items-center justify-center p-8">
        <div className="w-full h-full flex items-center justify-center">
          <img
            src="/bookie-logo.jpeg"
            alt="BOOKIE - Your Book Exchange App"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              // Fallback if image doesn't exist - show gradient background with text
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = `
                <div class="text-center text-primary">
                  <div class="text-8xl mb-6">📚</div>
                  <h1 class="text-4xl md:text-5xl font-bold mb-4">BOOKIE</h1>
                  <p class="text-xl md:text-2xl text-primary-700">
                    Your Book Exchange App
                  </p>
                  <p class="text-lg text-primary-600 mt-4">
                    "SHARE STORIES. DISCOVER NEW WORLDS."
                  </p>
                </div>
              `
            }}
          />
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-cream-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-3xl font-extrabold text-black">
              Create your account
            </h2>
          </div>
          <p className="mt-2 text-center text-sm text-black/70">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6 bg-cream-50 rounded-xl shadow-lg border border-gray-200 p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-black mb-1">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`input-field ${error ? 'border-red-300' : ''}`}
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`input-field ${error ? 'border-red-300' : ''}`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-black mb-1">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="input-field"
                placeholder="Enter your full name (optional)"
                value={formData.full_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className={`input-field ${error ? 'border-red-300' : ''}`}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}

export default Register
