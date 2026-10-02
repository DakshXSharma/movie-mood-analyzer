import React, { useState, useEffect } from 'react';
import { Bookmark, Film, Trash2, CheckCircle2, Search, ArrowRight, Loader2 } from 'lucide-react';
import { MovieCard } from '../components/MovieCard';
import { MovieModal } from '../components/MovieModal';
import { useAuth } from '../context/AuthContext';

export const Watchlist = ({ onShowToast, onNavigateHome, onNavigateSearch }) => {
  const { authFetch, refreshStats } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [activeModalId, setActiveModalId] = useState(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/watchlist');
      if (!res.ok) {
        throw new Error('Failed to load your watchlist');
      }
      const data = await res.json();
      setWatchlist(data || []);
    } catch (err) {
      setError(err.message || 'Error loading watchlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [authFetch]);

  // Mark as Watched (automatically removes from watchlist in backend)
  const handleMarkWatched = async (movie) => {
    try {
      await authFetch('/api/watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie)
      });
      setWatchlist(prev => prev.filter(m => m.imdb_id !== movie.imdb_id));
      refreshStats();
      onShowToast(`Moved "${movie.title}" to Watched History!`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to mark as watched', 'error');
    }
  };

  // Remove from watchlist
  const handleRemove = async (movie) => {
    try {
      await authFetch(`/api/watchlist/${movie.imdb_id}`, { method: 'DELETE' });
      setWatchlist(prev => prev.filter(m => m.imdb_id !== movie.imdb_id));
      refreshStats();
      onShowToast(`Removed "${movie.title}" from watchlist`, 'info');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to remove from watchlist', 'error');
    }
  };

  const activeModalMovie = watchlist.find(m => m.imdb_id === activeModalId);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 bg-[#0E121D]/90">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Personal Watchlist</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            My Movie Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Movies you saved to watch later. Once watched, they will automatically migrate to your history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs font-bold">
            {watchlist.length} {watchlist.length === 1 ? 'Movie' : 'Movies'} Saved
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-rose-500/30">
          <p className="text-rose-400 font-semibold mb-3">{error}</p>
          <button
            onClick={fetchWatchlist}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800 bg-[#0C0F17]">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">Your Watchlist is Empty</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
            You haven't saved any movies yet. Explore recommendations by mood or search your favorite titles to add them here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              <span>Explore Moods</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateSearch}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Search Movies</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {watchlist.map((movie) => (
            <MovieCard
              key={movie.imdb_id}
              movie={movie}
              isWatched={false}
              isInWatchlist={true}
              onToggleWatched={() => handleMarkWatched(movie)}
              onToggleWatchlist={() => handleRemove(movie)}
              onOpenDetails={(id) => setActiveModalId(id)}
            />
          ))}
        </div>
      )}

      {/* Details Modal */}
      {activeModalId && (
        <MovieModal
          imdbId={activeModalId}
          isOpen={Boolean(activeModalId)}
          onClose={() => setActiveModalId(null)}
          isWatched={false}
          isInWatchlist={true}
          onToggleWatched={(m) => handleMarkWatched(m || activeModalMovie)}
          onToggleWatchlist={(m) => handleRemove(m || activeModalMovie)}
        />
      )}
    </div>
  );
};
