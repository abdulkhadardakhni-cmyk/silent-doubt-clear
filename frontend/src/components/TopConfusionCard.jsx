import React from 'react';
import { Flame, Trophy, Award, CheckCircle2, RotateCcw, Sparkles, Users, MessageSquare } from 'lucide-react';

export default function TopConfusionCard({
  group,
  onExplainClick,
  onToggleExplained
}) {
  const isRank1 = group.rank === 1;
  const isRank2 = group.rank === 2;
  const isRank3 = group.rank === 3;

  const rankThemes = {
    1: {
      border: 'border-amber-400/80 shadow-amber-100',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200',
      icon: Flame,
      label: 'Rank #1 Highest Confusion Point',
      impactColor: 'text-amber-600',
      headerBg: 'bg-gradient-to-br from-amber-50/70 to-orange-50/40'
    },
    2: {
      border: 'border-slate-300 shadow-slate-100',
      badgeBg: 'bg-slate-700 text-white shadow-slate-200',
      icon: Trophy,
      label: 'Rank #2 Confusion Point',
      impactColor: 'text-slate-700',
      headerBg: 'bg-slate-50/60'
    },
    3: {
      border: 'border-amber-700/30 shadow-amber-50',
      badgeBg: 'bg-amber-800 text-white shadow-amber-200',
      icon: Award,
      label: 'Rank #3 Confusion Point',
      impactColor: 'text-amber-800',
      headerBg: 'bg-amber-50/30'
    }
  };

  const theme = rankThemes[group.rank] || rankThemes[3];
  const IconComponent = theme.icon;

  return (
    <div className={`relative bg-white rounded-3xl border-2 ${theme.border} shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden hover:shadow-xl ${
      group.is_explained ? 'opacity-80 grayscale-[20%]' : ''
    }`}>
      {/* Top Banner */}
      <div className={`p-5 ${theme.headerBg} border-b border-slate-100`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${theme.badgeBg}`}>
              <IconComponent className="w-3.5 h-3.5" />
              <span>#{group.rank}</span>
            </span>
            <span className="text-xs font-bold text-slate-500">
              {group.rank === 1 ? 'Top Priority' : `Priority Level ${group.rank}`}
            </span>
          </div>

          {/* Explained Badge */}
          {group.is_explained ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Explained</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Needs Explanation</span>
            </span>
          )}
        </div>

        {/* Topic Title */}
        <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
          {group.topic_label}
        </h3>

        {group.summary && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {group.summary}
          </p>
        )}
      </div>

      {/* Middle: Metrics & Representative Doubts */}
      <div className="p-5 flex-1 space-y-4">
        {/* Student Impact Metric */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
          <div>
            <div className={`text-xl font-black ${theme.impactColor}`}>
              {group.total_students_affected}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Affected
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">
              {group.doubts_count}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Doubts
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-indigo-600">
              {group.total_upvotes}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Me Too Votes
            </div>
          </div>
        </div>

        {/* Representative Anonymous Doubts */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Student Doubts:</span>
            </span>
            <span className="text-[10px] text-slate-400">Anonymous</span>
          </div>

          <div className="space-y-2">
            {group.representative_doubts?.slice(0, 3).map((d) => (
              <div
                key={d.id}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start justify-between shadow-2xs hover:border-slate-300 transition"
              >
                <p className="leading-snug pr-2 text-slate-700 italic">
                  "{d.text}"
                </p>
                {d.upvotes_count > 0 && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    +{d.upvotes_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onExplainClick(group)}
          className={`flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold transition shadow-sm ${
            isRank1
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-indigo-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Re-Explain Deck</span>
        </button>

        <button
          onClick={() => onToggleExplained(group.id)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
            group.is_explained
              ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
          }`}
          title={group.is_explained ? 'Reopen as confusing' : 'Mark as Explained to class'}
        >
          {group.is_explained ? (
            <span className="flex items-center space-x-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Explained</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
