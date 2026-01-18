import { useState } from 'react'

function QRCodeDisplay({ book }) {
  const [copied, setCopied] = useState(false)

  if (!book || !book.qr_code_id) {
    return null
  }

  const qrUrl = `${window.location.origin}/scan/${book.qr_code_id}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrImageUrl
    link.download = `qr-code-${book.qr_code_id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-cream-50 rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-black mb-3">QR Code</h3>
      <p className="text-sm text-gray-600 mb-4">Scan to view book history</p>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-cream-50 p-4 rounded-lg border-2 border-primary-200">
          <img
            src={qrImageUrl}
            alt={`QR Code for ${book.title}`}
            className="w-48 h-48"
          />
        </div>
        
        <div className="text-center space-y-2 w-full">
          <p className="text-sm font-medium text-black">{book.title}</p>
          <p className="text-xs text-gray-500 font-mono break-all px-2">
            {book.qr_code_id}
          </p>
        </div>
        
        <div className="flex gap-2 w-full">
          <button
            onClick={handleCopy}
            className="flex-1 btn-secondary text-sm py-2"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 btn-primary text-sm py-2"
          >
            Download QR
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeDisplay
