import os
import unittest
from unittest.mock import patch, MagicMock
import json
import app
import database

# Override database file to use a separate test database for API tests
database.DB_PATH = os.path.join(os.path.dirname(os.path.abspath(database.__file__)), 'test_movies.db')

class TestMovieMoodAnalyzerAPI(unittest.TestCase):

    def setUp(self):
        # Ensure database is clean before each test
        if os.path.exists(database.DB_PATH):
            try:
                os.remove(database.DB_PATH)
            except OSError:
                pass
        # Configure Flask app for testing
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()
        database.init_db()

    def tearDown(self):
        # Clean up database after each test
        if os.path.exists(database.DB_PATH):
            try:
                os.remove(database.DB_PATH)
            except OSError:
                pass

    def test_serve_index(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        response_index = self.client.get('/index.html')
        self.assertEqual(response_index.status_code, 200)

    @patch('omdb.all_moods')
    def test_get_moods(self, mock_all_moods):
        mock_all_moods.return_value = [{'mood': 'happy', 'label': 'Happy', 'emoji': '😊'}]
        response = self.client.get('/api/moods')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['mood'], 'happy')

    @patch('omdb.get_mood_profile')
    @patch('database.log_mood')
    @patch('database.get_watched_ids')
    @patch('omdb.get_mood_recommendations_with_excluded')
    def test_get_recommendations(self, mock_rec, mock_watched, mock_log_mood, mock_profile):
        # Setup mocks
        mock_profile.return_value = {'label': 'Happy', 'emoji': '😊', 'color': '#FAD02C'}
        mock_watched.return_value = {'tt001'}
        mock_rec.return_value = ([{'imdb_id': 'tt002', 'title': 'Happy Movie'}], 3)
        
        # Call GET /api/recommend?mood=happy
        response = self.client.get('/api/recommend?mood=happy')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn('movies', data)
        self.assertIn('profile', data)
        self.assertIn('excluded_count', data)
        self.assertEqual(data['excluded_count'], 3)
        self.assertEqual(data['movies'][0]['title'], 'Happy Movie')
        
        # Verify side-effects
        mock_log_mood.assert_called_once_with('happy')

    @patch('omdb.get_mood_profile')
    def test_get_recommendations_invalid_mood(self, mock_profile):
        mock_profile.return_value = None
        response = self.client.get('/api/recommend?mood=invalid_mood')
        self.assertEqual(response.status_code, 400)

    @patch('omdb.search_movies')
    @patch('database.get_watched_ids')
    def test_search_movies(self, mock_watched, mock_search):
        mock_search.return_value = ([{'imdb_id': 'tt001', 'title': 'Test Movie'}], 1)
        mock_watched.return_value = {'tt001'}
        
        response = self.client.get('/api/search?q=test')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data['movies']), 1)
        self.assertTrue(data['movies'][0]['is_watched'])
        self.assertEqual(data['total_count'], 1)

    @patch('omdb.get_movie_detail')
    @patch('database.get_watched_ids')
    def test_get_movie_detail_found(self, mock_watched, mock_detail):
        mock_detail.return_value = {'imdb_id': 'tt001', 'title': 'Test Movie'}
        mock_watched.return_value = {'tt001'}
        
        response = self.client.get('/api/movie/tt001')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['imdb_id'], 'tt001')
        self.assertTrue(data['is_watched'])

    @patch('omdb.get_movie_detail')
    def test_get_movie_detail_not_found(self, mock_detail):
        mock_detail.return_value = None
        response = self.client.get('/api/movie/tt999')
        self.assertEqual(response.status_code, 404)

    @patch('database.get_watched_movies')
    def test_get_watched(self, mock_watched_movies):
        mock_watched_movies.return_value = [{'imdb_id': 'tt001', 'title': 'Watched Movie'}]
        response = self.client.get('/api/watched')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Watched Movie')

    @patch('database.mark_watched')
    def test_add_watched(self, mock_mark):
        payload = {'imdbID': 'tt001', 'title': 'Test Movie'}
        response = self.client.post('/api/watched', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        
        # Verify parameter mapping: imdbID should map to imdb_id for mark_watched
        mock_mark.assert_called_once()
        called_arg = mock_mark.call_args[0][0]
        self.assertEqual(called_arg['imdb_id'], 'tt001')

    @patch('database.get_connection')
    def test_delete_watched(self, mock_conn):
        mock_db_conn = MagicMock()
        mock_conn.return_value = mock_db_conn
        
        response = self.client.delete('/api/watched/tt001')
        self.assertEqual(response.status_code, 200)
        
        # Verify direct execute statement on connection
        mock_db_conn.execute.assert_called_with('DELETE FROM watched_movies WHERE imdb_id = ?', ('tt001',))

    @patch('database.get_watchlist')
    def test_get_watchlist(self, mock_watchlist):
        mock_watchlist.return_value = [{'imdb_id': 'tt002', 'title': 'Watchlist Movie'}]
        response = self.client.get('/api/watchlist')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Watchlist Movie')

    @patch('database.add_to_watchlist')
    def test_add_watchlist_success(self, mock_add):
        mock_add.return_value = (True, "Added to watchlist successfully")
        payload = {'imdbID': 'tt002', 'title': 'Watchlist Movie'}
        
        response = self.client.post('/api/watchlist', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        
        # Verify parameter mapping
        mock_add.assert_called_once()
        called_arg = mock_add.call_args[0][0]
        self.assertEqual(called_arg['imdb_id'], 'tt002')

    @patch('database.add_to_watchlist')
    def test_add_watchlist_failure(self, mock_add):
        mock_add.return_value = (False, "Movie is already in the watchlist")
        payload = {'imdbID': 'tt002', 'title': 'Watchlist Movie'}
        
        response = self.client.post('/api/watchlist', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        
        data = json.loads(response.data)
        self.assertFalse(data['success'])

    @patch('database.remove_from_watchlist')
    def test_delete_watchlist(self, mock_remove):
        response = self.client.delete('/api/watchlist/tt002')
        self.assertEqual(response.status_code, 200)
        mock_remove.assert_called_once_with('tt002')

    @patch('database.get_stats')
    def test_get_stats(self, mock_stats):
        mock_stats.return_value = {'watched_count': 5, 'watchlist_count': 10, 'top_mood': 'happy'}
        response = self.client.get('/api/stats')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['watched_count'], 5)
        self.assertEqual(data['watchlist_count'], 10)
        self.assertEqual(data['top_mood'], 'happy')

if __name__ == '__main__':
    unittest.main()
