import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBook } from '../services/api'

function ListBook() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    condition: 'good',
    description: '',
    location: '',
    image_urls: [],
  })
  const [imageInputs, setImageInputs] = useState(['']) // Array of image URL inputs
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const conditions = [
    { value: 'excellent', label: 'Excellent', points: 15 },
    { value: 'good', label: 'Good', points: 12 },
    { value: 'fair', label: 'Fair', points: 8 },
    { value: 'poor', label: 'Poor', points: 5 },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    setError('')
  }

  const handleImageInputChange = (index, value) => {
    const newInputs = [...imageInputs]
    newInputs[index] = value
    setImageInputs(newInputs)
    
    // Update image_urls array
    const validUrls = newInputs.filter(url => url.trim() !== '')
    setFormData({
      ...formData,
      image_urls: validUrls,
    })
  }

  const addImageInput = () => {
    setImageInputs([...imageInputs, ''])
  }

  const removeImageInput = (index) => {
    const newInputs = imageInputs.filter((_, i) => i !== index)
    setImageInputs(newInputs)
    
    // Update image_urls array
    const validUrls = newInputs.filter(url => url.trim() !== '')
    setFormData({
      ...formData,
      image_urls: validUrls,
    })
  }

  const handleImageFileUpload = (e, index) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        const newInputs = [...imageInputs]
        newInputs[index] = base64String
        setImageInputs(newInputs)
        
        // Update image_urls array
        const validUrls = newInputs.filter(url => url.trim() !== '')
        setFormData({
          ...formData,
          image_urls: validUrls,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required')
      setLoading(false)
      return
    }
    if (!formData.author.trim()) {
      setError('Author is required')
      setLoading(false)
      return
    }

    try {
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        condition: formData.condition,
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        image_urls: formData.image_urls,
      }

      const response = await createBook(bookData)
      
      // Success - redirect to book detail or my books
      navigate(`/home/my-books`)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to create book listing. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const selectedCondition = conditions.find(c => c.value === formData.condition)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">List a New Book</h1>
        <p className="text-gray-600">Share your book with the community and earn points!</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Book Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter book title"
          />
        </div>

        {/* Author */}
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="author"
            name="author"
            required
            value={formData.author}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter author name"
          />
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
            Condition <span className="text-red-500">*</span>
          </label>
          <select
            id="condition"
            name="condition"
            required
            value={formData.condition}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {conditions.map((cond) => (
              <option key={cond.value} value={cond.value}>
                {cond.label} ({cond.points} points)
              </option>
            ))}
          </select>
          {selectedCondition && (
            <p className="mt-1 text-sm text-gray-500">
              This book will be worth <span className="font-semibold text-primary-600">{selectedCondition.points} points</span>
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Describe the book's condition, any notes, or additional information..."
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="City, State or general location"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Book Images
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload images or paste image URLs. You can add multiple images.
          </p>
          
          {imageInputs.map((input, index) => (
            <div key={index} className="mb-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => handleImageInputChange(index, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Image URL or upload file below"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFileUpload(e, index)}
                className="hidden"
                id={`file-upload-${index}`}
              />
              <label
                htmlFor={`file-upload-${index}`}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
              >
                📷 Upload
              </label>
              {imageInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImageInput(index)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addImageInput}
            className="mt-2 px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            + Add Another Image
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-primary-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-primary-900">Listing Benefits</p>
              <ul className="text-sm text-primary-700 mt-1 list-disc list-inside">
                <li>Earn <strong>10 points</strong> for listing a book</li>
                <li>Each book gets a unique digital identity (QR code)</li>
                <li>Your book will be visible to all users</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'List Book'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ListBook
