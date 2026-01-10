import { useState, useEffect } from 'react'
import { fetchUserProfile } from '../services/api'

function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const data = await fetchUserProfile()
        setUser(data)
      } catch (err) {
        setError('Failed to load profile. Please try again.')
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <p className="text-gray-900">{user?.username || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900">{user?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Since
                </label>
                <p className="text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Points Balance */}
        <div>
          <div className="card bg-primary-50">
            <h2 className="text-xl font-semibold mb-4">Points Balance</h2>
            <div className="text-4xl font-bold text-primary-600 mb-2">
              {user?.points_balance || 0}
            </div>
            <p className="text-gray-600 text-sm">Available points</p>
          </div>
        </div>
      </div>

      {/* My Books Section */}
      <div className="mt-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">My Books</h2>
          <p className="text-gray-600">Your listed books will appear here.</p>
          {/* TODO: Add user's books list */}
        </div>
      </div>
    </div>
  )
}

export default Profile
