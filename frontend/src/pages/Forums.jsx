import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchForumPosts,
  fetchForumPost,
  createForumPost,
  createForumReply,
  fetchForumReplies,
  voteForumPost,
  voteForumReply,
  updateForumPost,
  deleteForumPost,
  updateForumReply,
  deleteForumReply,
} from '../services/api'

function Forums() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPostDetail, setShowPostDetail] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [replyContent, setReplyContent] = useState('')
  const [isAnonymousReply, setIsAnonymousReply] = useState(false)
  const [replyLoading, setReplyLoading] = useState(false)

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Create post form
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postTags, setPostTags] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [searchQuery, sortBy, order, page])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const filters = {
        query: searchQuery || undefined,
        sort_by: sortBy,
        order: order,
        page: page,
        page_size: 20,
      }
      const data = await fetchForumPosts(filters)
      setPosts(data.posts || [])
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      setError('Failed to load forum posts. Please try again.')
      console.error('Error loading posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!postTitle.trim() || !postContent.trim()) {
      setError('Title and content are required')
      return
    }

    try {
      setCreateLoading(true)
      setError(null)
      const tags = postTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await createForumPost({
        title: postTitle,
        content: postContent,
        tags: tags,
        is_anonymous: isAnonymous,
      })

      setPostTitle('')
      setPostContent('')
      setPostTags('')
      setIsAnonymous(false)
      setShowCreateModal(false)
      loadPosts()
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'Failed to create post. Please try again.'
      setError(errorMsg)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleViewPost = async (postId) => {
    try {
      setLoading(true)
      const post = await fetchForumPost(postId)
      setSelectedPost(post)
      setShowPostDetail(true)

      // Load replies
      const repliesData = await fetchForumReplies(postId)
      setReplies(repliesData || [])
    } catch (err) {
      setError('Failed to load post details.')
      console.error('Error loading post:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedPost) return

    try {
      setReplyLoading(true)
      const newReply = await createForumReply(selectedPost.id, {
        content: replyContent,
        is_anonymous: isAnonymousReply,
      })

      setReplies([...replies, newReply])
      setReplyContent('')
      setIsAnonymousReply(false)
      // Update post reply count
      setSelectedPost({ ...selectedPost, reply_count: selectedPost.reply_count + 1 })
      // Refresh posts list
      loadPosts()
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'Failed to post reply. Please try again.'
      setError(errorMsg)
    } finally {
      setReplyLoading(false)
    }
  }

  const handleVote = async (postId, voteType) => {
    try {
      await voteForumPost(postId, voteType)
      loadPosts()
      if (selectedPost && selectedPost.id === postId) {
        const updatedPost = await fetchForumPost(postId)
        setSelectedPost(updatedPost)
      }
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  const handleReplyVote = async (replyId, voteType) => {
    try {
      await voteForumReply(replyId, voteType)
      // Reload replies
      if (selectedPost) {
        const repliesData = await fetchForumReplies(selectedPost.id)
        setReplies(repliesData || [])
      }
    } catch (err) {
      console.error('Error voting reply:', err)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-black">Book Forums & Community</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create New Post
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!showPostDetail ? (
        <>
          {/* Search and Filters */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search discussions..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    setPage(1)
                  }}
                  className="input-field"
                >
                  <option value="created_at">Date</option>
                  <option value="upvotes">Upvotes</option>
                  <option value="replies">Replies</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Order
                </label>
                <select
                  value={order}
                  onChange={(e) => {
                    setOrder(e.target.value)
                    setPage(1)
                  }}
                  className="input-field"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-black/70">Loading discussions...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-black/70">No discussions found. Be the first to start one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewPost(post.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black mb-2">{post.title}</h3>
                      <p className="text-black/70 mb-3 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-sm text-black/60">
                        <span>
                          By:{' '}
                          {post.is_anonymous
                            ? 'Anonymous'
                            : post.author_username || 'Unknown'}
                        </span>
                        <span>{formatDate(post.created_at)}</span>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-2">
                            {post.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="bg-primary-100 text-primary px-2 py-1 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote(post.id, 'upvote')
                          }}
                          className="text-primary font-semibold"
                        >
                          ▲ {post.upvotes}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote(post.id, 'downvote')
                          }}
                          className="text-red-500 font-semibold"
                        >
                          ▼ {post.downvotes}
                        </button>
                      </div>
                      <div className="text-center text-sm text-black/60">
                        <div className="font-semibold">{post.reply_count}</div>
                        <div>replies</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-4 text-black">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Post Detail View */
        <div>
          <button
            onClick={() => {
              setShowPostDetail(false)
              setSelectedPost(null)
              setReplies([])
            }}
            className="mb-4 text-primary hover:text-accent font-medium"
          >
            ← Back to Discussions
          </button>

          {selectedPost && (
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-black mb-3">{selectedPost.title}</h2>
              <div className="flex items-center gap-4 text-sm text-black/60 mb-4">
                <span>
                  By:{' '}
                  {selectedPost.is_anonymous
                    ? 'Anonymous'
                    : selectedPost.author_username || 'Unknown'}
                </span>
                <span>{formatDate(selectedPost.created_at)}</span>
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex gap-2">
                    {selectedPost.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-primary-100 text-primary px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="prose max-w-none mb-4">
                <p className="text-black whitespace-pre-wrap">{selectedPost.content}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVote(selectedPost.id, 'upvote')}
                  className="text-primary font-semibold"
                >
                  ▲ {selectedPost.upvotes}
                </button>
                <button
                  onClick={() => handleVote(selectedPost.id, 'downvote')}
                  className="text-red-500 font-semibold"
                >
                  ▼ {selectedPost.downvotes}
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          <div className="card mb-6">
            <h3 className="text-xl font-bold text-black mb-4">
              Replies ({replies.length})
            </h3>
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply.id} className="border-l-4 border-primary-100 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-black/60 mb-2">
                        <span>
                          {reply.is_anonymous
                            ? 'Anonymous'
                            : reply.author_username || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-black whitespace-pre-wrap">{reply.content}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleReplyVote(reply.id, 'upvote')}
                        className="text-primary text-sm"
                      >
                        ▲ {reply.upvotes}
                      </button>
                      <button
                        onClick={() => handleReplyVote(reply.id, 'downvote')}
                        className="text-red-500 text-sm"
                      >
                        ▼ {reply.downvotes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply Form */}
          <div className="card">
            <h3 className="text-xl font-bold text-black mb-4">Post a Reply</h3>
            <form onSubmit={handleSubmitReply}>
              <div className="mb-4">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="input-field"
                  required
                />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAnonymousReply}
                    onChange={(e) => setIsAnonymousReply(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-black">Post anonymously</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={replyLoading || !replyContent.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {replyLoading ? 'Posting...' : 'Post Reply'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">Create New Discussion</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setError(null)
                  }}
                  className="text-black/60 hover:text-black"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Enter discussion title..."
                    className="input-field"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-1">
                    Content *
                  </label>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share your thoughts, questions, or insights..."
                    rows={8}
                    className="input-field"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-black mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={postTags}
                    onChange={(e) => setPostTags(e.target.value)}
                    placeholder="e.g., fiction, mystery, book-review"
                    className="input-field"
                  />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-black">Post anonymously</span>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setError(null)
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || !postTitle.trim() || !postContent.trim()}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {createLoading ? 'Creating...' : 'Create Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Forums
