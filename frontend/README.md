# BooksExchange Frontend

React frontend application for the BooksExchange book swapping platform.

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

- User authentication (Login/Register)
- Book browsing and search
- Book detail pages
- Exchange request management
- User profile
- Responsive design with Tailwind CSS

## API Integration

The frontend is configured to proxy API requests to the FastAPI backend running on `http://localhost:8000`. Make sure your backend is running before using the frontend.

API service functions are located in `src/services/api.js` and handle all communication with the backend.

## Environment Variables

Create a `.env` file in the frontend directory if you need to customize the API URL:

```env
VITE_API_URL=http://localhost:8000
```
