import { useState, useEffect } from 'react'
import { fetchMyExchangeRequests } from '../services/api'

function Exchange() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('sent') // 'sent' or 'received'

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true)
        const data = await fetchMyExchangeRequests()
        setRequests(data || [])
      } catch (err) {
        setError('Failed to load exchange requests.')
        console.error('Error fetching requests:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    disputed: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Exchanges</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sent')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sent'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sent Requests
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'received'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Received Requests
          </button>
        </nav>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{request.book_title}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          {activeTab === 'sent' ? 'To: ' : 'From: '}
                          <span className="font-medium">
                            {activeTab === 'sent' ? request.owner_username : request.requester_username}
                          </span>
                        </p>
                        <p>Points: <span className="font-medium">{request.points_cost}</span></p>
                        <p>
                          Date: {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.message && (
                          <p className="mt-2 text-gray-700">{request.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          statusColors[request.status] || statusColors.pending
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>
                  
                  {request.status === 'pending' && activeTab === 'received' && (
                    <div className="mt-4 flex space-x-2">
                      <button className="btn-primary">Approve</button>
                      <button className="btn-secondary">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No {activeTab} requests found.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Exchange
