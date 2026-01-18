import { useState, useEffect } from 'react'
import { purchasePoints } from '../services/api'

function InsufficientPointsModal({ isOpen, onClose, pointsNeeded, currentPoints, onPurchaseSuccess }) {
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

  const pointPackages = [
    { points: 10, price: 2.99 },
    { points: 25, price: 6.99 },
    { points: 50, price: 12.99 },
  ]

  useEffect(() => {
    if (isOpen) {
      // Auto-select the smallest package that covers the deficit
      const deficit = pointsNeeded - currentPoints
      const suitablePackage = pointPackages.find(pkg => pkg.points >= deficit) || pointPackages[0]
      setSelectedPackage(suitablePackage)
      setShowPaymentForm(false)
      setPaymentData({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
      })
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pointsNeeded, currentPoints])

  if (!isOpen) return null

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg)
    setShowPaymentForm(false)
    setError('')
  }

  const handleProceedToPayment = () => {
    if (!selectedPackage) {
      setError('Please select a point package')
      return
    }
    setShowPaymentForm(true)
    setError('')
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

    // Validate card number format (basic check)
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '')
    if (cardNumber.length < 13 || cardNumber.length > 19 || !/^\d+$/.test(cardNumber)) {
      setError('Please enter a valid card number')
      return
    }

    // Validate expiry date format (MM/YY)
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

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Make fake payment API call
      await purchasePoints({
        points_amount: selectedPackage.points,
        amount_usd: selectedPackage.price,
        payment_method: 'credit_card',
      })

      // Update user data in localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      user.points_balance = (user.points_balance || 0) + selectedPackage.points
      localStorage.setItem('user', JSON.stringify(user))

      // Call success callback
      if (onPurchaseSuccess) {
        onPurchaseSuccess(selectedPackage.points)
      }

      // Close modal
      onClose()
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

  const deficit = pointsNeeded - currentPoints

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Insufficient Points</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Points Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-yellow-900">You need more points to complete this exchange</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Required: <span className="font-bold">{pointsNeeded} points</span> • 
                  You have: <span className="font-bold">{currentPoints} points</span> • 
                  Need: <span className="font-bold text-red-600">{deficit} more points</span>
                </p>
              </div>
            </div>
          </div>

          {!showPaymentForm ? (
            <>
              {/* Point Packages */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Point Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pointPackages.map((pkg) => (
                    <button
                      key={pkg.points}
                      onClick={() => handlePackageSelect(pkg)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPackage?.points === pkg.points
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {pkg.points} Points
                        </div>
                        <div className="text-lg font-semibold text-primary-600 mb-2">
                          ${pkg.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${(pkg.price / pkg.points).toFixed(3)} per point
                        </div>
                        {pkg.points >= deficit && (
                          <div className="mt-2 text-xs font-medium text-green-600">
                            ✓ Covers your needs
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

              {/* Proceed Button */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedPackage}
                  className="flex-1 btn-primary"
                >
                  Proceed to Payment
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Payment Form */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Selected Package:</span>
                    <span className="font-semibold text-gray-900">
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <p className="font-semibold mb-1">🔒 Secure Payment (Demo Mode)</p>
                    <p>This is a demo payment system. No real charges will be made.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPaymentForm(false)}
                      className="flex-1 btn-secondary"
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 btn-primary"
                    >
                      {loading ? 'Processing...' : `Pay $${selectedPackage.price.toFixed(2)}`}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default InsufficientPointsModal
