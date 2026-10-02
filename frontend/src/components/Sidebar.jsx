import React from 'react';
import { Compass, Search, Bookmark, CheckCircle2, User, Sparkles, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const { stats, user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Mood Recommender', icon: <Compass className="w-5 h-5" /> },
    { id: 'search', label: 'Search Movies', icon: <Search className="w-5 h-5" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Bookmark className="w-5 h-5" />, badge: stats.watchlist_count },
    { id: 'history', label: 'Watched History', icon: <CheckCircle2 className="w-5 h-5" />, badge: stats.watched_count },
    { id: 'profile', label: 'Analytics & Profile', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const handleNav = (id) => {
    setActivePage(id);
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 left-0 z-40 h-full md:h-[calc(100vh-4rem)] w-64 bg-[#0A0D15] md:bg-transparent border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Mobile Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 md:hidden">
            <span className="font-extrabold text-lg text-white">MoodCinema</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Stats Card */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl glass-card bg-gradient-to-br from-slate-900/90 to-indigo-950/30 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Cinema Stats</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center my-2">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-base font-extrabold text-white block">
                  {stats.watched_count || 0}
                </span>
                <span className="text-[10px] text-slate-400">Watched</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-base font-extrabold text-white block">
                  {stats.watchlist_count || 0}
                </span>
                <span className="text-[10px] text-slate-400">In Queue</span>
              </div>
            </div>

            {stats.top_mood && (
              <div className="mt-2 text-center text-[11px] text-slate-300">
                Top Mood: <span className="font-bold text-amber-400 capitalize">{stats.top_mood}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
