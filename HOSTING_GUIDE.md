# Free Hosting Guide: Movie Mood Analyzer

Since this project uses **Python Flask**, **React** (served as static files), and **SQLite** (a local database file), the absolute best free hosting platform for beginners is **PythonAnywhere**. 

Other platforms (like Render or Heroku) wipe out local files every time they restart, which would delete your SQLite database. PythonAnywhere keeps your files safe for free.

Here is a step-by-step beginner guide to getting your site live on the internet!

---

## Step 1: Upload Your Code to GitHub
Before you can host the code, it needs to be somewhere the hosting server can download it.

1. Go to [GitHub.com](https://github.com/) and create a free account.
2. Create a new repository (name it `movie-mood-analyzer`).
3. On your computer, open your terminal/command prompt in your project folder (`d:\Programming\Projects\MMA`) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/movie-mood-analyzer.git
   git push -u origin main
   ```
*(Replace `YOUR_USERNAME` with your actual GitHub username).*

---

## Step 2: Create a PythonAnywhere Account
1. Go to [PythonAnywhere.com](https://www.pythonanywhere.com/) and click **Pricing & signup**.
2. Click **Create a Beginner account** (the free one).
3. Fill out your details. **Note:** Your username will become your website URL (e.g., `yourusername.pythonanywhere.com`).

---

## Step 3: Download Your Code to PythonAnywhere
1. Log into your PythonAnywhere account.
2. Go to the **Consoles** tab and click on **Bash** to open a terminal.
3. In this terminal, download your code from GitHub by running:
   ```bash
   git clone https://github.com/YOUR_USERNAME/movie-mood-analyzer.git
   ```

---

## Step 4: Install Dependencies
Still in the PythonAnywhere Bash console, you need to create a virtual environment and install your Python packages:

1. Create a virtual environment:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 myenv
   ```
2. Enter your project folder:
   ```bash
   cd movie-mood-analyzer
   ```
3. Install the requirements:
   ```bash
   pip install -r requirements.txt
   ```

---

## Step 5: Set Up the Web App
1. Go back to the PythonAnywhere dashboard and click on the **Web** tab (top right).
2. Click **Add a new web app**.
3. Click **Next** to skip the domain name warning.
4. Select **Manual configuration** (do NOT choose Flask here).
5. Choose **Python 3.10**.
6. Click **Next** to finish creating the app container.

---

## Step 6: Link Your Code and Virtual Environment
Still on the **Web** tab page, scroll down to make a few quick settings:

1. **Source code:** Set this to `/home/yourusername/movie-mood-analyzer`
2. **Working directory:** Set this to `/home/yourusername/movie-mood-analyzer`
3. **Virtualenv:** Set this to `/home/yourusername/.virtualenvs/myenv`

*(Remember to replace `yourusername` with your actual PythonAnywhere username!)*

---

## Step 7: Configure the WSGI File
This file tells PythonAnywhere how to talk to your Flask app.

1. Still on the **Web** tab, scroll to the **Code** section.
2. Click the link next to **WSGI configuration file** (it looks like `/var/www/yourusername_pythonanywhere_com_wsgi.py`).
3. Delete everything in that file and paste this code exactly:

```python
import sys
import os

# Add your project directory to the sys.path
project_home = '/home/yourusername/movie-mood-analyzer'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Set the current working directory to your project folder
os.chdir(project_home)

# Import your Flask app (make sure it matches your app.py file)
from app import app as application
```
*(Don't forget to change `yourusername`!)*

4. Click the green **Save** button at the top, then go back to the **Web** tab.

---

## Step 8: Launch! 🚀
1. At the top of the **Web** tab, click the big green **Reload yourusername.pythonanywhere.com** button.
2. Click the link at the top of the page (`http://yourusername.pythonanywhere.com`).

**Congratulations!** Your Movie Mood Analyzer is now live on the internet! You can share this link with anyone for your college exhibition.
