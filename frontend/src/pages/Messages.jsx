import { useState, useEffect, useRef } from 'react'
import {
  fetchConversations,
  fetchConversation,
  sendMessage,
  getUnreadMessageCount,
  markAllMessagesAsRead,
  searchUsers,
} from '../services/api'

function Messages() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const messagesEndRef = useRef(null)
  const conversationRef = useRef(null)

  useEffect(() => {
      loadConversations()
      loadUnreadCount()
      // Refresh conversations every 60 seconds (reduced from 30)
      const interval = setInterval(() => {
        loadConversations()
        loadUnreadCount()
        if (selectedConversation) {
          loadMessages(selectedConversation.other_user_id)
        }
      }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await fetchConversations()
      setConversations(data || [])
    } catch (err) {
      setError('Failed to load conversations.')
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (userId) => {
    try {
      const data = await fetchConversation(userId)
      setMessages(data || [])
      // Mark as read
      await markAllMessagesAsRead()
      loadUnreadCount()
      loadConversations()
    } catch (err) {
      setError('Failed to load messages.')
      console.error('Error loading messages:', err)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const data = await getUnreadMessageCount()
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      console.error('Error loading unread count:', err)
    }
  }

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    setError(null)
    setShowUserSearch(false)
    setUserSearchQuery('')
  }

  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchingUsers(true)
      const users = await searchUsers(query)
      // Filter out users we already have conversations with
      const existingUserIds = new Set(conversations.map(c => c.other_user_id))
      const newUsers = users.filter(user => !existingUserIds.has(user.id))
      setSearchResults(newUsers)
    } catch (err) {
      console.error('Error searching users:', err)
      setSearchResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  const handleStartConversation = async (user) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(c => c.other_user_id === user.id)
      if (existingConv) {
        handleSelectConversation(existingConv)
        return
      }

      // Create a new conversation object (will be created when first message is sent)
      const newConversation = {
        other_user_id: user.id,
        other_username: user.username,
        last_message: {
          content: 'Start a conversation...',
          created_at: new Date().toISOString(),
        },
        unread_count: 0,
      }
      setSelectedConversation(newConversation)
      setMessages([])
      setShowUserSearch(false)
      setUserSearchQuery('')
      setSearchResults([])
    } catch (err) {
      setError('Failed to start conversation.')
      console.error('Error starting conversation:', err)
    }
  }

  useEffect(() => {
    if (userSearchQuery) {
      const debounceTimer = setTimeout(() => {
        handleSearchUsers(userSearchQuery)
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
    }
  }, [userSearchQuery])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageContent.trim() || !selectedConversation) return

    try {
      setSending(true)
      setError(null)
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      await sendMessage({
        recipient_id: selectedConversation.other_user_id,
        content: messageContent.trim(),
      })

      setMessageContent('')
      // Reload messages and conversations
      await loadMessages(selectedConversation.other_user_id)
      await loadConversations()
      
      // Update selected conversation if it was a new one
      const updatedConversations = await fetchConversations()
      const updatedConv = updatedConversations.find(
        c => c.other_user_id === selectedConversation.other_user_id
      )
      if (updatedConv) {
        setSelectedConversation(updatedConv)
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'Failed to send message. Please try again.'
      setError(errorMsg)
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-black">Messages</h1>
        {unreadCount > 0 && (
          <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-semibold">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-2 border-primary-100 rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="p-4 border-b-2 border-primary-100 bg-primary-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-black">Conversations</h2>
              <button
                onClick={() => {
                  setShowUserSearch(!showUserSearch)
                  if (!showUserSearch) {
                    setUserSearchQuery('')
                    setSearchResults([])
                  }
                }}
                className="btn-secondary text-sm px-3 py-1"
              >
                {showUserSearch ? 'Cancel' : 'New Chat'}
              </button>
            </div>
            {showUserSearch && (
              <div className="mb-3">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by username or email..."
                  className="input-field w-full"
                  autoFocus
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* User Search Results */}
            {showUserSearch && (
              <div className="border-b-2 border-primary-100">
                {searchingUsers ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : userSearchQuery && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-black/70 text-sm">
                    <p>No users found.</p>
                    <p className="text-xs mt-1">Try a different search term.</p>
                  </div>
                ) : userSearchQuery && searchResults.length > 0 ? (
                  <div>
                    <div className="p-2 bg-primary-50 text-xs font-semibold text-black/70">
                      Search Results
                    </div>
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleStartConversation(user)}
                        className="w-full text-left p-4 border-b border-primary-100 hover:bg-primary-50 transition-colors"
                      >
                        <div className="font-semibold text-black">{user.username}</div>
                        {user.full_name && (
                          <div className="text-sm text-black/60">{user.full_name}</div>
                        )}
                        <div className="text-xs text-black/50 mt-1">{user.email}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-black/70 text-sm">
                    <p>Type to search for users...</p>
                  </div>
                )}
              </div>
            )}

            {/* Existing Conversations */}
            {!showUserSearch && (
              <>
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-black/70">
                    <p>No conversations yet.</p>
                    <p className="text-sm mt-2">Click "New Chat" to start a conversation!</p>
                  </div>
                ) : (
                  <div>
                    {conversations.map((conv) => (
                  <button
                    key={conv.other_user_id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-4 border-b border-primary-100 hover:bg-primary-50 transition-colors ${
                      selectedConversation?.other_user_id === conv.other_user_id
                        ? 'bg-primary-100'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-black">
                        {conv.other_username}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-black/60 truncate">
                      {conv.last_message.content}
                    </p>
                    <p className="text-xs text-black/50 mt-1">
                      {formatDate(conv.last_message.created_at)}
                    </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 border-2 border-primary-100 rounded-lg bg-white flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b-2 border-primary-100 bg-primary-50">
                <h2 className="font-bold text-black">
                  {selectedConversation.other_username}
                </h2>
              </div>

              {/* Messages */}
              <div
                ref={conversationRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-black/70 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_id === user.id
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwn
                              ? 'bg-primary text-white'
                              : 'bg-primary-100 text-black'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-white/70' : 'text-black/60'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t-2 border-primary-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message..."
                    className="input-field flex-1"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageContent.trim()}
                    className="btn-primary disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-black/70">
                <p className="text-xl mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages
