import os
import sys
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import database as db
import omdb

app = Flask(__name__)
# Enable CORS for all routes and origins (allowing frontend dev server)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize database tables on startup
db.init_db()

def get_auth_user() -> tuple[int | None, dict | None]:
    """
    Extracts current authenticated user from 'Authorization: Bearer <token>' header.
    Returns (user_id, user_dict). If unauthenticated, returns (None, None).
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        user = db.get_user_by_token(token)
        if user:
            return user['id'], user
    return None, None

def generate_why_recommended(movie: dict, mood: str, profile: dict) -> str:
    """
    Generates a clear, college-exhibition friendly explanation for why this movie
    was recommended for the selected mood.
    """
    mood_label = profile.get('label', mood.title()) if profile else mood.title()
    target_genres = set(profile.get('genres', [])) if profile else set()
    
    movie_genre_str = movie.get('genre', '')
    movie_genres = [g.strip() for g in movie_genre_str.split(',')] if movie_genre_str and movie_genre_str != 'N/A' else []
    matched = [g for g in movie_genres if g in target_genres]
    
    rating = movie.get('rating')
    rating_str = f"with a strong {rating}/10 IMDb rating" if rating and rating != 'N/A' else "enjoyed by global audiences"
    
    genre_phrase = f"its blend of {', '.join(matched)}" if matched else f"its {movie_genre_str or 'compelling'} vibe"
    
    mood_reasons = {
        'happy': f"Selected for your Happy mood because {genre_phrase} and {rating_str} create an uplifting, feel-good cinematic experience.",
        'sad': f"Recommended for reflection: {genre_phrase} {rating_str} offers an evocative and cathartic emotional journey.",
        'excited': f"High-energy pick! Features {genre_phrase} {rating_str} to deliver pulse-pounding thrills and entertainment.",
        'scared': f"Dark & suspenseful match: brings {genre_phrase} {rating_str} for spine-chilling tension and atmospheric horror.",
        'romantic': f"Heartwarming romance match: {genre_phrase} {rating_str} delivers deep connection and memorable on-screen chemistry.",
        'bored': f"Boredom buster: {genre_phrase} {rating_str} packs intriguing twists and gripping world-building to captivate your mind.",
        'angry': f"Cathartic pick: {genre_phrase} {rating_str} provides high-stakes combat, revenge drive, and righteous justice.",
        'nostalgic': f"Timeless favorite: {genre_phrase} {rating_str} captures golden-era cinema charm and lasting nostalgia."
    }
    
    return mood_reasons.get(mood.lower(), f"Recommended for your {mood_label} mood {rating_str} through {genre_phrase}.")

# ================= AUTHENTICATION APIS =================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """
    POST /api/auth/signup -> Register a new user
    Body: { "name": "...", "email": "...", "password": "..." }
    """
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    success, message, user = db.create_user(name, email, password)
    if not success:
        return jsonify({"success": False, "error": message}), 400

    token = db.create_user_token(user['id'])
    return jsonify({
        "success": True,
        "message": message,
        "token": token,
        "user": user
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    POST /api/auth/login -> Log in an existing user
    Body: { "email": "...", "password": "..." }
    """
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')

    success, message, user = db.authenticate_user(email, password)
    if not success:
        return jsonify({"success": False, "error": message}), 401

    token = db.create_user_token(user['id'])
    return jsonify({
        "success": True,
        "message": message,
        "token": token,
        "user": user
    }), 200

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """
    GET /api/auth/me -> Returns authenticated user profile or 401
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "Unauthorized: Missing authentication token"}), 401

    token = auth_header.split(' ', 1)[1].strip()
    user = db.get_user_by_token(token)
    if not user:
        return jsonify({"error": "Unauthorized: Invalid or expired token"}), 401

    return jsonify({"success": True, "user": user}), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """
    POST /api/auth/logout -> Revokes current session token
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        db.delete_user_token(token)
    return jsonify({"success": True, "message": "Successfully logged out"}), 200

# ================= CORE APPLICATION APIS =================

@app.route('/api/moods', methods=['GET'])
def get_moods():
    """
    GET /api/moods -> returns list of all configured moods
    """
    return jsonify(omdb.all_moods())

@app.route('/api/recommend', methods=['GET'])
def get_recommendations():
    """
    GET /api/recommend?mood=X -> returns recommendations for mood X, along with the profile and excluded count.
    """
    mood = request.args.get('mood')
    if not mood:
        return jsonify({"error": "Query parameter 'mood' is required"}), 400
        
    profile = omdb.get_mood_profile(mood)
    if not profile:
        return jsonify({"error": f"Invalid mood: {mood}"}), 400

    user_id, _ = get_auth_user()

    # Log the mood session for the user
    if user_id is not None:
        db.log_mood(mood, user_id=user_id)
        watched_ids = db.get_watched_ids(user_id=user_id)
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist(user_id=user_id)}
        watched_movies = db.get_watched_movies(user_id=user_id)
    else:
        db.log_mood(mood)
        watched_ids = db.get_watched_ids()
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist()}
        watched_movies = db.get_watched_movies()
    
    # Get recommendations and the count of movies excluded
    movies, excluded_count = omdb.get_mood_recommendations_with_excluded(mood, watched_ids)
    ranked_movies = omdb.score_and_rank_recommendations(movies, mood, watched_movies)

    # Attach 'why_recommended' explanation and watchlist flag
    for m in ranked_movies:
        m['why_recommended'] = generate_why_recommended(m, mood, profile)
        m['is_watched'] = False
        m['is_watchlist'] = m.get('imdb_id') in watchlist_ids
    
    return jsonify({
        "movies": ranked_movies,
        "profile": profile,
        "excluded_count": excluded_count
    })

@app.route('/api/search', methods=['GET'])
def search_movies():
    """
    GET /api/search?q=X&page=N -> search movies and mark each with is_watched and is_watchlist
    """
    query = request.args.get('q')
    if not query:
        return jsonify({"movies": [], "total_count": 0})
        
    page = request.args.get('page', default=1, type=int)
    movies, total_count = omdb.search_movies(query, page=page)
    
    user_id, _ = get_auth_user()
    if user_id is not None:
        watched_ids = db.get_watched_ids(user_id=user_id)
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist(user_id=user_id)}
    else:
        watched_ids = db.get_watched_ids()
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist()}

    for m in movies:
        mid = m.get('imdb_id')
        m['is_watched'] = mid in watched_ids
        m['is_watchlist'] = mid in watchlist_ids
        
    return jsonify({
        "movies": movies,
        "total_count": total_count
    })

@app.route('/api/movie/<imdb_id>', methods=['GET'])
def get_movie_detail(imdb_id):
    """
    GET /api/movie/<imdb_id> -> get full detail, add is_watched and is_watchlist fields
    """
    detail = omdb.get_movie_detail(imdb_id=imdb_id)
    if not detail:
        return jsonify({"error": f"Movie not found with imdb_id: {imdb_id}"}), 404
        
    user_id, _ = get_auth_user()
    if user_id is not None:
        watched_ids = db.get_watched_ids(user_id=user_id)
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist(user_id=user_id)}
    else:
        watched_ids = db.get_watched_ids()
        watchlist_ids = {w['imdb_id'] for w in db.get_watchlist()}

    detail['is_watched'] = imdb_id in watched_ids
    detail['is_watchlist'] = imdb_id in watchlist_ids
    return jsonify(detail)

@app.route('/api/watched', methods=['GET'])
def get_watched():
    """
    GET /api/watched -> list all watched movies for current user
    """
    user_id, _ = get_auth_user()
    if user_id is not None:
        return jsonify(db.get_watched_movies(user_id=user_id))
    return jsonify(db.get_watched_movies())

@app.route('/api/watched', methods=['POST'])
def add_watched():
    """
    POST /api/watched -> body: movie dict with imdbID (or imdb_id), call mark_watched
    """
    movie = request.json
    if not movie:
        return jsonify({"error": "Missing request body"}), 400
        
    # Map imdbID to imdb_id for database.py compatibility
    if 'imdbID' in movie and 'imdb_id' not in movie:
        movie['imdb_id'] = movie['imdbID']
        
    if not movie.get('imdb_id'):
        return jsonify({"error": "imdbID is required"}), 400
        
    user_id, _ = get_auth_user()
    try:
        if user_id is not None:
            db.mark_watched(movie, user_id=user_id)
        else:
            db.mark_watched(movie)
        return jsonify({"success": True, "message": "Movie marked as watched"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/watched/<imdb_id>', methods=['DELETE'])
def delete_watched(imdb_id):
    """
    DELETE /api/watched/<imdb_id> -> delete from watched_movies table
    """
    auth_header = request.headers.get('Authorization', '')
    conn = db.get_connection()
    try:
        with conn:
            if auth_header.startswith('Bearer '):
                user_id, _ = get_auth_user()
                conn.execute('DELETE FROM watched_movies WHERE imdb_id = ? AND user_id = ?', (imdb_id, user_id))
            else:
                conn.execute('DELETE FROM watched_movies WHERE imdb_id = ?', (imdb_id,))
        return jsonify({"success": True, "message": f"Movie {imdb_id} deleted from watched list"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    """
    GET /api/watchlist -> list watchlist for current user
    """
    user_id, _ = get_auth_user()
    if user_id is not None:
        return jsonify(db.get_watchlist(user_id=user_id))
    return jsonify(db.get_watchlist())

@app.route('/api/watchlist', methods=['POST'])
def add_watchlist():
    """
    POST /api/watchlist -> body: movie dict, call add_to_watchlist
    """
    movie = request.json
    if not movie:
        return jsonify({"error": "Missing request body"}), 400
        
    # Map imdbID to imdb_id for database.py compatibility
    if 'imdbID' in movie and 'imdb_id' not in movie:
        movie['imdb_id'] = movie['imdbID']
        
    if not movie.get('imdb_id'):
        return jsonify({"error": "imdbID/imdb_id is required"}), 400
        
    user_id, _ = get_auth_user()
    if user_id is not None:
        success, message = db.add_to_watchlist(movie, user_id=user_id)
    else:
        success, message = db.add_to_watchlist(movie)
    status_code = 201 if success else 400
    return jsonify({
        "success": success,
        "message": message
    }), status_code

@app.route('/api/watchlist/<imdb_id>', methods=['DELETE'])
def delete_watchlist(imdb_id):
    """
    DELETE /api/watchlist/<imdb_id> -> call remove_from_watchlist
    """
    user_id, _ = get_auth_user()
    try:
        if user_id is not None:
            db.remove_from_watchlist(imdb_id, user_id=user_id)
        else:
            db.remove_from_watchlist(imdb_id)
        return jsonify({"success": True, "message": f"Movie {imdb_id} removed from watchlist"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    GET /api/stats -> return db.get_stats(user_id)
    """
    user_id, _ = get_auth_user()
    if user_id is not None:
        return jsonify(db.get_stats(user_id=user_id))
    return jsonify(db.get_stats())


@app.route('/api/user/mood-activity', methods=['GET'])
def get_user_mood_activity():
    """
    GET /api/user/mood-activity -> Returns mood session breakdown for charts
    """
    user_id, _ = get_auth_user()
    stats = db.get_stats(user_id=user_id)
    return jsonify({
        "mood_breakdown": stats.get('mood_breakdown', []),
        "top_mood": stats.get('top_mood'),
        "watched_count": stats.get('watched_count', 0),
        "watchlist_count": stats.get('watchlist_count', 0),
        "average_rating": stats.get('average_rating')
    })

@app.route('/api/analytics/data', methods=['GET'])
def get_analytics_data():
    """
    GET /api/analytics/data -> returns all chart data as JSON for the React frontend.
    Includes: genre_breakdown, weekday_usage, monthly_watches, mood_timeline
    """
    user_id, _ = get_auth_user()
    data = db.get_analytics_data(user_id=user_id if user_id is not None else 1)
    return jsonify(data)

# ================= FRONTEND SERVING =================

@app.route('/v1')
def serve_v1():
    """Serve original Version 1 index.html"""
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
    return send_file(index_path)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """
    Serves the React frontend (if built in frontend/dist),
    falling back to Version 1 index.html if frontend is not built yet.
    """
    # If requesting index.html explicitly, serve Version 1 index.html
    if path == 'index.html':
        return send_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'))

    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
    if os.path.exists(dist_dir):
        file_path = os.path.join(dist_dir, path)
        if path and os.path.exists(file_path):
            return send_from_directory(dist_dir, path)
        return send_file(os.path.join(dist_dir, 'index.html'))

    # Fallback to root index.html
    return send_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'))

if __name__ == '__main__':
    print("====================================================")
    print("Starting Movie Mood Analyzer Flask REST API Server (v2)...")
    print("Connecting to SQLite database...")
    print("OMDB API Integration Ready.")
    print("Authentication & User Isolation Active.")
    print("Running local server on http://localhost:5000")
    print("====================================================")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
