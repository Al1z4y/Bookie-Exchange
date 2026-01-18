import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchUserProfile } from '../services/api'

function ProfileSettings() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Profile Settings
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [exchangeAlerts, setExchangeAlerts] = useState(true)
  const [messageNotifications, setMessageNotifications] = useState(true)
  const [weeklyRecommendations, setWeeklyRecommendations] = useState(false)
  const [notificationsSaving, setNotificationsSaving] = useState(false)
  const [notificationsSuccess, setNotificationsSuccess] = useState(false)

  // Privacy Settings
  const [profilePublic, setProfilePublic] = useState(true)
  const [showLocation, setShowLocation] = useState(true)
  const [allowDirectMessages, setAllowDirectMessages] = useState(true)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacySuccess, setPrivacySuccess] = useState(false)

  // App Preferences
  const [defaultCondition, setDefaultCondition] = useState('good')
  const [exchangeRadius, setExchangeRadius] = useState(10)
  const [language, setLanguage] = useState('english')
  const [darkMode, setDarkMode] = useState(false)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [preferencesSuccess, setPreferencesSuccess] = useState(false)

  // Delete Account
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    loadUserProfile()
    loadSettings()
  }, [])

  const loadUserProfile = async () => {
    try {
      const userData = await fetchUserProfile()
      setUser(userData)
      setUsername(userData.username || '')
      setEmail(userData.email || '')
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = () => {
    // Load settings from localStorage
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    
    setEmailNotifications(settings.emailNotifications !== undefined ? settings.emailNotifications : true)
    setExchangeAlerts(settings.exchangeAlerts !== undefined ? settings.exchangeAlerts : true)
    setMessageNotifications(settings.messageNotifications !== undefined ? settings.messageNotifications : true)
    setWeeklyRecommendations(settings.weeklyRecommendations !== undefined ? settings.weeklyRecommendations : false)
    setProfilePublic(settings.profilePublic !== undefined ? settings.profilePublic : true)
    setShowLocation(settings.showLocation !== undefined ? settings.showLocation : true)
    setAllowDirectMessages(settings.allowDirectMessages !== undefined ? settings.allowDirectMessages : true)
    setDefaultCondition(settings.defaultCondition || 'good')
    setExchangeRadius(settings.exchangeRadius || 10)
    setLanguage(settings.language || 'english')
    setDarkMode(settings.darkMode !== undefined ? settings.darkMode : false)
  }

  const saveProfileSettings = async () => {
    if (!username || !email) {
      alert('Username and email are required')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }

    try {
      setProfileSaving(true)
      // In a real app, this would call an API endpoint
      // For now, save to localStorage
      const updatedUser = { ...user, username, email }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      alert('Failed to save profile settings')
      console.error('Error saving profile:', err)
    } finally {
      setProfileSaving(false)
    }
  }

  const saveNotificationSettings = () => {
    setNotificationsSaving(true)
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    settings.emailNotifications = emailNotifications
    settings.exchangeAlerts = exchangeAlerts
    settings.messageNotifications = messageNotifications
    settings.weeklyRecommendations = weeklyRecommendations
    localStorage.setItem('userSettings', JSON.stringify(settings))
    
    setNotificationsSuccess(true)
    setTimeout(() => setNotificationsSuccess(false), 3000)
    setNotificationsSaving(false)
  }

  const savePrivacySettings = () => {
    setPrivacySaving(true)
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    settings.profilePublic = profilePublic
    settings.showLocation = showLocation
    settings.allowDirectMessages = allowDirectMessages
    localStorage.setItem('userSettings', JSON.stringify(settings))
    
    setPrivacySuccess(true)
    setTimeout(() => setPrivacySuccess(false), 3000)
    setPrivacySaving(false)
  }

  const saveAppPreferences = () => {
    setPreferencesSaving(true)
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    settings.defaultCondition = defaultCondition
    settings.exchangeRadius = exchangeRadius
    settings.language = language
    settings.darkMode = darkMode
    localStorage.setItem('userSettings', JSON.stringify(settings))
    
    setPreferencesSuccess(true)
    setTimeout(() => setPreferencesSuccess(false), 3000)
    setPreferencesSaving(false)
  }

  const handleExportData = () => {
    const userData = {
      profile: user,
      settings: JSON.parse(localStorage.getItem('userSettings') || '{}'),
      exportedAt: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(userData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `booksexchange-data-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = () => {
    // In a real app, this would call an API endpoint
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userSettings')
    navigate('/')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Profile Settings */}
      <div className="bg-cream-50 rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Settings</h2>
        
        <div className="space-y-4">
          {/* Profile Picture Placeholder */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-4xl shadow-md">
              📚
            </div>
            <div>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
                Upload Photo
              </button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current Password"
                className="input-field"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="input-field"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {profileSuccess && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
            )}
            <button
              onClick={saveProfileSettings}
              disabled={profileSaving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-cream-50 rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
        
        <div className="space-y-4">
          <ToggleSwitch
            label="Email Notifications"
            description="Receive email updates about your account"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <ToggleSwitch
            label="Exchange Request Alerts"
            description="Get notified when someone requests your books"
            checked={exchangeAlerts}
            onChange={setExchangeAlerts}
          />
          <ToggleSwitch
            label="New Message Notifications"
            description="Alert me when I receive new messages"
            checked={messageNotifications}
            onChange={setMessageNotifications}
          />
          <ToggleSwitch
            label="Weekly Book Recommendations"
            description="Receive weekly book suggestions based on your interests"
            checked={weeklyRecommendations}
            onChange={setWeeklyRecommendations}
          />

          <div className="flex items-center justify-between pt-2">
            {notificationsSuccess && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
            )}
            <button
              onClick={saveNotificationSettings}
              disabled={notificationsSaving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {notificationsSaving ? 'Saving...' : 'Save Notifications'}
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-cream-50 rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Settings</h2>
        
        <div className="space-y-4">
          <ToggleSwitch
            label="Public Profile"
            description="Allow others to view your profile"
            checked={profilePublic}
            onChange={setProfilePublic}
          />
          <ToggleSwitch
            label="Show Location in Listings"
            description="Display your location in book listings"
            checked={showLocation}
            onChange={setShowLocation}
          />
          <ToggleSwitch
            label="Allow Direct Messages"
            description="Let other users send you messages"
            checked={allowDirectMessages}
            onChange={setAllowDirectMessages}
          />

          <div className="flex items-center justify-between pt-2">
            {privacySuccess && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
            )}
            <button
              onClick={savePrivacySettings}
              disabled={privacySaving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {privacySaving ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-cream-50 rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">App Preferences</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Book Condition
            </label>
            <select
              value={defaultCondition}
              onChange={(e) => setDefaultCondition(e.target.value)}
              className="input-field"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Exchange Radius: {exchangeRadius} miles
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={exchangeRadius}
              onChange={(e) => setExchangeRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 mile</span>
              <span>50 miles</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
            </select>
          </div>

          <ToggleSwitch
            label="Dark Mode"
            description="Switch to dark theme (coming soon)"
            checked={darkMode}
            onChange={setDarkMode}
          />

          <div className="flex items-center justify-between pt-2">
            {preferencesSuccess && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved!</span>
            )}
            <button
              onClick={saveAppPreferences}
              disabled={preferencesSaving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {preferencesSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-cream-50 rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Actions</h2>
        
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-left"
          >
            Export My Data
          </button>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-left"
          >
            Delete Account
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-cream-50 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Delete Account?</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete your account? This will permanently remove all your data, 
              including your books, exchanges, and messages. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Toggle Switch Component
function ToggleSwitch({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-500' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default ProfileSettings
