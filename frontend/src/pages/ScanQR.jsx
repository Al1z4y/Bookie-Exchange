import { useState } from 'react'
import { scanQRCode, addBookHistory } from '../services/api'

function ScanQR() {
  const [qrCode, setQrCode] = useState('')
  const [bookData, setBookData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddHistory, setShowAddHistory] = useState(false)
  
  // Form for adding history
  const [historyNotes, setHistoryNotes] = useState('')
  const [historyCity, setHistoryCity] = useState('')
  const [readingDuration, setReadingDuration] = useState('')
  const [submittingHistory, setSubmittingHistory] = useState(false)

  const handleScan = async (e) => {
    e.preventDefault()
    if (!qrCode.trim()) {
      setError('Please enter a QR code')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await scanQRCode(qrCode.trim())
      setBookData(data)
      setShowAddHistory(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to scan QR code. Please check the code and try again.')
      setBookData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAddHistory = async (e) => {
    e.preventDefault()
    if (!bookData) return

    try {
      setSubmittingHistory(true)
      setError(null)
      
      const historyData = {
        notes: historyNotes.trim() || null,
        city: historyCity.trim() || null,
        reading_duration_days: readingDuration ? parseInt(readingDuration) : null,
        action: 'read',
      }

      const newHistory = await addBookHistory(bookData.book.id, historyData)
      
      // Reload book data to show new history
      const updatedData = await scanQRCode(qrCode.trim())
      setBookData(updatedData)
      
      // Reset form
      setHistoryNotes('')
      setHistoryCity('')
      setReadingDuration('')
      setShowAddHistory(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add history entry. Please try again.')
    } finally {
      setSubmittingHistory(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (days) => {
    if (!days) return 'N/A'
    if (days === 1) return '1 day'
    if (days < 7) return `${days} days`
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-black mb-6">Scan Book QR Code</h1>

      {/* QR Code Input */}
      <div className="card mb-6">
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label htmlFor="qrCode" className="block text-sm font-medium text-black mb-2">
              Enter QR Code
            </label>
            <div className="flex gap-2">
              <input
                id="qrCode"
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Enter or scan QR code..."
                className="input-field flex-1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !qrCode.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
            <p className="text-sm text-black/60 mt-2">
              Enter the QR code from the book or use your device camera to scan it.
            </p>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {bookData && (
        <div className="space-y-6">
          {/* Book Details */}
          <div className="card">
            <h2 className="text-2xl font-bold text-black mb-4">Book Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-black">{bookData.book.title}</h3>
                <p className="text-black/70">by {bookData.book.author}</p>
              </div>
              <div className="text-sm text-black/60">
                <p><strong>Condition:</strong> {bookData.book.condition}</p>
                <p><strong>Point Value:</strong> {bookData.book.point_value} points</p>
                <p><strong>Location:</strong> {bookData.book.location || 'N/A'}</p>
                {bookData.current_holder && (
                  <p><strong>Current Holder:</strong> {bookData.current_holder.username}</p>
                )}
              </div>
            </div>
            {bookData.book.description && (
              <div className="mt-4">
                <p className="text-black/70">{bookData.book.description}</p>
              </div>
            )}
            {bookData.book.image_urls && bookData.book.image_urls.length > 0 && (
              <div className="mt-4">
                <img
                  src={bookData.book.image_urls[0]}
                  alt={bookData.book.title}
                  className="max-w-xs rounded-lg border-2 border-primary-100"
                />
              </div>
            )}
          </div>

          {/* Reading History Timeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-black">Reading History Timeline</h2>
              <button
                onClick={() => setShowAddHistory(!showAddHistory)}
                className="btn-primary"
              >
                {showAddHistory ? 'Cancel' : 'Add My History'}
              </button>
            </div>

            {/* Add History Form */}
            {showAddHistory && (
              <div className="mb-6 p-4 bg-primary-50 rounded-lg border-2 border-primary-100">
                <h3 className="text-lg font-semibold text-black mb-4">Add Your Reading History</h3>
                <form onSubmit={handleAddHistory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      City Where Read (optional)
                    </label>
                    <input
                      type="text"
                      value={historyCity}
                      onChange={(e) => setHistoryCity(e.target.value)}
                      placeholder="e.g., New York, London"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Reading Duration (days, optional)
                    </label>
                    <input
                      type="number"
                      value={readingDuration}
                      onChange={(e) => setReadingDuration(e.target.value)}
                      placeholder="e.g., 7"
                      min="1"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Tips & Notes for Next Readers (optional)
                    </label>
                    <textarea
                      value={historyNotes}
                      onChange={(e) => setHistoryNotes(e.target.value)}
                      placeholder="Share your thoughts, favorite quotes, or tips for future readers..."
                      rows={4}
                      className="input-field"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingHistory}
                    className="btn-primary disabled:opacity-50"
                  >
                    {submittingHistory ? 'Adding...' : 'Add to History'}
                  </button>
                </form>
              </div>
            )}

            {/* History Timeline */}
            {bookData.history && bookData.history.length > 0 ? (
              <div className="space-y-4">
                {bookData.history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="border-l-4 border-primary pl-4 py-3 relative"
                  >
                    <div className="absolute -left-2 top-4 w-4 h-4 bg-primary rounded-full border-2 border-white"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-black">
                            {entry.username || 'Anonymous Reader'}
                          </span>
                          <span className="text-sm text-black/60">
                            {formatDate(entry.created_at)}
                          </span>
                          {entry.action && (
                            <span className="text-xs bg-primary-100 text-primary px-2 py-1 rounded">
                              {entry.action}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-black/70">
                          {entry.city && (
                            <p><strong>📍 City:</strong> {entry.city}</p>
                          )}
                          {entry.reading_duration_days && (
                            <p><strong>⏱️ Duration:</strong> {formatDuration(entry.reading_duration_days)}</p>
                          )}
                          {entry.notes && (
                            <div className="mt-2 p-3 bg-white rounded border border-primary-100">
                              <p className="text-black whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-black/70">
                <p>No reading history yet.</p>
                <p className="text-sm mt-2">Be the first to add your reading experience!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!bookData && !loading && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📖</div>
          <p className="text-black/70">Enter a QR code above to view book history</p>
        </div>
      )}
    </div>
  )
}

export default ScanQR
