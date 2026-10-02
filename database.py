import os
import sqlite3
import secrets
from typing import Dict, List, Set, Tuple, Any, Optional
from werkzeug.security import generate_password_hash, check_password_hash

# DB file at the same directory as script
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'movies.db')

def get_connection() -> sqlite3.Connection:
    """
    Establishes and returns a database connection with sqlite3.Row row factory.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """
    Creates and safely migrates all tables needed for the Movie Mood Analyzer application:
    - users: id, name, email, password_hash, created_at
    - user_tokens: token, user_id, created_at
    - watched_movies: id, user_id, imdb_id, title, year, poster, genre, rating, plot, watched_at (UNIQUE on user_id, imdb_id)
    - watchlist: id, user_id, imdb_id, title, year, poster, genre, rating, plot, added_at (UNIQUE on user_id, imdb_id)
    - mood_sessions: id, user_id, mood, created_at
    """
    conn = get_connection()
    try:
        with conn:
            # 1. Users table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime'))
                )
            ''')

            # 2. User tokens table for session management
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_tokens (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')

            # Ensure a default demo user exists for backward compatibility and exhibition demo
            cursor = conn.execute("SELECT id FROM users WHERE id = 1")
            demo_user = cursor.fetchone()
            if not demo_user:
                demo_hash = generate_password_hash("demo123")
                conn.execute(
                    "INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (1, ?, ?, ?)",
                    ("Demo Cinephile", "demo@moviemood.com", demo_hash)
                )

            # Check existing tables and perform safe schema migrations
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = {row['name'] for row in cursor.fetchall()}

            # Migrate or create watched_movies
            if 'watched_movies' in existing_tables:
                # Check if user_id column exists
                cols = [row['name'] for row in conn.execute("PRAGMA table_info(watched_movies)").fetchall()]
                if 'user_id' not in cols:
                    # Safe migration: create new table with user_id & compound unique constraint, copy old records to user 1
                    conn.execute('''
                        CREATE TABLE watched_movies_v2 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER DEFAULT 1,
                            imdb_id TEXT NOT NULL,
                            title TEXT,
                            year TEXT,
                            poster TEXT,
                            genre TEXT,
                            rating TEXT,
                            plot TEXT,
                            watched_at TEXT DEFAULT (datetime('now', 'localtime')),
                            UNIQUE(user_id, imdb_id)
                        )
                    ''')
                    conn.execute('''
                        INSERT OR IGNORE INTO watched_movies_v2 (id, user_id, imdb_id, title, year, poster, genre, rating, plot, watched_at)
                        SELECT id, 1, imdb_id, title, year, poster, genre, rating, plot, watched_at FROM watched_movies
                    ''')
                    conn.execute("DROP TABLE watched_movies")
                    conn.execute("ALTER TABLE watched_movies_v2 RENAME TO watched_movies")
            else:
                conn.execute('''
                    CREATE TABLE watched_movies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER DEFAULT 1,
                        imdb_id TEXT NOT NULL,
                        title TEXT,
                        year TEXT,
                        poster TEXT,
                        genre TEXT,
                        rating TEXT,
                        plot TEXT,
                        watched_at TEXT DEFAULT (datetime('now', 'localtime')),
                        UNIQUE(user_id, imdb_id)
                    )
                ''')

            # Migrate or create watchlist
            if 'watchlist' in existing_tables:
                cols = [row['name'] for row in conn.execute("PRAGMA table_info(watchlist)").fetchall()]
                if 'user_id' not in cols:
                    conn.execute('''
                        CREATE TABLE watchlist_v2 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER DEFAULT 1,
                            imdb_id TEXT NOT NULL,
                            title TEXT,
                            year TEXT,
                            poster TEXT,
                            genre TEXT,
                            rating TEXT,
                            plot TEXT,
                            added_at TEXT DEFAULT (datetime('now', 'localtime')),
                            UNIQUE(user_id, imdb_id)
                        )
                    ''')
                    conn.execute('''
                        INSERT OR IGNORE INTO watchlist_new (id, user_id, imdb_id, title, year, poster, genre, rating, plot, added_at)
                        SELECT id, 1, imdb_id, title, year, poster, genre, rating, plot, added_at FROM watchlist
                    ''') if False else conn.execute('''
                        INSERT OR IGNORE INTO watchlist_v2 (id, user_id, imdb_id, title, year, poster, genre, rating, plot, added_at)
                        SELECT id, 1, imdb_id, title, year, poster, genre, rating, plot, added_at FROM watchlist
                    ''')
                    conn.execute("DROP TABLE watchlist")
                    conn.execute("ALTER TABLE watchlist_v2 RENAME TO watchlist")
            else:
                conn.execute('''
                    CREATE TABLE watchlist (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER DEFAULT 1,
                        imdb_id TEXT NOT NULL,
                        title TEXT,
                        year TEXT,
                        poster TEXT,
                        genre TEXT,
                        rating TEXT,
                        plot TEXT,
                        added_at TEXT DEFAULT (datetime('now', 'localtime')),
                        UNIQUE(user_id, imdb_id)
                    )
                ''')

            # Migrate or create mood_sessions
            if 'mood_sessions' in existing_tables:
                cols = [row['name'] for row in conn.execute("PRAGMA table_info(mood_sessions)").fetchall()]
                if 'user_id' not in cols:
                    conn.execute("ALTER TABLE mood_sessions ADD COLUMN user_id INTEGER DEFAULT 1")
            else:
                conn.execute('''
                    CREATE TABLE mood_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER DEFAULT 1,
                        mood TEXT,
                        created_at TEXT DEFAULT (datetime('now', 'localtime'))
                    )
                ''')
    finally:
        conn.close()

# ----------------- User Authentication Functions -----------------

def create_user(name: str, email: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Registers a new user with hashed password.
    Returns (success, message, user_dict_or_None).
    """
    name = (name or "").strip()
    email = (email or "").strip().lower()
    if not name:
        return False, "Name is required", None
    if not email or "@" not in email:
        return False, "Valid email is required", None
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters", None

    password_hash = generate_password_hash(password)
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, password_hash)
            )
            user_id = cursor.lastrowid
            user = {
                'id': user_id,
                'name': name,
                'email': email
            }
            return True, "Account created successfully", user
    except sqlite3.IntegrityError:
        return False, "An account with this email already exists", None
    finally:
        conn.close()

def authenticate_user(email: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Authenticates a user by email and password.
    Returns (success, message, user_dict_or_None).
    """
    email = (email or "").strip().lower()
    if not email or not password:
        return False, "Email and password are required", None

    conn = get_connection()
    try:
        cursor = conn.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if not row:
            return False, "Invalid email or password", None

        if not check_password_hash(row['password_hash'], password):
            return False, "Invalid email or password", None

        user = {
            'id': row['id'],
            'name': row['name'],
            'email': row['email']
        }
        return True, "Authentication successful", user
    finally:
        conn.close()

def create_user_token(user_id: int) -> str:
    """
    Creates a secure random session token for the user.
    """
    token = secrets.token_hex(32)
    conn = get_connection()
    try:
        with conn:
            conn.execute("INSERT INTO user_tokens (token, user_id) VALUES (?, ?)", (token, user_id))
        return token
    finally:
        conn.close()

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves user dict given an authentication token.
    """
    if not token:
        return None
    conn = get_connection()
    try:
        cursor = conn.execute('''
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u
            JOIN user_tokens t ON u.id = t.user_id
            WHERE t.token = ?
        ''', (token,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def delete_user_token(token: str) -> None:
    """
    Removes a session token (logout).
    """
    if not token:
        return
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM user_tokens WHERE token = ?", (token,))
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieves user profile by user_id.
    """
    conn = get_connection()
    try:
        cursor = conn.execute("SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# ----------------- User-Scoped Movie Tracking -----------------

def mark_watched(movie_dict: Dict[str, Any], user_id: int = 1) -> None:
    """
    Marks a movie as watched for a specific user:
    1. Inserts or updates the movie in the watched_movies table for user_id.
    2. Deletes the movie from the watchlist table for user_id (if it exists).
    """
    imdb_id = movie_dict.get('imdb_id')
    if not imdb_id:
        raise ValueError("movie_dict must contain a valid 'imdb_id'")

    actual_user_id = movie_dict.get('user_id', user_id)

    conn = get_connection()
    try:
        with conn:
            keys = ['user_id', 'imdb_id', 'title', 'year', 'poster', 'genre', 'rating', 'plot']
            vals = [
                actual_user_id,
                imdb_id,
                movie_dict.get('title'),
                movie_dict.get('year'),
                movie_dict.get('poster'),
                movie_dict.get('genre'),
                movie_dict.get('rating'),
                movie_dict.get('plot')
            ]

            watched_at = movie_dict.get('watched_at')
            if watched_at:
                keys.append('watched_at')
                vals.append(watched_at)

            placeholders = ', '.join(['?'] * len(vals))
            columns = ', '.join(keys)

            conn.execute(
                f"INSERT OR REPLACE INTO watched_movies ({columns}) VALUES ({placeholders})",
                vals
            )
            conn.execute(
                'DELETE FROM watchlist WHERE imdb_id = ? AND user_id = ?',
                (imdb_id, actual_user_id)
            )
    finally:
        conn.close()

def delete_watched(imdb_id: str, user_id: int = 1) -> None:
    """
    Deletes a movie from watched_movies for a specific user.
    """
    conn = get_connection()
    try:
        with conn:
            conn.execute('DELETE FROM watched_movies WHERE imdb_id = ? AND user_id = ?', (imdb_id, user_id))
    finally:
        conn.close()

def get_watched_ids(user_id: int = 1) -> Set[str]:
    """
    Returns a set of imdb_ids of all watched movies for a specific user.
    """
    conn = get_connection()
    try:
        cursor = conn.execute('SELECT imdb_id FROM watched_movies WHERE user_id = ?', (user_id,))
        return {row['imdb_id'] for row in cursor.fetchall()}
    finally:
        conn.close()

def get_watched_movies(user_id: int = 1) -> List[Dict[str, Any]]:
    """
    Returns all watched movies for a specific user as a list of dictionaries.
    """
    conn = get_connection()
    try:
        cursor = conn.execute(
            'SELECT * FROM watched_movies WHERE user_id = ? ORDER BY watched_at DESC',
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def add_to_watchlist(movie_dict: Dict[str, Any], user_id: int = 1) -> Tuple[bool, str]:
    """
    Adds a movie to the watchlist for a specific user.
    Skips if the movie has already been watched by this user.
    Returns (True, success_message) or (False, error_message).
    """
    imdb_id = movie_dict.get('imdb_id')
    if not imdb_id:
        return False, "imdb_id is required"

    actual_user_id = movie_dict.get('user_id', user_id)

    if imdb_id in get_watched_ids(actual_user_id):
        return False, "Movie has already been watched"

    conn = get_connection()
    try:
        with conn:
            keys = ['user_id', 'imdb_id', 'title', 'year', 'poster', 'genre', 'rating', 'plot']
            vals = [
                actual_user_id,
                imdb_id,
                movie_dict.get('title'),
                movie_dict.get('year'),
                movie_dict.get('poster'),
                movie_dict.get('genre'),
                movie_dict.get('rating'),
                movie_dict.get('plot')
            ]

            added_at = movie_dict.get('added_at')
            if added_at:
                keys.append('added_at')
                vals.append(added_at)

            placeholders = ', '.join(['?'] * len(vals))
            columns = ', '.join(keys)

            conn.execute(f"INSERT INTO watchlist ({columns}) VALUES ({placeholders})", vals)
        return True, "Movie added to watchlist successfully"
    except sqlite3.IntegrityError:
        return False, "Movie is already in the watchlist"
    finally:
        conn.close()

def get_watchlist(user_id: int = 1) -> List[Dict[str, Any]]:
    """
    Returns all movies in the watchlist for a specific user as a list of dictionaries.
    """
    conn = get_connection()
    try:
        cursor = conn.execute(
            'SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC',
            (user_id,)
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def remove_from_watchlist(imdb_id: str, user_id: int = 1) -> None:
    """
    Removes a movie from the watchlist for a specific user.
    """
    conn = get_connection()
    try:
        with conn:
            conn.execute('DELETE FROM watchlist WHERE imdb_id = ? AND user_id = ?', (imdb_id, user_id))
    finally:
        conn.close()

def log_mood(mood_string: str, user_id: int = 1) -> None:
    """
    Logs a mood session into the database for a specific user.
    """
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                'INSERT INTO mood_sessions (user_id, mood) VALUES (?, ?)',
                (user_id, mood_string)
            )
    finally:
        conn.close()

def get_stats(user_id: int = 1) -> Dict[str, Any]:
    """
    Returns statistics for a specific user:
    - watched_count: total watched movies
    - watchlist_count: total movies in watchlist
    - top_mood: most frequent mood session, or None
    - mood_breakdown: list of { mood, count }
    - average_rating: average rating of watched movies
    """
    conn = get_connection()
    try:
        watched_row = conn.execute(
            'SELECT COUNT(*) FROM watched_movies WHERE user_id = ?',
            (user_id,)
        ).fetchone()
        watchlist_row = conn.execute(
            'SELECT COUNT(*) FROM watchlist WHERE user_id = ?',
            (user_id,)
        ).fetchone()

        watched_count = watched_row[0] if watched_row else 0
        watchlist_count = watchlist_row[0] if watchlist_row else 0

        # Retrieve top mood for this user
        top_mood_row = conn.execute('''
            SELECT mood 
            FROM mood_sessions 
            WHERE user_id = ?
            GROUP BY mood 
            ORDER BY COUNT(*) DESC, id DESC 
            LIMIT 1
        ''', (user_id,)).fetchone()

        top_mood = top_mood_row[0] if top_mood_row else None

        # Mood breakdown for visualization
        breakdown_cursor = conn.execute('''
            SELECT mood, COUNT(*) as count
            FROM mood_sessions
            WHERE user_id = ?
            GROUP BY mood
            ORDER BY count DESC
        ''', (user_id,))
        mood_breakdown = [{'mood': r['mood'], 'count': r['count']} for r in breakdown_cursor.fetchall()]

        # Average rating of watched movies
        rating_cursor = conn.execute('''
            SELECT rating FROM watched_movies
            WHERE user_id = ? AND rating IS NOT NULL AND rating != 'N/A'
        ''', (user_id,))
        ratings = []
        for r in rating_cursor.fetchall():
            try:
                ratings.append(float(r['rating']))
            except (ValueError, TypeError):
                pass
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

        return {
            'watched_count': watched_count,
            'watchlist_count': watchlist_count,
            'top_mood': top_mood,
            'mood_breakdown': mood_breakdown,
            'average_rating': avg_rating
        }
    finally:
        conn.close()


def get_analytics_data(user_id: int = 1) -> Dict[str, Any]:
    """
    Returns rich analytics data for charts — pure SQLite, no external libraries.
    Returns:
      - genre_breakdown: [{ genre, count }] top 8 genres from watched movies
      - weekday_usage:   [{ day, sessions }] mood session count per day of week
      - monthly_watches: [{ month, count }] movies watched per month (last 6 months)
      - mood_timeline:   [{ month, <mood>: count, ... }] mood sessions per month (last 6)
    """
    conn = get_connection()
    try:
        # 1. Genre breakdown from watched movies
        rows = conn.execute(
            'SELECT genre FROM watched_movies WHERE user_id = ? AND genre IS NOT NULL',
            (user_id,)
        ).fetchall()
        genre_counts: Dict[str, int] = {}
        for row in rows:
            for g in row['genre'].split(','):
                g = g.strip()
                if g and g != 'N/A':
                    genre_counts[g] = genre_counts.get(g, 0) + 1
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        genre_breakdown = [{'genre': g, 'count': c} for g, c in sorted_genres]

        # 2. Weekday usage (mood sessions per day of week)
        day_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        day_map = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}
        weekday_counts: Dict[str, int] = {d: 0 for d in day_order}
        mood_rows = conn.execute(
            'SELECT created_at FROM mood_sessions WHERE user_id = ?',
            (user_id,)
        ).fetchall()
        for row in mood_rows:
            try:
                from datetime import datetime as _dt
                dt = _dt.fromisoformat(row['created_at'])
                weekday_counts[day_map[dt.weekday()]] += 1
            except Exception:
                pass
        weekday_usage = [{'day': d, 'sessions': weekday_counts[d]} for d in day_order]

        # 3. Monthly watches (last 6 months)
        from datetime import datetime as _dt2, timedelta
        monthly_map: Dict[str, int] = {}
        now = _dt2.now()
        for i in range(5, -1, -1):
            # go back i months
            month = (now.replace(day=1) - timedelta(days=i * 30)).strftime('%b %Y')
            monthly_map[month] = 0

        watch_rows = conn.execute(
            'SELECT watched_at FROM watched_movies WHERE user_id = ?',
            (user_id,)
        ).fetchall()
        for row in watch_rows:
            try:
                dt = _dt2.fromisoformat(row['watched_at'])
                key = dt.strftime('%b %Y')
                if key in monthly_map:
                    monthly_map[key] += 1
            except Exception:
                pass
        monthly_watches = [{'month': m, 'count': c} for m, c in monthly_map.items()]

        # 4. Mood timeline (last 6 months stacked)
        all_moods = ['happy', 'sad', 'excited', 'scared', 'romantic', 'bored', 'angry', 'nostalgic']
        mood_timeline_map: Dict[str, Dict[str, int]] = {m: {mood: 0 for mood in all_moods} for m in monthly_map}
        mood_session_rows = conn.execute(
            'SELECT mood, created_at FROM mood_sessions WHERE user_id = ?',
            (user_id,)
        ).fetchall()
        for row in mood_session_rows:
            try:
                dt = _dt2.fromisoformat(row['created_at'])
                key = dt.strftime('%b %Y')
                if key in mood_timeline_map and row['mood'] in all_moods:
                    mood_timeline_map[key][row['mood']] += 1
            except Exception:
                pass
        mood_timeline = [{'month': m, **mood_timeline_map[m]} for m in monthly_map]

        return {
            'genre_breakdown': genre_breakdown,
            'weekday_usage': weekday_usage,
            'monthly_watches': monthly_watches,
            'mood_timeline': mood_timeline,
        }
    finally:
        conn.close()

