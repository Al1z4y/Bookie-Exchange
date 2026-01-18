import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchExchangePoints, createExchangePoint } from '../services/api'

// Fix for default marker icon in react-leaflet
delete Icon.Default.prototype._getIconUrl
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function ExchangePoints() {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    contact_email: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadExchangePoints()
  }, [])

  const loadExchangePoints = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchExchangePoints({ is_active: true })
      setPoints(data.points || [])
    } catch (err) {
      console.error('Error loading exchange points:', err)
      setError('Failed to load exchange points. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      setError('Please fill in all required fields (name, address, latitude, longitude)')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      const pointData = {
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        description: formData.description || null,
        is_active: true,
      }

      await createExchangePoint(pointData)
      
      // Reset form
      setFormData({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        contact_phone: '',
        contact_email: '',
        description: '',
      })
      setShowAddForm(false)
      
      // Reload points
      await loadExchangePoints()
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create exchange point. Please try again.'
      setError(errorMsg)
      console.error('Error creating exchange point:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMessageOwner = (point) => {
    // Navigate to messages page with the point creator
    if (point.created_by_user_id) {
      window.location.href = `/home/messages?user=${point.created_by_user_id}`
    } else {
      alert('Contact information not available for this exchange point.')
    }
  }

  // Default center (can be user's location or a default)
  const defaultCenter = [40.7128, -74.0060] // New York City
  const defaultZoom = 10

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exchange points...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exchange Points</h1>
          <p className="text-gray-600">Find physical locations to exchange books with other members</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
        >
          {showAddForm ? 'Cancel' : '+ Add Exchange Point'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 bg-cream-50 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Exchange Point</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 40.7128"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="input-field"
                  placeholder="e.g., -74.0060"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Additional information about this exchange point..."
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Exchange Point'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-cream-50 rounded-lg shadow-md overflow-hidden">
        <div style={{ height: '600px', width: '100%' }}>
          <MapContainer
            center={points.length > 0 ? [points[0].latitude, points[0].longitude] : defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((point) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-lg mb-2">{point.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{point.address}</p>
                    {point.description && (
                      <p className="text-sm text-gray-700 mb-2">{point.description}</p>
                    )}
                    {point.contact_phone && (
                      <p className="text-sm mb-1">
                        <span className="font-medium">Phone:</span> {point.contact_phone}
                      </p>
                    )}
                    {point.contact_email && (
                      <p className="text-sm mb-2">
                        <span className="font-medium">Email:</span> {point.contact_email}
                      </p>
                    )}
                    {point.created_by_user_id && (
                      <button
                        onClick={() => handleMessageOwner(point)}
                        className="mt-2 w-full btn-primary text-sm py-1"
                      >
                        Message Owner
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {points.length === 0 && !loading && (
        <div className="mt-6 text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No exchange points found.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add First Exchange Point
          </button>
        </div>
      )}
    </div>
  )
}

export default ExchangePoints
