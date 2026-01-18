import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { scanQRCodeById, addQRHistory } from '../services/api'

function QRScanner() {
  const navigate = useNavigate()
  const { qrCodeId } = useParams()
  const [scanning, setScanning] = useState(false)
  const [bookData, setBookData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddHistory, setShowAddHistory] = useState(false)
  const [historyForm, setHistoryForm] = useState({
    reader_name: '',
    reading_start_date: '',
    reading_end_date: '',
    cities_read: '',
    reading_notes: '',
    tips_for_next_reader: '',
  })
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  // If qrCodeId is in URL params, load book directly
  useEffect(() => {
    if (qrCodeId) {
      loadBookByQR(qrCodeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCodeId])

  const loadBookByQR = async (codeId) => {
    try {
      setLoading(true)
      setError(null)
      const data = await scanQRCodeById(codeId)
      setBookData(data)
      setShowAddHistory(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load book. Please check the QR code and try again.')
      setBookData(null)
    } finally {
      setLoading(false)
    }
  }

  const startScanning = async () => {
    try {
      setScanning(true)
      setError(null)
      
      const html5QrCode = new Html5Qrcode("qr-reader")
      html5QrCodeRef.current = html5QrCode
      
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Extract QR code ID from URL if it's a full URL
          let qrCodeId = decodedText
          
          // If it's a URL like /scan/{qrCodeId}, extract the ID
          if (decodedText.includes('/scan/')) {
            qrCodeId = decodedText.split('/scan/')[1]?.split('?')[0] || decodedText
          }
          
          // Stop scanning
          stopScanning()
          
          // Load book data
          loadBookByQR(qrCodeId)
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      )
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Failed to start camera. Please check permissions and try again.')
      setScanning(false)
    }
  }

  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().then(() => {
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
        setScanning(false)
      }).catch((err) => {
        console.error('Error stopping scanner:', err)
        setScanning(false)
      })
    }
  }

  const handleAddHistory = async (e) => {
    e.preventDefault()
    if (!bookData) return

    try {
      setLoading(true)
      setError(null)
      
      // Calculate reading duration if both dates provided
      let reading_duration_days = null
      if (historyForm.reading_start_date && historyForm.reading_end_date) {
        const start = new Date(historyForm.reading_start_date)
        const end = new Date(historyForm.reading_end_date)
        const diffTime = Math.abs(end - start)
        reading_duration_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      await addQRHistory(bookData.book.qr_code_id || qrCodeId, {
        reader_name: historyForm.reader_name,
        reading_start_date: historyForm.reading_start_date || null,
        reading_end_date: historyForm.reading_end_date || null,
        cities_read: historyForm.cities_read,
        reading_notes: historyForm.reading_notes,
        tips_for_next_reader: historyForm.tips_for_next_reader,
        action: 'read',
        reading_duration_days: reading_duration_days,
      })

      // Refresh book data
      const data = await scanQRCodeById(bookData.book.qr_code_id || qrCodeId)
      setBookData(data)
      
      // Reset form
      setHistoryForm({
        reader_name: '',
        reading_start_date: '',
        reading_end_date: '',
        cities_read: '',
        reading_notes: '',
        tips_for_next_reader: '',
      })
      
      alert('History entry added successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add history entry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleScanAnother = () => {
    setBookData(null)
    setShowAddHistory(false)
    setError(null)
    if (html5QrCodeRef.current) {
      stopScanning()
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        stopScanning()
      }
    }
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-black mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Scan QR Code
        </h1>
        <p className="text-gray-600">
          Scan a book's QR code to view its reading history
        </p>
      </div>

      {!bookData && (
        <div className="card mb-8">
          {!scanning ? (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-700">Click the button below to start scanning</p>
              <button
                onClick={startScanning}
                className="btn-primary"
              >
                Start Camera Scanner
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full"></div>
              <button
                onClick={stopScanning}
                className="w-full btn-secondary"
              >
                Stop Scanning
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {loading && !bookData && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {bookData && (
        <div className="space-y-6">
          {/* Book Information */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-black">Book Information</h2>
              <button
                onClick={handleScanAnother}
                className="btn-secondary text-sm"
              >
                Scan Another
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-black mb-2">{bookData.book.title}</h3>
                <p className="text-gray-600 mb-4">by {bookData.book.author}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Condition:</span>
                    <span className="ml-2 px-3 py-1 bg-primary-100 text-primary-600 rounded-lg text-sm font-medium">
                      {bookData.book.condition}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Points Value:</span>
                    <span className="ml-2 text-primary-600 font-bold">{bookData.book.point_value} pts</span>
                  </div>
                  {bookData.book.location && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Location:</span>
                      <span className="ml-2 text-gray-600">{bookData.book.location}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-700">Current Owner:</span>
                    <span className="ml-2 text-gray-600">{bookData.book.owner_username}</span>
                  </div>
                </div>
              </div>
              {bookData.book.image_urls && bookData.book.image_urls.length > 0 && (
                <div>
                  <img
                    src={bookData.book.image_urls[0]}
                    alt={bookData.book.title}
                    className="w-full max-w-xs rounded-lg border border-gray-200 shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reading History Timeline */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-black mb-4">Reading History Timeline</h2>
            
            {bookData.history && bookData.history.length > 0 ? (
              <div className="space-y-4">
                {bookData.history.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="border-l-4 border-primary-500 pl-4 pb-4 relative"
                  >
                    {index < bookData.history.length - 1 && (
                      <div className="absolute left-[-2px] top-8 bottom-0 w-0.5 bg-gray-200"></div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-black">
                            {entry.reader_name || entry.username || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {entry.action.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                      
                      {entry.reading_start_date && entry.reading_end_date && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Reading Period:</span>{' '}
                            {formatDate(entry.reading_start_date)} - {formatDate(entry.reading_end_date)}
                            {entry.reading_duration_days && (
                              <span className="ml-2 text-gray-600">
                                ({entry.reading_duration_days} days)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      
                      {entry.cities_read && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Cities Read:</span>{' '}
                            <span className="text-gray-600">{entry.cities_read}</span>
                          </p>
                        </div>
                      )}
                      
                      {entry.reading_notes && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Reading Notes:</p>
                          <p className="text-sm text-gray-600">{entry.reading_notes}</p>
                        </div>
                      )}
                      
                      {entry.tips_for_next_reader && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-primary-600 mb-1">💡 Tips for Next Reader:</p>
                          <p className="text-sm text-gray-700">{entry.tips_for_next_reader}</p>
                        </div>
                      )}
                      
                      {entry.notes && !entry.reading_notes && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No reading history available yet.</p>
                <p className="text-sm mt-2">Be the first to add a history entry!</p>
              </div>
            )}
          </div>

          {/* Add History Form */}
          {showAddHistory && (
            <div className="card">
              <h2 className="text-2xl font-semibold text-black mb-4">Add Your Reading History</h2>
              <form onSubmit={handleAddHistory} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name (optional)
                    </label>
                    <input
                      type="text"
                      value={historyForm.reader_name}
                      onChange={(e) => setHistoryForm({ ...historyForm, reader_name: e.target.value })}
                      placeholder="Your name"
                      className="input-field text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cities Read (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={historyForm.cities_read}
                      onChange={(e) => setHistoryForm({ ...historyForm, cities_read: e.target.value })}
                      placeholder="e.g., New York, Paris, Tokyo"
                      className="input-field text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reading Start Date
                    </label>
                    <input
                      type="date"
                      value={historyForm.reading_start_date}
                      onChange={(e) => setHistoryForm({ ...historyForm, reading_start_date: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reading End Date
                    </label>
                    <input
                      type="date"
                      value={historyForm.reading_end_date}
                      onChange={(e) => setHistoryForm({ ...historyForm, reading_end_date: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reading Notes
                  </label>
                  <textarea
                    value={historyForm.reading_notes}
                    onChange={(e) => setHistoryForm({ ...historyForm, reading_notes: e.target.value })}
                    placeholder="Share your thoughts about the book..."
                    rows={4}
                    className="input-field text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tips for Next Reader
                  </label>
                  <textarea
                    value={historyForm.tips_for_next_reader}
                    onChange={(e) => setHistoryForm({ ...historyForm, tips_for_next_reader: e.target.value })}
                    placeholder="Share tips, recommendations, or insights for the next reader..."
                    rows={3}
                    className="input-field text-sm"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Adding...' : 'Add to History'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QRScanner
