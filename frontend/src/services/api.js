import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login/register page
      const currentPath = window.location.pathname
      if (currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Authentication APIs
export const register = async (userData) => {
  const response = await api.post('/auth/signup', userData)
  // Store token and user data if provided
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token)
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
  }
  return response.data
}

export const login = async (credentials) => {
  const response = await api.post('/auth/login', {
    email: credentials.email,
    password: credentials.password,
  })
  
  // Store token and user data
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token)
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
  }
  
  return response.data
}

export const fetchUserProfile = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const searchUsers = async (query = '', page = 1, pageSize = 50) => {
  const response = await api.get('/auth/users', {
    params: { query, page, page_size: pageSize }
  })
  return response.data
}

export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/me', profileData)
  return response.data
}

export const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData)
  return response.data
}

// Book APIs
export const fetchBooks = async (filters = {}) => {
  const response = await api.get('/books', { params: filters })
  return response.data
}

export const fetchBook = async (bookId) => {
  const response = await api.get(`/books/${bookId}`)
  return response.data
}

export const createBook = async (bookData) => {
  const response = await api.post('/books', bookData)
  return response.data
}

export const updateBook = async (bookId, bookData) => {
  const response = await api.put(`/books/${bookId}`, bookData)
  return response.data
}

export const deleteBook = async (bookId) => {
  const response = await api.delete(`/books/${bookId}`)
  return response.data
}

export const fetchMyBooks = async () => {
  const response = await api.get('/books/my-books')
  return response.data
}

export const scanQRCode = async (qrCode) => {
  const response = await api.get(`/books/qr/${qrCode}`)
  return response.data
}

export const addBookHistory = async (bookId, historyData) => {
  const response = await api.post(`/books/${bookId}/history`, historyData)
  return response.data
}

export const addToWishlist = async (bookId) => {
  const response = await api.post(`/books/${bookId}/wishlist`)
  return response.data
}

export const removeFromWishlist = async (bookId) => {
  const response = await api.delete(`/books/${bookId}/wishlist`)
  return response.data
}

export const fetchWishlist = async () => {
  const response = await api.get('/books/wishlist/my-list')
  return response.data
}

// Exchange APIs
export const createExchangeRequest = async (requestData) => {
  const response = await api.post('/exchange/request', requestData)
  return response.data
}

export const fetchMyExchangeRequests = async () => {
  const response = await api.get('/exchange/my-requests')
  return response.data
}

export const fetchReceivedRequests = async () => {
  const response = await api.get('/exchange/requests/received')
  return response.data
}

export const fetchSentRequests = async () => {
  const response = await api.get('/exchange/requests/sent')
  return response.data
}

export const approveExchange = async (exchangeId, approval) => {
  const response = await api.post(`/exchange/approve/${exchangeId}`, approval)
  return response.data
}

export const completeExchange = async (exchangeId) => {
  const response = await api.post(`/exchange/complete/${exchangeId}`)
  return response.data
}

export const cancelExchange = async (exchangeId) => {
  const response = await api.post(`/exchange/cancel/${exchangeId}`)
  return response.data
}

// Payment APIs
export const purchasePoints = async (purchaseData) => {
  const response = await api.post('/payment/purchase-points', purchaseData)
  return response.data
}

export const fetchPaymentTransactions = async () => {
  const response = await api.get('/payment/transactions')
  return response.data
}

export const fetchPointPricing = async () => {
  const response = await api.get('/payment/pricing')
  return response.data
}

// Points APIs
export const fetchPointsBalance = async () => {
  const response = await api.get('/points/balance')
  return response.data
}

export const fetchPointTransactions = async () => {
  const response = await api.get('/points/transactions')
  return response.data
}

// Forum APIs
export const fetchForumPosts = async (filters = {}) => {
  const response = await api.get('/forums/posts', { params: filters })
  return response.data
}

export const fetchForumPost = async (postId) => {
  const response = await api.get(`/forums/posts/${postId}`)
  return response.data
}

export const createForumPost = async (postData) => {
  const response = await api.post('/forums/posts', postData)
  return response.data
}

export const createForumReply = async (postId, replyData) => {
  const response = await api.post(`/forums/posts/${postId}/replies`, replyData)
  return response.data
}

export const fetchForumReplies = async (postId, page = 1, pageSize = 50) => {
  const response = await api.get(`/forums/posts/${postId}/replies`, {
    params: { page, page_size: pageSize }
  })
  return response.data
}

export const voteForumPost = async (postId, voteType) => {
  const response = await api.post(`/forums/posts/${postId}/vote?vote_type=${voteType}`)
  return response.data
}

export const voteForumReply = async (replyId, voteType) => {
  const response = await api.post(`/forums/replies/${replyId}/vote?vote_type=${voteType}`)
  return response.data
}

export const updateForumPost = async (postId, postData) => {
  const response = await api.put(`/forums/posts/${postId}`, postData)
  return response.data
}

export const deleteForumPost = async (postId) => {
  const response = await api.delete(`/forums/posts/${postId}`)
  return response.data
}

export const updateForumReply = async (replyId, replyData) => {
  const response = await api.put(`/forums/replies/${replyId}`, replyData)
  return response.data
}

export const deleteForumReply = async (replyId) => {
  const response = await api.delete(`/forums/replies/${replyId}`)
  return response.data
}

// Message APIs
export const sendMessage = async (messageData) => {
  const response = await api.post('/messages', messageData)
  return response.data
}

export const fetchMessages = async (folder = 'inbox') => {
  const response = await api.get('/messages', { params: { folder } })
  return response.data
}

export const fetchConversations = async () => {
  const response = await api.get('/messages/conversations')
  return response.data
}

export const fetchConversation = async (userId, page = 1, pageSize = 50) => {
  const response = await api.get(`/messages/conversations/${userId}`, {
    params: { page, page_size: pageSize }
  })
  return response.data
}

export const getMessage = async (messageId) => {
  const response = await api.get(`/messages/${messageId}`)
  return response.data
}

export const markMessageAsRead = async (messageId) => {
  const response = await api.put(`/messages/${messageId}/read`)
  return response.data
}

export const markAllMessagesAsRead = async () => {
  const response = await api.put('/messages/read-all')
  return response.data
}

export const getUnreadMessageCount = async () => {
  const response = await api.get('/messages/unread/count')
  return response.data
}

export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/messages/${messageId}`)
  return response.data
}

// Exchange Points APIs
export const fetchExchangePoints = async (filters = {}) => {
  const response = await api.get('/exchange-points', { params: filters })
  return response.data
}

export const fetchNearbyExchangePoints = async (latitude, longitude, radius = 10) => {
  const response = await api.get('/exchange-points/nearby', {
    params: { latitude, longitude, radius_km: radius },
  })
  return response.data
}

export default api
