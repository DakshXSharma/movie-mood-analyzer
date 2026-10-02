# MoodCinema — Movie Mood Analyzer (Version 2.0)

A modern, full-stack movie recommendation and watchlist application upgraded for college project exhibitions. It features a rich **React + Tailwind CSS** frontend styled with a dark cinema aesthetic, backed by a **Python + Flask REST API**, **SQLite3** persistence with user isolation and secure authentication, and real-time **OMDB API** metadata integration.

---

## 1. Project Structure

```text
MMA/
├── backend / root:
│   ├── app.py                  # Flask REST API server with authentication, user isolation & v1/v2 routing
│   ├── database.py             # SQLite persistence with users, tokens, watchlist, watched, and safe migration
│   ├── omdb.py                 # OMDB API integration, 8 mood profiles, and NumPy ranking engine
│   ├── recommendations.py      # Recommendation module
│   ├── analyze.py              # Matplotlib + Pandas data analytics generator (dashboard.png)
│   ├── movies.db               # SQLite database file (preserved safely with automatic migrations)
│   ├── index.html              # Original Version 1 vanilla single-page application (kept intact at /v1)
│   ├── test_app.py             # Flask API route tests
│   ├── test_database.py        # Database unit tests
│   ├── test_omdb.py            # OMDB mock tests
│   ├── test_recommendations.py # Recommendation algorithm tests
│   └── test_auth.py            # Authentication, password hashing, and user-isolation tests
│
├── frontend/                   # Version 2 React + Tailwind CSS Web Application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top navigation with live badges, quick search, and user dropdown
│   │   │   ├── Sidebar.jsx     # Side navigation with real-time watch counters & stats pill
│   │   │   ├── MovieCard.jsx   # Movie card with poster, rating, watched toggle, & "Why this pick?" explanation
│   │   │   ├── MovieModal.jsx  # Rich details overlay (Plot, Director, Cast, RT, IMDb, Metascore)
│   │   │   ├── MoodCard.jsx    # Interactive 8 mood cards with emojis, gradients, and descriptions
│   │   │   └── Toast.jsx       # Floating notification toast for user feedback
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Modern movie-themed login with exhibition demo quick-fill
│   │   │   ├── Signup.jsx      # Full form validation and instant registration
│   │   │   ├── Home.jsx        # Mood selector & dynamic rule-based recommendations dashboard
│   │   │   ├── Search.jsx      # Live OMDB movie search with pagination
│   │   │   ├── Watchlist.jsx   # User-specific queue management
│   │   │   ├── History.jsx     # User-specific watched diary with average rating analytics
│   │   │   └── Profile.jsx     # User statistics, mood activity breakdown & Matplotlib charts
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Token authentication, user session, and live stats context
│   │   ├── App.jsx             # Main application layout and view router
│   │   ├── main.jsx            # React root mount with AuthProvider
│   │   └── index.css           # Tailwind CSS directives & cinema styling
│   ├── tailwind.config.js      # Cinema color palette and glow utilities
│   ├── vite.config.js          # Vite configuration with API proxy to Flask
│   └── package.json
└── README.md
```

---

## 2. Changes Summary (V1 to V2 Upgrade)

1. **Authentication & User Data Isolation**:
   - Added `users` table with salted password hashes (never plain text) using `werkzeug.security`.
   - Added `user_tokens` table for session authentication.
   - Added `user_id` scoping to `watched_movies`, `watchlist`, and `mood_sessions`.
   - Performed non-destructive SQLite migration preserving existing watch data under a demo user (`demo@moviemood.com`).
   - Added `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
2. **React + Tailwind CSS Frontend**:
   - Converted the vanilla HTML/CSS frontend to a component-driven React application in `frontend/`.
   - Styled using Tailwind CSS with custom cinema palettes, glowing cards, glassmorphic modals, and smooth micro-interactions.
   - Lucide React icon set for clean iconography.
3. **Exhibition-Focused Features**:
   - **"Why this movie?" Explanations**: Dynamic rule-based reasoning for every recommended movie explaining why it matches the selected mood and genre profile.
   - **Recommendation Refresh**: Shuffle and discover new movie candidates for the active mood on demand.
   - **Mood Activity Breakdown**: Visual progress bars displaying session activity across the 8 moods.
   - **Integrated Matplotlib Dashboard**: Real-time analytics dashboard display in the Profile page with an on-demand refresh trigger.
   - **One-Click Demo Fill**: Dedicated button on the login page for effortless exhibition demonstration.
4. **Preserved Version 1**:
   - Original `index.html` remains intact and can be accessed at `http://localhost:5000/v1` or `http://localhost:5000/index.html`.
5. **Testing**:
   - Added `test_auth.py` verifying signup, duplicate email prevention, login validation, password hashing, and user data isolation.
   - All 41 unit tests pass.

---

## 3. How to Install Dependencies

### Backend Dependencies:
Ensure Python 3.10+ is installed:
```bash
pip install flask flask-cors requests numpy pandas matplotlib werkzeug
```

### Frontend Dependencies:
Ensure Node.js 18+ and npm are installed:
```bash
cd frontend
npm install
```

---

## 4. How to Run the Application

### Option A: Standard Full-Stack Development (Recommended for Development)

1. **Start the Flask Backend** (Terminal 1):
   ```bash
   python app.py
   ```
   *Runs on `http://localhost:5000`.*

2. **Start the React Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs on `http://localhost:5173` with instant Hot Module Replacement (HMR). Any API request to `/api/...` is automatically proxied to Flask on port 5000.*

---

### Option B: Single Unified Server (Best for College Exhibition Demo)

1. Build the production React bundle:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
2. Start Flask:
   ```bash
   python app.py
   ```
3. Open your browser to **`http://localhost:5000`**. Flask serves the compiled React application directly.
   - To show Version 1 to evaluators: visit `http://localhost:5000/v1`.

---

## 5. How Login and Signup Work

1. **Signup**:
   - The user inputs their Name, Email, Password, and Password Confirmation.
   - Client validates fields (valid email format, passwords match, minimum 6 characters).
   - Flask validates uniqueness in SQLite and hashes the password with a secure salt (`generate_password_hash`).
   - A secure token (`secrets.token_hex(32)`) is generated and returned to React, storing it in `localStorage` for automatic session persistence.
2. **Login**:
   - User inputs Email and Password.
   - Flask checks credentials using `check_password_hash`.
   - On success, creates a session token stored in `user_tokens`.
   - **Exhibition Shortcut**: Click the **"Fill Exhibition Demo Account"** button on the login screen to automatically fill the default demo credentials (`demo@moviemood.com` / `demo123`).

---

## 6. How to Test the Complete Application

Run the complete Python test suite (41 tests):
```bash
python -m unittest discover -p "test_*.py"
```

To test individual modules:
```bash
python -m unittest test_auth.py            # Authentication & data isolation tests
python -m unittest test_app.py             # Flask API endpoints tests
python -m unittest test_database.py        # SQLite schema & migration tests
python -m unittest test_omdb.py            # OMDB query & ranking tests
python -m unittest test_recommendations.py # Mood profiles tests
```

---

## 7. How to Host Free Properly (Beginner-Friendly Guide)

You can host this project 100% free using modern cloud hosting platforms:

### Step 1: Push Code to GitHub
1. Create a free account at [GitHub](https://github.com).
2. Initialize a repository and push your project:
   ```bash
   git init
   git add .
   git commit -m "Movie Mood Analyzer v2.0"
   git remote add origin https://github.com/<your-username>/movie-mood-analyzer.git
   git push -u origin main
   ```

### Step 2: Deploy to Render.com (Recommended — Hosts Backend + Frontend Together)
Render offers a free tier for Python web services.
1. Sign up for free at [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `movie-mood-analyzer`
   - **Environment**: `Python`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && cd frontend && npm install && npm run build && cd ..
     ```
   - **Start Command**:
     ```bash
     python app.py
     ```
5. Add Environment Variables:
   - `OMDB_API_KEY`: `c03f5cda` (or your personal OMDB key)
   - `PORT`: `5000`
6. Click **Deploy Web Service**.
7. Render gives you a free live URL (e.g., `https://movie-mood-analyzer.onrender.com`) that runs both your React frontend and Flask API together!
