import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Film, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MovieCard } from '../components/MovieCard';
import { MovieModal } from '../components/MovieModal';
import { useAuth } from '../context/AuthContext';

export const Search = ({ query, setQuery, onShowToast }) => {
  const { authFetch, refreshStats } = useAuth();
  const [searchTerm, setSearchTerm] = useState(query || '');
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal
  const [activeModalId, setActiveModalId] = useState(null);

  const executeSearch = async (q, pageNum = 1) => {
    if (!q || !q.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(q.trim())}&page=${pageNum}`);
      if (!res.ok) {
        throw new Error('Search failed. Please try a different query.');
      }
      const data = await res.json();
      setMovies(data.movies || []);
      setTotalCount(data.total_count || 0);
      setPage(pageNum);
    } catch (err) {
      setError(err.message || 'Error executing search');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query && query.trim()) {
      setSearchTerm(query);
      executeSearch(query, 1);
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setQuery(searchTerm);
      executeSearch(searchTerm, 1);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    executeSearch(searchTerm, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Mark as Watched
  const handleToggleWatched = async (movie) => {
    const isCurrentlyWatched = movie.is_watched;
    try {
      if (isCurrentlyWatched) {
        await authFetch(`/api/watched/${movie.imdb_id}`, { method: 'DELETE' });
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watched: false } : m));
        onShowToast(`Removed "${movie.title}" from watched`, 'info');
      } else {
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
      console.error(err);
      onShowToast('Action failed', 'error');
    }
  };

  // Toggle Watchlist
  const handleToggleWatchlist = async (movie) => {
    const isCurrentlyIn = movie.is_watchlist;
    try {
      if (isCurrentlyIn) {
        await authFetch(`/api/watchlist/${movie.imdb_id}`, { method: 'DELETE' });
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watchlist: false } : m));
        onShowToast(`Removed "${movie.title}" from watchlist`, 'info');
      } else {
        const res = await authFetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movie)
        });
        const data = await res.json();
        if (!res.ok) {
          onShowToast(data.message || 'Already watched or in watchlist', 'error');
          return;
        }
        setMovies(prev => prev.map(m => m.imdb_id === movie.imdb_id ? { ...m, is_watchlist: true } : m));
        onShowToast(`Saved "${movie.title}" to watchlist!`, 'success');
      }
      refreshStats();
    } catch (err) {
      console.error(err);
      onShowToast('Action failed', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / 10);
  const activeModalMovie = movies.find(m => m.imdb_id === activeModalId);

  return (
    <div className="space-y-8 pb-16">
      {/* Search Header Form */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-[#0E121D]/90 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
          Global Movie Search
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          Query millions of movie titles directly from OMDB with real-time watch tracking.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by movie title (e.g. Oppenheimer, Interstellar, Batman)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/95 text-slate-100 placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm shadow-inner transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
            <span>Find Movies</span>
          </button>
        </form>
      </section>

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <div>
            Showing results for <span className="text-white font-bold">"{searchTerm}"</span>{' '}
            <span className="text-slate-500">({totalCount} matches found)</span>
          </div>
          {totalPages > 1 && (
            <div>
              Page <span className="text-white font-bold">{page}</span> of {totalPages}
            </div>
          )}
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center glass-panel rounded-3xl border border-rose-500/30">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <p className="text-slate-200 font-semibold mb-1">{error}</p>
          <p className="text-xs text-slate-400">Please try another search keyword.</p>
        </div>
      ) : hasSearched && movies.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Movies Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            We couldn't find any titles matching "{searchTerm}". Try checking for spelling or searching with a broader title.
          </p>
        </div>
      ) : movies.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-800">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition-colors border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                {page} / {totalPages}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition-colors border border-slate-700"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Initial Search Suggestions */
        <div className="p-12 text-center glass-panel rounded-3xl border border-slate-800">
          <Film className="w-12 h-12 text-indigo-500/60 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Start Your Movie Discovery</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Type any film name to view ratings, synopses, and save directly to your watchlist.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['Inception', 'The Dark Knight', 'Gladiator', 'Interstellar', 'Pulp Fiction', 'Spirited Away'].map(
              (suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSearchTerm(suggestion);
                    setQuery(suggestion);
                    executeSearch(suggestion, 1);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-300 text-xs border border-slate-800 transition-colors"
                >
                  {suggestion}
                </button>
              )
            )}
          </div>
        </div>
      )}

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
