# BOOKIE Frontend

React frontend application for the BOOKIE book exchange platform. Modern, responsive UI built with React, Tailwind CSS, and Vite.

## Tech Stack

- **React 18** - UI library
- **React Router 6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server
- **Axios** - HTTP client for API calls

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/           # Static assets
├── src/
│   ├── components/   # Reusable React components
│   ├── pages/         # Page components
│   ├── services/      # API service functions
│   └── styles/        # Global styles
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Features

### Pages
- **Home**: Browse and search books with advanced filters
- **My Books**: Manage your listed books
- **Wishlist**: View wishlist with availability alerts
- **Requests**: Manage exchange requests (sent and received)
- **Scan QR Code**: Scan book QR codes to view history and add entries
- **Forums**: Community discussions with voting and anonymous posting
- **Messages**: In-app messaging with user search
- **Profile Settings**: Manage your profile
- **Buy Points**: Purchase points with real money

### Components
- **BookCard**: Reusable book card component
- **Navbar**: Top navigation bar
- **PlusIconDropdown**: Quick actions menu
- **Footer**: Site footer

### Key Features
- **Responsive Design**: Works on all device sizes
- **Real-time Updates**: Auto-refresh for messages and requests
- **Search & Filter**: Advanced book search with multiple filters
- **QR Code Scanning**: View and add book reading history
- **User Search**: Find and message other users
- **Wishlist Alerts**: Notifications when wishlist books become available
- **Modern UI**: Green-themed, clean interface

## API Integration

The frontend is configured to proxy API requests to the FastAPI backend running on `http://localhost:8000`. Make sure your backend is running before using the frontend.

API service functions are located in `src/services/api.js` and handle all communication with the backend.

## Environment Variables

Create a `.env` file in the frontend directory if you need to customize the API URL:

```env
VITE_API_URL=http://localhost:8000
```
