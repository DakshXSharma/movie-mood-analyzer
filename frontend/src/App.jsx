import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Watchlist } from './pages/Watchlist';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Film, Loader2 } from 'lucide-react';

export function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [activePage, setActivePage] = useState('home'); // 'home' | 'search' | 'watchlist' | 'history' | 'profile'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 3500);
  };

  // Initial loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center text-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4 animate-pulse">
          <Film className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">MoodCinema</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Connecting to theater server...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    if (authView === 'signup') {
      return <Signup onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <Login onSwitchToSignup={() => setAuthView('signup')} />;
  }

  // Main Authenticated Application
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          setActivePage('search');
        }}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activePage === 'home' && (
            <Home
              onShowToast={showToast}
              onNavigateSearch={() => setActivePage('search')}
            />
          )}

          {activePage === 'search' && (
            <Search
              query={searchQuery}
              setQuery={setSearchQuery}
              onShowToast={showToast}
            />
          )}

          {activePage === 'watchlist' && (
            <Watchlist
              onShowToast={showToast}
              onNavigateHome={() => setActivePage('home')}
              onNavigateSearch={() => setActivePage('search')}
            />
          )}

          {activePage === 'history' && (
            <History
              onShowToast={showToast}
              onNavigateHome={() => setActivePage('home')}
            />
          )}

          {activePage === 'profile' && (
            <Profile onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
}

export default App;
