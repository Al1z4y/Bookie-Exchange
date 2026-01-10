import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchReceivedRequests, approveExchange, fetchMyExchangeRequests } from '../services/api'

function Requests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      // Fetch all requests and filter for received (pending) ones
      const allRequests = await fetchMyExchangeRequests()
      // Filter for requests where current user is the owner (received requests)
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const received = allRequests.filter(req => 
        req.owner_id === user.id && req.status === 'pending'
      )
      setRequests(received)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to load requests. Please try again.'
      setError(errorMsg)
      console.error('Error fetching requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (exchangeId) => {
    try {
      setProcessingId(exchangeId)
      await approveExchange(exchangeId, { approve: true, message: null })
      // Reload requests (approved requests will no longer appear as they're now completed)
      await loadRequests()
      // Show success message
      alert('Exchange request approved! The book ownership has been transferred.')
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to approve request. Please try again.'
      alert(errorMsg)
      console.error('Error approving request:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (exchangeId) => {
    try {
      setProcessingId(exchangeId)
      await approveExchange(exchangeId, { approve: false, message: null })
      // Reload requests
      await loadRequests()
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to reject request. Please try again.'
      alert(errorMsg)
      console.error('Error rejecting request:', err)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exchange Requests</h1>
          <p className="text-gray-600">Requests from other users for your books</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Pending Requests</h2>
          <p className="text-gray-600">You don't have any pending exchange requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{request.book_title}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Requested by:</span> {request.requester_username}
                    </p>
                    <p>
                      <span className="font-medium">Points:</span> {request.points_cost}
                    </p>
                    <p>
                      <span className="font-medium">Date:</span> {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-700 mb-1">Message:</p>
                        <p className="text-gray-600">{request.message}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <span className="px-3 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === request.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === request.id ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => navigate(`/book/${request.book_id}`)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  View Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Requests
