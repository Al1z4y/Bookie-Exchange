import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import MyBooks from './pages/MyBooks'
import Wishlist from './pages/Wishlist'
import Requests from './pages/Requests'
import Messages from './pages/Messages'
import Forums from './pages/Forums'
import ProfileSettings from './pages/ProfileSettings'
import BuyPoints from './pages/BuyPoints'
import ListBook from './pages/ListBook'
import BookDetail from './pages/BookDetail'
import ScanQR from './pages/ScanQR'
import Exchange from './pages/Exchange'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
            {/* Dashboard Routes */}
            <Route path="/home" element={<Dashboard />}>
              <Route index element={<Home />} />
              <Route path="my-books" element={<MyBooks />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="requests" element={<Requests />} />
              <Route path="forums" element={<Forums />} />
              <Route path="messages" element={<Messages />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="buy-points" element={<BuyPoints />} />
              <Route path="list-book" element={<ListBook />} />
              <Route path="scan-qr" element={<ScanQR />} />
            </Route>
          
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/exchange" element={<Exchange />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
