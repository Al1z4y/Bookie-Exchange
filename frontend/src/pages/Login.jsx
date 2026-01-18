import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/api'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
      const response = await login({
        email: formData.email,
        password: formData.password,
      })
      // Token and user are already stored in api.js
      navigate('/home')
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.'
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
                <div class="text-center text-primary-600">
                  <div class="text-8xl mb-6">📚</div>
                  <h1 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Bookie Exchange</h1>
                  <p class="text-xl md:text-2xl text-primary-700">
                    Exchange Books with Your Community
                  </p>
                  <p class="text-lg text-gray-600 mt-4">
                    Share stories. Discover new worlds.
                  </p>
                </div>
              `
            }}
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-cream-500">
        <div className="w-full max-w-md">
          {/* Mobile Logo/Header */}
          <div className="md:hidden text-center mb-8">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-3xl font-bold text-primary-600 mb-2">Bookie Exchange</h1>
            <p className="text-black/70">Swap books, share stories</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-cream-50 rounded-xl shadow-lg border border-gray-200 p-8 md:p-10">
            <h2 className="text-3xl font-bold text-black mb-2">Login</h2>
            <p className="text-black/70 mb-8">Welcome back! Please login to your account.</p>

            {/* Error Message Display */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field ${
                    error ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field ${
                    error ? 'border-red-300' : ''
                  }`}
                  placeholder="Enter your password"
                />
              </div>

              {/* Forgot Password Link (Optional) */}
              <div className="flex justify-end">
                <a href="#" className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-black/70">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-primary-600 font-semibold hover:text-primary-700 transition-colors duration-200 underline decoration-2 underline-offset-2 hover:decoration-primary-700"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info (Optional) */}
          <div className="mt-6 text-center text-sm text-black/60">
            <p>By logging in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
