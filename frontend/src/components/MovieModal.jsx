import React, { useEffect, useState } from 'react';
import { X, Star, Clock, Calendar, Film, User, Award, Check, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MovieModal = ({
  imdbId,
  isOpen,
  onClose,
  isWatched,
  isInWatchlist,
  onToggleWatched,
  onToggleWatchlist
}) => {
  const { authFetch } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !imdbId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDetail = async () => {
      try {
        const res = await authFetch(`/api/movie/${imdbId}`);
        if (!res.ok) {
          throw new Error('Movie details could not be loaded');
        }
        const data = await res.json();
        if (isMounted) {
          setMovie(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    // Close on Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imdbId, isOpen, authFetch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden z-10 my-auto bg-gradient-to-b from-[#161B2A] to-[#0A0D15]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading movie details from cinema database...</p>
          </div>
        ) : error || !movie ? (
          <div className="p-8 text-center">
            <p className="text-rose-400 font-semibold mb-3">{error || 'Movie not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Left: Poster */}
            <div className="relative md:w-5/12 aspect-[2/3] md:aspect-auto bg-slate-900 overflow-hidden shrink-0">
              {movie.poster && movie.poster !== 'N/A' ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-500">
                  <Film className="w-12 h-12 mb-2 text-slate-600" />
                  <span className="text-xs">No Poster Available</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#161B2A] via-transparent to-transparent md:hidden" />
            </div>

            {/* Right: Details Info */}
            <div className="p-6 md:p-8 flex flex-col justify-between flex-grow overflow-y-auto max-h-[80vh]">
              <div>
                {/* Title & Year */}
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {movie.title}
                  </h2>
                  <span className="text-lg font-semibold text-slate-400">
                    ({movie.year})
                  </span>
                </div>

                {/* Meta pills: Rated, Runtime, Genre */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {movie.rated && movie.rated !== 'N/A' && (
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                      {movie.rated}
                    </span>
                  )}
                  {movie.runtime && movie.runtime !== 'N/A' && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {movie.runtime}
                    </span>
                  )}
                  {movie.genre && movie.genre !== 'N/A' && (
                    <span className="text-xs text-indigo-400 font-medium">
                      • {movie.genre}
                    </span>
                  )}
                </div>

                {/* Ratings Badges Bar */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
                  {/* IMDb */}
                  <div className="text-center p-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">IMDb</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-amber-400 font-extrabold text-sm sm:text-base">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{movie.rating && movie.rating !== 'N/A' ? `${movie.rating}/10` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Metacritic */}
                  <div className="text-center p-1.5 border-x border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Metascore</span>
                    <span className="block mt-0.5 text-emerald-400 font-extrabold text-sm sm:text-base">
                      {movie.metascore && movie.metascore !== 'N/A' ? `${movie.metascore}/100` : 'N/A'}
                    </span>
                  </div>

                  {/* Rotten Tomatoes */}
                  <div className="text-center p-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Rotten Tomatoes</span>
                    <span className="block mt-0.5 text-rose-400 font-extrabold text-sm sm:text-base">
                      {movie.rotten_tomatoes && movie.rotten_tomatoes !== 'N/A' ? movie.rotten_tomatoes : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Plot */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">Plot Synopsis</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {movie.plot && movie.plot !== 'N/A' ? movie.plot : 'No plot summary available for this title.'}
                  </p>
                </div>

                {/* Cast & Director */}
                <div className="space-y-2.5 text-xs text-slate-400 mb-6 border-t border-slate-800/80 pt-4">
                  {movie.director && movie.director !== 'N/A' && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-200 font-medium">Director: </span>
                        <span>{movie.director}</span>
                      </div>
                    </div>
                  )}

                  {movie.cast && movie.cast !== 'N/A' && (
                    <div className="flex items-start gap-2">
                      <Film className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-200 font-medium">Starring: </span>
                        <span>{movie.cast}</span>
                      </div>
                    </div>
                  )}

                  {movie.awards && movie.awards !== 'N/A' && (
                    <div className="flex items-start gap-2">
                      <Award className="w-4 h-4 text-amber-500/80 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-200 font-medium">Awards: </span>
                        <span>{movie.awards}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => onToggleWatchlist(movie)}
                  disabled={isWatched}
                  className={`w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isWatched
                      ? 'opacity-40 cursor-not-allowed bg-slate-900 text-slate-500 border border-slate-800'
                      : isInWatchlist
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-rose-950/60 hover:text-rose-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isInWatchlist ? 'fill-current' : ''}`} />
                  <span>{isInWatchlist ? 'In Your Watchlist' : 'Add to Watchlist'}</span>
                </button>

                <button
                  onClick={() => onToggleWatched(movie)}
                  className={`w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isWatched
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-rose-950/60 hover:text-rose-300'
                      : 'bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-500/50 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isWatched ? 'Watched ✓ (Click to Remove)' : 'Mark as Watched'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
