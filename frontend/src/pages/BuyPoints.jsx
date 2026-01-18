import { useState, useEffect } from 'react'
import { purchasePoints, fetchUserProfile } from '../services/api'

function BuyPoints() {
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState(null)

  const pointPackages = [
    { points: 10, price: 2.99 },
    { points: 25, price: 6.99 },
    { points: 50, price: 12.99 },
  ]

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const userData = await fetchUserProfile()
      setUser(userData)
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      console.error('Error loading user profile:', err)
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(storedUser)
    }
  }

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg)
    setShowPaymentForm(false)
    setError('')
    setSuccess('')
  }

  const handleProceedToPayment = () => {
    if (!selectedPackage) {
      setError('Please select a point package')
      return
    }
    setShowPaymentForm(true)
    setError('')
    setSuccess('')
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedPackage) {
      setError('Please select a point package')
      return
    }

    // Validate payment form
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardholderName) {
      setError('Please fill in all payment fields')
      return
    }

    // Validate card number format
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '')
    if (cardNumber.length < 13 || cardNumber.length > 19 || !/^\d+$/.test(cardNumber)) {
      setError('Please enter a valid card number')
      return
    }

    // Validate expiry date format
    if (!/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      setError('Please enter a valid expiry date (MM/YY)')
      return
    }

    // Validate CVV
    if (paymentData.cvv.length < 3 || paymentData.cvv.length > 4 || !/^\d+$/.test(paymentData.cvv)) {
      setError('Please enter a valid CVV')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Make fake payment API call
      await purchasePoints({
        points_amount: selectedPackage.points,
        amount_usd: selectedPackage.price,
        payment_method: 'credit_card',
      })

      // Refresh user data
      await loadUserProfile()

      setSuccess(`Successfully purchased ${selectedPackage.points} points! Your new balance is ${(user?.points_balance || 0) + selectedPackage.points} points.`)
      
      // Reset form
      setShowPaymentForm(false)
      setSelectedPackage(null)
      setPaymentData({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.')
      console.error('Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy Points</h1>
        <p className="text-gray-600">Purchase points to exchange books with other members</p>
        {user && (
          <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Current Balance: <span className="font-bold text-primary-600 text-lg">{user.points_balance || 0} points</span>
            </p>
          </div>
        )}
      </div>

      {!showPaymentForm ? (
        <>
          {/* Point Packages */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Point Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pointPackages.map((pkg) => (
                <button
                  key={pkg.points}
                  onClick={() => handlePackageSelect(pkg)}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedPackage?.points === pkg.points
                      ? 'border-primary-500 bg-primary-50 shadow-lg'
                      : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {pkg.points} Points
                    </div>
                    <div className="text-2xl font-semibold text-primary-600 mb-2">
                      ${pkg.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${(pkg.price / pkg.points).toFixed(3)} per point
                    </div>
                    {selectedPackage?.points === pkg.points && (
                      <div className="mt-3 text-sm font-medium text-primary-600">
                        ✓ Selected
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Proceed Button */}
          <div className="flex justify-end">
            <button
              onClick={handleProceedToPayment}
              disabled={!selectedPackage}
              className="btn-primary px-8"
            >
              Proceed to Payment
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Packages
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Information</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Selected Package:</span>
                <span className="font-bold text-gray-900 text-lg">
                  {selectedPackage.points} Points - ${selectedPackage.price.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={paymentData.cardholderName}
                  onChange={(e) => setPaymentData({ ...paymentData, cardholderName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, cardNumber: formatCardNumber(e.target.value) })}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  className="w-full input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={paymentData.expiryDate}
                    onChange={(e) => setPaymentData({ ...paymentData, expiryDate: formatExpiryDate(e.target.value) })}
                    placeholder="MM/YY"
                    maxLength="5"
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="123"
                    maxLength="4"
                    className="w-full input-field"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">🔒 Secure Payment (Demo Mode)</p>
                <p>This is a demo payment system. No real charges will be made. Your card information is not stored.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? 'Processing Payment...' : `Pay $${selectedPackage.price.toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

export default BuyPoints
