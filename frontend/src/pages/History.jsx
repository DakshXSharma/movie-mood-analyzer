import React, { useState, useEffect } from 'react';
import { CheckCircle2, Film, Trash2, Star, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { MovieCard } from '../components/MovieCard';
import { MovieModal } from '../components/MovieModal';
import { useAuth } from '../context/AuthContext';

export const History = ({ onShowToast, onNavigateHome }) => {
  const { authFetch, refreshStats } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [activeModalId, setActiveModalId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/watched');
      if (!res.ok) {
        throw new Error('Failed to load watched movies');
      }
      const data = await res.json();
      setHistory(data || []);
    } catch (err) {
      setError(err.message || 'Error loading history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [authFetch]);

  // Remove from watched
  const handleRemoveWatched = async (movie) => {
    try {
      await authFetch(`/api/watched/${movie.imdb_id}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(m => m.imdb_id !== movie.imdb_id));
      refreshStats();
      onShowToast(`Removed "${movie.title}" from history`, 'info');
    } catch (err) {
      console.error(err);
      onShowToast('Failed to remove movie', 'error');
    }
  };

  // Add back to watchlist
  const handleAddToWatchlist = async (movie) => {
    try {
      // First remove from watched
      await authFetch(`/api/watched/${movie.imdb_id}`, { method: 'DELETE' });
      // Then add to watchlist
      await authFetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movie)
      });
      setHistory(prev => prev.filter(m => m.imdb_id !== movie.imdb_id));
      refreshStats();
      onShowToast(`Moved "${movie.title}" back to Watchlist!`, 'success');
    } catch (err) {
      console.error(err);
      onShowToast('Action failed', 'error');
    }
  };

  const activeModalMovie = history.find(m => m.imdb_id === activeModalId);

  // Calculate average rating
  const ratings = history
    .map(m => parseFloat(m.rating))
    .filter(r => !isNaN(r) && r > 0);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl glass-panel border border-slate-800 bg-[#0E121D]/90">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Watched Diary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Watched Film History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Every movie you've tracked. These titles are automatically excluded from new recommendations to keep suggestions fresh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs font-bold">
            {history.length} {history.length === 1 ? 'Film' : 'Films'} Watched
          </div>
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Avg {avgRating} / 10</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
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
            onClick={fetchHistory}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800 bg-[#0C0F17]">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No Watched Movies Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-6">
            When you mark movies as watched from the recommender or search, they will be archived here in your personal film log.
          </p>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <span>Start Exploring Movies</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {history.map((movie) => (
            <MovieCard
              key={movie.imdb_id}
              movie={movie}
              isWatched={true}
              isInWatchlist={false}
              onToggleWatched={() => handleRemoveWatched(movie)}
              onToggleWatchlist={() => handleAddToWatchlist(movie)}
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
          isWatched={true}
          isInWatchlist={false}
          onToggleWatched={(m) => handleRemoveWatched(m || activeModalMovie)}
          onToggleWatchlist={(m) => handleAddToWatchlist(m || activeModalMovie)}
        />
      )}
    </div>
  );
};
