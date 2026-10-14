import React from 'react';
import { Calendar, CheckCircle2, ChevronRight, BookOpen, AlertCircle, Play } from 'lucide-react';

export default function LectureHistory({
  lectureHistory,
  activeLectureId,
  onSelectLecture,
  onActivateLecture
}) {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Lecture-wise Confusion History</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit past lectures, compare student confusion levels, and inspect what topics needed re-explanation.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-extrabold">
              <th className="py-3 px-4">Lecture #</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4 text-center">Doubts</th>
              <th className="py-3 px-4 text-center">Me Too</th>
              <th className="py-3 px-4 text-center">Groups</th>
              <th className="py-3 px-4">Highest Confusion Topic</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lectureHistory?.map((lec) => {
              const isActive = lec.id === activeLectureId || lec.is_active === 1;
              return (
                <tr
                  key={lec.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isActive ? 'bg-indigo-50/30 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    Lec {lec.lecture_number}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-bold max-w-xs truncate">
                    {lec.title}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-bold">
                    {lec.total_doubts}
                  </td>
                  <td className="py-3.5 px-4 text-center text-indigo-600 font-bold">
                    +{lec.total_upvotes}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700">
                    {lec.total_groups}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800">
                    {lec.top_confusion_topic ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>{lec.top_confusion_topic}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Live Session</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onSelectLecture(lec.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                      >
                        Inspect
                      </button>
                      {!isActive && onActivateLecture && (
                        <button
                          onClick={() => onActivateLecture(lec.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Make Active
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
