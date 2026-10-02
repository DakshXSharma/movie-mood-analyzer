import os
import unittest
import json
import app
import database as db

# Use a separate test database
db.DB_PATH = os.path.join(os.path.dirname(os.path.abspath(db.__file__)), 'test_auth_movies.db')

class TestAuthenticationAndUserIsolation(unittest.TestCase):

    def setUp(self):
        if os.path.exists(db.DB_PATH):
            try:
                os.remove(db.DB_PATH)
            except OSError:
                pass
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()
        db.init_db()

    def tearDown(self):
        if os.path.exists(db.DB_PATH):
            try:
                os.remove(db.DB_PATH)
            except OSError:
                pass

    def test_signup_success(self):
        payload = {
            "name": "Alice Wonderland",
            "email": "alice@example.com",
            "password": "secretpassword"
        }
        res = self.client.post('/api/auth/signup', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], 'alice@example.com')
        self.assertEqual(data['user']['name'], 'Alice Wonderland')

    def test_signup_duplicate_email(self):
        payload = {
            "name": "Bob Builder",
            "email": "bob@example.com",
            "password": "mypassword123"
        }
        res1 = self.client.post('/api/auth/signup', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res1.status_code, 201)

        # Duplicate signup
        res2 = self.client.post('/api/auth/signup', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res2.status_code, 400)
        data2 = json.loads(res2.data)
        self.assertFalse(data2['success'])
        self.assertIn('already exists', data2['error'].lower())

    def test_signup_validation(self):
        # Short password
        res = self.client.post('/api/auth/signup', data=json.dumps({
            "name": "Shorty",
            "email": "short@example.com",
            "password": "123"
        }), content_type='application/json')
        self.assertEqual(res.status_code, 400)

        # Invalid email
        res = self.client.post('/api/auth/signup', data=json.dumps({
            "name": "No Email",
            "email": "notanemail",
            "password": "password123"
        }), content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_login_success(self):
        # Register user first
        db.create_user("Charlie Chaplin", "charlie@example.com", "tramp1921")

        # Login with correct credentials
        res = self.client.post('/api/auth/login', data=json.dumps({
            "email": "charlie@example.com",
            "password": "tramp1921"
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], 'charlie@example.com')

    def test_login_invalid_password(self):
        db.create_user("Dana Scully", "dana@example.com", "trustnoone")

        res = self.client.post('/api/auth/login', data=json.dumps({
            "email": "dana@example.com",
            "password": "wrongpassword"
        }), content_type='application/json')
        self.assertEqual(res.status_code, 401)
        data = json.loads(res.data)
        self.assertFalse(data['success'])
        self.assertIn('invalid', data['error'].lower())

    def test_login_nonexistent_email(self):
        res = self.client.post('/api/auth/login', data=json.dumps({
            "email": "ghost@example.com",
            "password": "anypassword"
        }), content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_password_never_plain_text(self):
        db.create_user("Security Minded", "sec@example.com", "my_super_secret")
        conn = db.get_connection()
        try:
            row = conn.execute("SELECT password_hash FROM users WHERE email = 'sec@example.com'").fetchone()
            self.assertIsNotNone(row)
            self.assertNotEqual(row['password_hash'], "my_super_secret")
            self.assertTrue(row['password_hash'].startswith('scrypt:') or row['password_hash'].startswith('pbkdf2:'))
        finally:
            conn.close()

    def test_authenticated_api_access_and_logout(self):
        # Unauthorized access without token
        unauth_res = self.client.get('/api/auth/me')
        self.assertEqual(unauth_res.status_code, 401)

        # Login and obtain token
        _, _, user = db.create_user("Fox Mulder", "fox@example.com", "thetruthisoutthere")
        token = db.create_user_token(user['id'])

        headers = {'Authorization': f'Bearer {token}'}
        auth_res = self.client.get('/api/auth/me', headers=headers)
        self.assertEqual(auth_res.status_code, 200)
        data = json.loads(auth_res.data)
        self.assertEqual(data['user']['email'], 'fox@example.com')

        # Logout
        logout_res = self.client.post('/api/auth/logout', headers=headers)
        self.assertEqual(logout_res.status_code, 200)

        # Subsequent check should now be 401
        after_logout = self.client.get('/api/auth/me', headers=headers)
        self.assertEqual(after_logout.status_code, 401)

    def test_user_specific_watchlist(self):
        # Create User 1
        _, _, user1 = db.create_user("User One", "user1@example.com", "pass12345")
        token1 = db.create_user_token(user1['id'])
        headers1 = {'Authorization': f'Bearer {token1}', 'Content-Type': 'application/json'}

        # Create User 2
        _, _, user2 = db.create_user("User Two", "user2@example.com", "pass12345")
        token2 = db.create_user_token(user2['id'])
        headers2 = {'Authorization': f'Bearer {token2}', 'Content-Type': 'application/json'}

        # User 1 adds movie 1
        self.client.post('/api/watchlist', data=json.dumps({
            'imdb_id': 'tt001',
            'title': 'User 1 Movie'
        }), headers=headers1)

        # User 2 adds movie 2
        self.client.post('/api/watchlist', data=json.dumps({
            'imdb_id': 'tt002',
            'title': 'User 2 Movie'
        }), headers=headers2)

        # Verify User 1 sees ONLY movie 1
        res1 = self.client.get('/api/watchlist', headers=headers1)
        wl1 = json.loads(res1.data)
        self.assertEqual(len(wl1), 1)
        self.assertEqual(wl1[0]['imdb_id'], 'tt001')

        # Verify User 2 sees ONLY movie 2
        res2 = self.client.get('/api/watchlist', headers=headers2)
        wl2 = json.loads(res2.data)
        self.assertEqual(len(wl2), 1)
        self.assertEqual(wl2[0]['imdb_id'], 'tt002')

    def test_user_specific_watched_history(self):
        # Create User 1
        _, _, user1 = db.create_user("Watcher One", "watcher1@example.com", "pass12345")
        token1 = db.create_user_token(user1['id'])
        headers1 = {'Authorization': f'Bearer {token1}', 'Content-Type': 'application/json'}

        # Create User 2
        _, _, user2 = db.create_user("Watcher Two", "watcher2@example.com", "pass12345")
        token2 = db.create_user_token(user2['id'])
        headers2 = {'Authorization': f'Bearer {token2}', 'Content-Type': 'application/json'}

        # User 1 marks watched
        self.client.post('/api/watched', data=json.dumps({
            'imdb_id': 'tt111',
            'title': 'Watched By User 1'
        }), headers=headers1)

        # User 2 marks watched
        self.client.post('/api/watched', data=json.dumps({
            'imdb_id': 'tt222',
            'title': 'Watched By User 2'
        }), headers=headers2)

        # Verify separation
        res1 = self.client.get('/api/watched', headers=headers1)
        watched1 = json.loads(res1.data)
        self.assertEqual(len(watched1), 1)
        self.assertEqual(watched1[0]['imdb_id'], 'tt111')

        res2 = self.client.get('/api/watched', headers=headers2)
        watched2 = json.loads(res2.data)
        self.assertEqual(len(watched2), 1)
        self.assertEqual(watched2[0]['imdb_id'], 'tt222')

if __name__ == '__main__':
    unittest.main()
