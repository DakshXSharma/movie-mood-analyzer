import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Film, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { MoodCard } from '../components/MoodCard';
import { MovieCard } from '../components/MovieCard';
import { MovieModal } from '../components/MovieModal';
import { useAuth } from '../context/AuthContext';

export const Home = ({ onShowToast, onNavigateSearch }) => {
  const { user, authFetch, refreshStats } = useAuth();
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState('happy');
  const [activeProfile, setActiveProfile] = useState(null);
  const [movies, setMovies] = useState([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [loadingMoods, setLoadingMoods] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [activeModalId, setActiveModalId] = useState(null);

  // Fetch all configured moods on mount
  useEffect(() => {
    const fetchMoods = async () => {
      try {
        const res = await authFetch('/api/moods');
        if (res.ok) {
          const data = await res.json();
          setMoods(data);
          // Set initial mood profile
          const happy = data.find(m => m.mood === 'happy') || data[0];
          if (happy) {
            setSelectedMood(happy.mood);
            setActiveProfile(happy);
          }
        }
      } catch (err) {
        console.error('Failed to load moods:', err);
      } finally {
        setLoadingMoods(false);
      }
    };
    fetchMoods();
  }, [authFetch]);

  // Fetch recommendations whenever selectedMood changes
  const fetchRecommendations = async (moodKey) => {
    if (!moodKey) return;
    setLoadingRecs(true);
    setError(null);
    try {
      const res = await authFetch(`/api/recommend?mood=${moodKey}`);
      if (!res.ok) {
        throw new Error('Failed to fetch recommendations for this mood');
      }
      const data = await res.json();
      setMovies(data.movies || []);
      setActiveProfile(data.profile);
      setExcludedCount(data.excluded_count || 0);
      refreshStats(); // Update mood session count & stats
    } catch (err) {
      setError(err.message || 'Error loading recommendations');
    } finally {
      setLoadingRecs(false);
    }
  };

  // Trigger initial recommendations once moods are ready
  useEffect(() => {
    if (selectedMood) {
      fetchRecommendations(selectedMood);
    }
  }, [selectedMood]);

  const handleSelectMood = (mood) => {
    setSelectedMood(mood.mood);
    setActiveProfile(mood);
  };

  const handleRefresh = () => {
    fetchRecommendations(selectedMood);
  };

  // Toggle Mark as Watched
  const handleToggleWatched = async (movie) => {
    const isCurrentlyWatched = movie.is_watched;
    try {
      if (isCurrentlyWatched) {
        // Remove from watched
        await authFetch(`/api/watched/${movie.imdb_id}`, { method: 'DELETE' });
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watched: false } : m));
        onShowToast(`Removed "${movie.title}" from watched history`, 'info');
      } else {
        // Add to watched
        await authFetch('/api/watched', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movie)
        });
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watched: true, is_watchlist: false } : m));
        onShowToast(`Marked "${movie.title}" as watched!`, 'success');
      }
      refreshStats();
    } catch (err) {
      console.error('Error toggling watched:', err);
      onShowToast('Action failed. Please try again.', 'error');
    }
  };

  // Toggle Watchlist
  const handleToggleWatchlist = async (movie) => {
    const isCurrentlyIn = movie.is_watchlist;
    try {
      if (isCurrentlyIn) {
        // Remove from watchlist
        await authFetch(`/api/watchlist/${movie.imdb_id}`, { method: 'DELETE' });
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watchlist: false } : m));
        onShowToast(`Removed "${movie.title}" from watchlist`, 'info');
      } else {
        // Add to watchlist
        const res = await authFetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movie)
        });
        const data = await res.json();
        if (!res.ok) {
          onShowToast(data.message || 'Already watched or saved', 'error');
          return;
        }
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watchlist: true } : m));
        onShowToast(`Added "${movie.title}" to your watchlist!`, 'success');
      }
      refreshStats();
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      onShowToast('Action failed. Please try again.', 'error');
    }
  };

  // Find movie for active modal
  const activeModalMovie = movies.find(m => m.imdb_id === activeModalId);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative rounded-3xl p-6 sm:p-10 glass-panel border border-slate-800/80 overflow-hidden bg-gradient-to-r from-[#111524] via-[#151A2E] to-[#121625]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mood-Based Movie Recommendations</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            How are you feeling today,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300">
              {user?.name?.split(' ')[0] || 'Cinephile'}?
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
            Pick how you're feeling and we'll suggest movies that match your mood.
          </p>
        </div>

        {/* Decorative background glow */}
        <div 
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
          style={{ backgroundColor: activeProfile?.color || '#6366F1' }}
        />
      </section>

      {/* Mood Selection Cards Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Select Your Mood</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              8 Profiles
            </span>
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Click any mood to trigger real-time movie curation
          </span>
        </div>

        {loadingMoods ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {moods.map((m) => (
              <MoodCard
                key={m.mood}
                mood={m}
                isSelected={selectedMood === m.mood}
                onClick={() => handleSelectMood(m)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recommendations Results Section */}
      <section className="space-y-5">
        {/* Banner with Mood Details & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800 bg-[#0E121E]">
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow">
              {activeProfile?.emoji || '🎬'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {activeProfile?.label || selectedMood.toUpperCase()} Picks
                </h3>
                {excludedCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    Filtered {excludedCount} watched
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {activeProfile?.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleRefresh}
              disabled={loadingRecs}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
              title="Refresh recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Suggestions</span>
            </button>
          </div>
        </div>

        {/* Movies Grid */}
        {loadingRecs ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800 flex flex-col justify-end p-4">
                <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center glass-panel rounded-3xl border border-rose-500/30">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">{error}</p>
            <p className="text-xs text-slate-400 mb-4">Please check your network or OMDB API credentials.</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
            >
              Try Again
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-200 font-bold mb-1">No recommendations found</p>
            <p className="text-xs text-slate-400">All matching titles might be in your watched history, or try another mood.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {movies.map((movie) => (
              <MovieCard
                key={movie.imdb_id}
                movie={movie}
                isWatched={movie.is_watched}
                isInWatchlist={movie.is_watchlist}
                onToggleWatched={handleToggleWatched}
                onToggleWatchlist={handleToggleWatchlist}
                onOpenDetails={(id) => setActiveModalId(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {activeModalId && (
        <MovieModal
          imdbId={activeModalId}
          isOpen={Boolean(activeModalId)}
          onClose={() => setActiveModalId(null)}
          isWatched={activeModalMovie?.is_watched}
          isInWatchlist={activeModalMovie?.is_watchlist}
          onToggleWatched={(m) => handleToggleWatched(m || activeModalMovie)}
          onToggleWatchlist={(m) => handleToggleWatchlist(m || activeModalMovie)}
        />
      )}
    </div>
  );
};
