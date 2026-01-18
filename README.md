# BOOKIE - Your Book Exchange App

**"SHARE STORIES. DISCOVER NEW WORLDS."**

A comprehensive book exchange platform that enables users to swap books, build community, and track reading journeys through QR code-based history.

## 🌟 Features

### 📚 Book Management
- **Book Listing**: List books with title, author, condition, pictures, and location
- **Unique Digital Identity**: Each physical book has exactly one permanent UUID that persists across ownership transfers
- **QR Code Generation**: Automatic QR code generation for each book when first listed
- **Search & Filter**: Advanced search by title, author, condition, location, and point value range
- **Book Valuation**: AI-based dynamic point calculation considering condition, demand, and rarity

### 🔄 Point-Based Exchange System
- **Earn Points**: Users earn 10 points for listing books
- **Request Books**: Request books using points (deducted only upon approval)
- **Ownership Transfer**: Seamless book ownership transfer upon exchange approval
- **Circular Exchange Prevention**: Graph-based detection prevents point farming through circular exchanges
- **Dispute Handling**: System for handling disputes when book condition doesn't match listing

### 💰 Payment Gateway
- **Purchase Points**: Buy points with real money if you don't have enough
- **Point Pricing**: Transparent point pricing system
- **Transaction History**: Complete payment and point transaction history

### 🔍 Browse & Discovery
- **Advanced Search**: Search books by title, author, or keywords
- **Smart Filters**: Filter by author, condition, location, and point range
- **Wishlist**: Add books to wishlist and receive availability alerts
- **Book Cards**: Beautiful book cards with images and details

### 📍 Exchange Points
- **Physical Locations**: Add and manage physical exchange point stalls
- **Proximity Search**: Find nearby exchange points using coordinates
- **Map Integration**: View exchange points on a map

### 📖 QR Code-Based Book History
- **Permanent Digital Identity**: Each book has a unique UUID that never changes
- **Complete Timeline**: View full reading history including:
  - Cities where the book has been read
  - Reading duration by previous readers
  - Tips and notes from previous readers
- **Add Your Story**: Contribute your own reading experience to the timeline
- **Persistent History**: History preserved even if user accounts are deleted
- **Living Timeline**: History grows with every exchange

### 💬 Book Forums & Community Discussions
- **Reader Discussions**: Engage in book discussions and debates
- **Chapter-wise Debates**: Organize discussions by chapters or topics
- **Interpretations & Opinions**: Share and discuss book interpretations
- **Abuse Detection**: Automated content moderation
- **Anonymous Posting**: Option to post anonymously
- **Voting System**: Upvote/downvote posts and replies
- **Tags & Search**: Organize discussions with tags

### 💌 In-App Messaging
- **User-to-User Chat**: Direct messaging between users
- **Conversations**: Threaded conversation view
- **User Search**: Search for users to start new conversations
- **Unread Badges**: Visual indicators for unread messages
- **Real-time Updates**: Auto-refresh conversations

### 📊 User Dashboard
- **Points Balance**: View current points balance
- **My Books**: Manage your listed books
- **Requests**: View and manage exchange requests (sent and received)
- **Wishlist**: Manage your wishlist
- **Messages**: Access in-app messaging
- **Forums**: Access community discussions
- **Profile Settings**: Manage your profile

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async support
- **Database**: PostgreSQL (Neon) or SQLite
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT tokens
- **API Documentation**: Swagger UI and ReDoc

### Frontend (React)
- **Framework**: React 18 with React Router
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **HTTP Client**: Axios

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- PostgreSQL (or use SQLite for development)

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**:
   - Copy `env.template` to `.env`
   - Configure `DATABASE_URL` (PostgreSQL or SQLite)
   - Set `SECRET_KEY` for JWT tokens

4. **Run database migration** (if upgrading):
```bash
python migrate_add_permanent_id.py
```

5. **Start the server**:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
Bookie-Exchange/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, database, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── migrate_add_permanent_id.py  # Database migration
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   └── styles/         # Global styles
│   ├── package.json
│   └── README.md
│
└── README.md              # This file
```

## 🔐 Authentication

- JWT-based authentication
- Secure password hashing with bcrypt
- Token expiration: 30 minutes (configurable)
- Protected routes require valid JWT token

## 📊 Database Schema

### Core Tables
- **users**: User accounts and profiles
- **books**: Book listings with permanent UUID
- **book_history**: QR code-based reading history
- **wishlist**: User wishlists
- **exchange_requests**: Book exchange requests
- **exchange_disputes**: Exchange dispute records
- **messages**: In-app messages
- **forum_posts**: Forum discussion posts
- **forum_replies**: Forum post replies
- **forum_votes**: Forum voting records
- **point_transactions**: Points transaction history
- **payment_transactions**: Payment records
- **exchange_points**: Physical exchange point locations

## 🎨 UI/UX Features

- **Modern Design**: Clean, green-themed interface
- **Responsive**: Works on desktop, tablet, and mobile
- **Intuitive Navigation**: Sidebar navigation with badges for notifications
- **Real-time Updates**: Auto-refresh for messages and requests
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages

## 🔧 Key Technical Features

### Performance Optimizations
- **Eager Loading**: Prevents N+1 query problems
- **Connection Pooling**: Optimized database connections
- **Efficient Polling**: Reduced refresh intervals
- **Batch Operations**: Optimized bulk queries

### Security
- **Password Hashing**: Bcrypt with 72-byte limit handling
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Pydantic schemas for all inputs
- **SQL Injection Protection**: SQLAlchemy ORM
- **CORS Configuration**: Configurable CORS settings

### Scalability
- **Modular Architecture**: Separated concerns
- **Service Layer**: Business logic in services
- **Database Indexing**: Optimized queries
- **Pagination**: All list endpoints support pagination

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/users` - Search users

### Books
- `GET /api/books` - List books with filters
- `POST /api/books` - Create new book listing
- `GET /api/books/{id}` - Get book details
- `GET /api/books/my-books` - Get user's books
- `GET /api/books/qr/{qr_code}` - Scan QR code and get history
- `POST /api/books/{id}/history` - Add reading history entry
- `DELETE /api/books/{id}` - Delete book

### Exchange
- `POST /api/exchange/request` - Create exchange request
- `GET /api/exchange/my-requests` - Get user's requests
- `POST /api/exchange/approve/{id}` - Approve/reject request
- `POST /api/exchange/cancel/{id}` - Cancel request

### Messages
- `GET /api/messages` - Get messages (inbox/sent/all)
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversations/{user_id}` - Get conversation thread

### Forums
- `GET /api/forums/posts` - List forum posts
- `POST /api/forums/posts` - Create post
- `GET /api/forums/posts/{id}` - Get post details
- `POST /api/forums/posts/{id}/replies` - Reply to post
- `POST /api/forums/posts/{id}/vote` - Vote on post

### Points & Payments
- `GET /api/points/balance` - Get points balance
- `GET /api/points/transactions` - Get transaction history
- `POST /api/payment/purchase-points` - Purchase points
- `GET /api/payment/pricing` - Get point pricing

## 🧪 Development

### Running Tests
```bash
# Backend (when tests are added)
cd backend
pytest

# Frontend (when tests are added)
cd frontend
npm test
```

### Code Quality
- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Type hints in Python
- Component documentation in React

## 📦 Deployment

### Backend
1. Set production environment variables
2. Use production database (PostgreSQL recommended)
3. Set `DEBUG=False`
4. Use production-grade secret key
5. Configure CORS for production domain

### Frontend
1. Build production bundle:
```bash
npm run build
```
2. Serve `dist/` folder with a web server (nginx, Apache, etc.)
3. Configure API proxy if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of a book exchange platform.

## 🆘 Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review the code comments
3. Check existing issues

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Enhanced AI book valuation
- [ ] Advanced abuse detection
- [ ] Email notifications
- [ ] Push notifications
- [ ] Book recommendations
- [ ] Reading statistics dashboard

---

**Built with ❤️ for book lovers everywhere**
