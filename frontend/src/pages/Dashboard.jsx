import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchUserProfile, fetchMyExchangeRequests, getUnreadMessageCount } from '../services/api'
import PlusIconDropdown from '../components/PlusIconDropdown'
import {
  BrowseBooksIcon,
  MyBooksIcon,
  ExchangesIcon,
  MessagesIcon,
  ProfileIcon,
  WishlistIcon,
  PointsIcon,
  SearchIcon,
  SettingsIcon,
  ForumsIcon,
  NotificationIcon,
  ExchangePointsIcon
} from '../components/Icons'

function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
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

  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const allRequests = await fetchMyExchangeRequests()
        const user = JSON.parse(localStorage.getItem('user') || '{}')
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
      const interval = setInterval(loadPendingRequests, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

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
      const interval = setInterval(loadUnreadMessages, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const sidebarItems = [
    { path: '/home', label: 'Browse Books', icon: BrowseBooksIcon },
    { path: '/home/my-books', label: 'My Books', icon: MyBooksIcon },
    { path: '/home/wishlist', label: 'Wishlist', icon: WishlistIcon },
    { 
      path: '/home/requests', 
      label: 'Exchanges', 
      icon: ExchangesIcon,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    { 
      path: '/home/messages', 
      label: 'Messages',
      icon: MessagesIcon,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
    { path: '/home/scan-qr', label: 'Scan QR Code', icon: SearchIcon },
    { path: '/home/forums', label: 'Forums', icon: ForumsIcon },
    { path: '/home/exchange-points', label: 'Exchange Points', icon: ExchangePointsIcon },
    { path: '/home/profile', label: 'Settings', icon: SettingsIcon },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    if (location.pathname !== '/home') {
      navigate(`/home?q=${encodeURIComponent(searchQuery)}`)
    } else {
      const params = new URLSearchParams()
      if (searchQuery) {
        params.set('q', searchQuery)
      }
      navigate(`/home?${params.toString()}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-500 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-cream-600 border-r border-gray-300 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out flex flex-col h-full`}
      >
        {/* User Profile Card */}
        <div className="flex-shrink-0 p-6 border-b border-gray-300 bg-gradient-to-br from-cream-600 to-cream-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-3xl shadow-md">
              📚
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-black truncate text-base">{user?.username || 'User'}</h3>
              <p className="text-sm text-gray-600 truncate">{user?.email || ''}</p>
            </div>
          </div>
          
          {/* Points Balance Card */}
          <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl p-4 border border-primary-300 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PointsIcon className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-700 mb-1 font-medium">Points Balance</p>
                  <p className="text-2xl font-bold text-primary-600">{user?.points_balance || 0}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/home/buy-points')}
                className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 min-h-0">
          <ul className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path
              const IconComponent = item.icon
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${
                      isActive
                        ? 'bg-primary-100 text-primary-600 font-medium shadow-sm border-l-4 border-primary-500'
                        : 'text-black hover:bg-primary-50 font-normal'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-accent-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-300 bg-cream-500">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              navigate('/')
            }}
            className="w-full px-4 py-2.5 rounded-lg text-gray-700 hover:bg-cream-50 hover:shadow-sm transition-all duration-200 font-medium text-left border border-gray-200 hover:border-gray-300"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="bg-cream-500 border-b border-gray-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Mobile Menu */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h1 className="hidden sm:block text-xl font-semibold text-primary-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    BooksExchange
                  </h1>
                </div>
              </div>

              {/* Search Bar - Centered */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books, authors, or topics..."
                    className="w-full pl-11 pr-4 py-2.5 bg-cream-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                  />
                  <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </form>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                {/* Points Display - Mobile */}
                <div className="sm:hidden flex items-center gap-1.5 bg-primary-100 px-3 py-1.5 rounded-lg border border-primary-300">
                  <PointsIcon className="w-4 h-4 text-primary-600" />
                  <span className="text-primary-600 font-semibold text-sm">{user?.points_balance || 0}</span>
                </div>

                {/* Notifications */}
                <button
                  onClick={() => navigate('/home/messages')}
                  className="relative icon-button"
                  aria-label="Notifications"
                >
                  <NotificationIcon className="w-6 h-6" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-accent-500 text-white text-xs font-semibold rounded-full flex items-center justify-center shadow-sm">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>

                {/* Plus Icon Dropdown */}
                <PlusIconDropdown />

                {/* User Avatar Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-2xl shadow-md">
                      📚
                    </div>
                    <svg className="hidden lg:block h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User Dropdown Menu */}
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-cream-50 rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigate('/home/profile')
                            setUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-cream-200 transition-colors flex items-center gap-2"
                        >
                          <ProfileIcon className="w-4 h-4" />
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            navigate('/')
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="md:hidden pb-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books, authors..."
                  className="w-full pl-11 pr-4 py-2.5 bg-cream-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400 shadow-sm"
                />
                <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </form>
            </div>
          </div>
        </header>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-cream-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
