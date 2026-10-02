import React from 'react';
import { Sparkles } from 'lucide-react';

export const MoodCard = ({ mood, isSelected, onClick }) => {
  const { label, emoji, color, genres, description } = mood;

  return (
    <button
      onClick={onClick}
      className={`group relative text-left p-5 rounded-2xl transition-all duration-300 w-full overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'glass-card border-indigo-500 shadow-glow-accent scale-[1.02] ring-2 ring-indigo-500/50'
          : 'glass-card hover:border-slate-700/80 hover:scale-[1.01] hover:shadow-glow-card'
      }`}
      style={{
        borderTopColor: isSelected ? color : undefined,
        borderTopWidth: isSelected ? '3px' : '1px'
      }}
    >
      {/* Background mood glow */}
      <div 
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
        style={{ backgroundColor: color || '#6366F1' }}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl filter drop-shadow-md transform transition-transform group-hover:scale-110 duration-200">
            {emoji}
          </span>
          {isSelected && (
            <span 
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-slate-900 shadow-sm"
              style={{ backgroundColor: color || '#F59E0B' }}
            >
              <Sparkles className="w-3 h-3" />
              Active
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
          {label}
        </h3>

        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      {genres && genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-800/80">
          {genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-300 border border-slate-800"
            >
              {g}
            </span>
          ))}
          {genres.length > 3 && (
            <span className="text-[10px] font-medium text-slate-500 self-center">
              +{genres.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
};
