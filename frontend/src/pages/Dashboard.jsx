import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchUserProfile, fetchMyExchangeRequests } from '../services/api'
import PlusIconDropdown from '../components/PlusIconDropdown'

function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/')
          return
        }
        const userData = await fetchUserProfile()
        setUser(userData)
        // Update localStorage with latest user data
        localStorage.setItem('user', JSON.stringify(userData))
      } catch (err) {
        console.error('Error loading profile:', err)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [navigate])

  // Load pending requests count
  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const allRequests = await fetchMyExchangeRequests()
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        // Count pending requests where current user is the owner
        const pending = allRequests.filter(req => 
          req.owner_id === user.id && req.status === 'pending'
        )
        setPendingRequestsCount(pending.length)
      } catch (err) {
        console.error('Error loading pending requests:', err)
      }
    }

    if (user) {
      loadPendingRequests()
      // Refresh every 60 seconds (reduced from 30)
      const interval = setInterval(loadPendingRequests, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Load unread messages count
  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const data = await getUnreadMessageCount()
        setUnreadMessagesCount(data.unread_count || 0)
      } catch (err) {
        console.error('Error loading unread messages:', err)
      }
    }

    if (user) {
      loadUnreadMessages()
      // Refresh every 60 seconds (reduced from 30)
      const interval = setInterval(loadUnreadMessages, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const sidebarItems = [
    { path: '/home', label: 'Home' },
    { path: '/home/my-books', label: 'My Books' },
    { path: '/home/wishlist', label: 'Wishlist' },
    { 
      path: '/home/requests', 
      label: 'Requests', 
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    { path: '/home/scan-qr', label: 'Scan QR Code' },
    { path: '/home/forums', label: 'Forums' },
    { 
      path: '/home/messages', 
      label: 'Messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
    { path: '/home/profile', label: 'Profile Settings' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    // Navigate to home with search query if not already there
    if (location.pathname !== '/home') {
      navigate(`/home?q=${encodeURIComponent(searchQuery)}`)
    } else {
      // Update URL params for search
      const params = new URLSearchParams()
      if (searchQuery) {
        params.set('q', searchQuery)
      }
      navigate(`/home?${params.toString()}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Search Bar */}
      <div className="bg-white shadow-lg border-b-2 border-primary-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden absolute left-4 p-2 rounded-md text-black hover:bg-primary-100 transition-colors font-medium"
            >
              Menu
            </button>

            {/* Search Bar - Centered */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books, authors, or topics..."
                className="input-field"
              />
            </form>

            {/* Points Balance and Plus Icon - Right Side */}
            <div className="hidden sm:flex items-center gap-4 absolute right-4">
              {/* Points Display */}
              <div className="flex items-center gap-2 bg-primary-100 px-4 py-2 rounded-lg border-2 border-primary-200">
                <span className="text-primary font-bold text-lg">{user?.points_balance || 0}</span>
                <span className="text-primary text-sm font-medium">points</span>
              </div>

              {/* Plus Icon Dropdown */}
              <PlusIconDropdown />
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Full Height */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-lg border-r-2 border-primary-100 transition-transform duration-300 ease-in-out lg:transition-none flex flex-col`}
          style={{ top: '73px', height: 'calc(100vh - 73px)' }}
        >
          <nav className="flex-1 overflow-y-auto py-6">
            <ul className="space-y-2 px-4">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => {
                        navigate(item.path)
                        setSidebarOpen(false) // Close sidebar on mobile after navigation
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
                        isActive
                          ? 'bg-primary text-white font-semibold shadow-md'
                          : 'text-black hover:bg-primary-100 hover:text-primary font-medium'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          
          {/* Logout Button at Bottom */}
          <div className="p-4 border-t-2 border-primary-100">
            <button
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                navigate('/')
              }}
              className="w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 font-medium border-2 border-red-200 hover:border-red-300"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarOpen(false)}
            style={{ top: '73px' }}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Dashboard
