import React, { useState } from 'react';
import { Star, Check, Bookmark, BookmarkCheck, Info, HelpCircle, Eye } from 'lucide-react';

export const MovieCard = ({
  movie,
  isWatched,
  isInWatchlist,
  onToggleWatched,
  onToggleWatchlist,
  onOpenDetails
}) => {
  const [imgError, setImgError] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const {
    imdb_id,
    title,
    year,
    poster,
    genre,
    rating,
    why_recommended,
    score
  } = movie;

  const hasValidPoster = poster && poster !== 'N/A' && !imgError;

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-card glass-card-hover flex flex-col justify-between border border-slate-800/80 bg-gradient-to-b from-[#161B2A] to-[#0E121D]">
      {/* Top Poster Section */}
      <div 
        className="relative w-full aspect-[2/3] bg-slate-900 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetails(imdb_id)}
      >
        {hasValidPoster ? (
          <img
            src={poster}
            alt={title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-900 to-indigo-950/40 text-slate-500">
            <span className="text-4xl mb-2">🎬</span>
            <span className="text-xs font-medium text-slate-400 line-clamp-2">{title}</span>
            <span className="text-[10px] text-slate-600 mt-1">No Poster Available</span>
          </div>
        )}

        {/* Dark gradient overlay on poster for badges readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E121D] via-transparent to-black/60 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 pointer-events-none">
          {rating && rating !== 'N/A' ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold shadow-md">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-1.5">
            {isWatched && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/90 text-slate-950 text-[11px] font-extrabold shadow-lg backdrop-blur-md">
                <Check className="w-3 h-3 stroke-[3]" />
                Watched
              </span>
            )}
            {isInWatchlist && !isWatched && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/90 text-white text-[11px] font-bold shadow-lg backdrop-blur-md">
                <BookmarkCheck className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Floating Quick View button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(imdb_id);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md border border-white/30 shadow-xl transform transition-transform group-hover:scale-100 scale-90"
          >
            <Eye className="w-3.5 h-3.5" />
            Quick Details
          </button>
        </div>

        {/* Year Pill at bottom of poster */}
        <div className="absolute bottom-2 left-2.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-medium text-slate-300 border border-white/10">
            {year}
          </span>
        </div>
      </div>

      {/* Card Info Content */}
      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <h4 
            onClick={() => onOpenDetails(imdb_id)}
            className="font-bold text-sm text-slate-100 hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer"
            title={title}
          >
            {title}
          </h4>

          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            {genre && genre !== 'N/A' ? genre : 'Cinema'}
          </p>

          {/* Exhibition Feature: "Why this movie?" mood explanation tooltip/tag */}
          {why_recommended && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Why this pick?</span>
              </button>
              {showWhy && (
                <div className="mt-1.5 p-2 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-[11px] text-indigo-200 leading-snug animate-fade-in">
                  {why_recommended}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
          {/* Watchlist Toggle */}
          <button
            onClick={() => onToggleWatchlist(movie)}
            disabled={isWatched}
            title={isWatched ? "Already watched" : isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
              isWatched
                ? 'opacity-40 cursor-not-allowed bg-slate-900 text-slate-500'
                : isInWatchlist
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isInWatchlist ? 'Saved' : 'Watchlist'}</span>
          </button>

          {/* Watched Toggle */}
          <button
            onClick={() => onToggleWatched(movie)}
            title={isWatched ? "Remove from watched" : "Mark as watched"}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
              isWatched
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-slate-800/80 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-500/40 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isWatched ? 'Watched' : 'Mark'}</span>
          </button>

          {/* Details Modal Trigger */}
          <button
            onClick={() => onOpenDetails(imdb_id)}
            title="View full movie details"
            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
