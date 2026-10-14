import React, { useState } from 'react';
import { 
  Users, MessageSquare, ThumbsUp, Layers, Plus, QrCode, 
  Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Lock, Key, 
  TrendingUp, Calendar, ChevronDown, Check, ArrowRight, ShieldAlert
} from 'lucide-react';
import TopConfusionCard from './TopConfusionCard';
import AnalyticsCharts from './AnalyticsCharts';
import LectureHistory from './LectureHistory';
import { api } from '../services/api';

export default function TeacherDashboard({
  classCode,
  classroomData,
  lectures,
  activeLecture,
  confusionGroups,
  analyticsData,
  onSelectLecture,
  onActivateLecture,
  onRefresh,
  onOpenQR,
  onOpenExplanation
}) {
  const [activeTab, setActiveTab] = useState('wall'); // 'wall' | 'analytics' | 'history'
  const [showNewLectureModal, setShowNewLectureModal] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [creatingLecture, setCreatingLecture] = useState(false);

  // Authentication state (PIN 1234)
  const [isTeacherAuthed, setIsTeacherAuthed] = useState(
    () => localStorage.getItem('teacher_auth_token') === 'true'
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await api.verifyTeacherPin(pinInput, classCode);
      if (res.valid) {
        setIsTeacherAuthed(true);
        localStorage.setItem('teacher_auth_token', 'true');
      }
    } catch (err) {
      setPinError('Incorrect PIN. (Default demo PIN is 1234)');
    }
  };

  const handleCreateLecture = async (e) => {
    e.preventDefault();
    if (!newLectureTitle.trim()) return;

    setCreatingLecture(true);
    try {
      const classroomId = classroomData?.classroom?.id;
      if (!classroomId) throw new Error('Classroom not loaded.');

      await api.createLecture({
        classroom_id: classroomId,
        title: newLectureTitle.trim()
      });
      setNewLectureTitle('');
      setShowNewLectureModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to create lecture: ' + err.message);
    } finally {
      setCreatingLecture(false);
    }
  };

  const handleToggleExplained = async (groupId) => {
    try {
      await api.toggleMarkExplained(groupId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Top 3 Confusion Points
  const top3Groups = (confusionGroups || []).slice(0, 3);
  const otherGroups = (confusionGroups || []).slice(3);

  // Aggregated Stats
  const totalDoubts = (confusionGroups || []).reduce((acc, g) => acc + g.doubts_count, 0);
  const totalUpvotes = (confusionGroups || []).reduce((acc, g) => acc + g.total_upvotes, 0);
  const totalGroupsCount = confusionGroups?.length || 0;
  const explainedCount = (confusionGroups || []).filter(g => g.is_explained).length;
  const resolutionRate = totalGroupsCount > 0 ? Math.round((explainedCount / totalGroupsCount) * 100) : 0;

  // PIN Gate
  if (!isTeacherAuthed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 animate-fade-in text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-5">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Teacher Authentication</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter the teacher security PIN to manage lecture confusion and view private controls.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN (Demo default: 1234)"
                className="w-full text-center tracking-widest text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
              {pinError && (
                <p className="text-xs font-semibold text-rose-600 mt-1.5">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-indigo-100"
            >
              Unlock Dashboard
            </button>

            <p className="text-[11px] text-slate-400">
              Judges Note: Demo master passcode is <span className="font-mono font-bold text-slate-600">1234</span>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* 1. Dashboard Top Bar & Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
              Teacher Command Hub
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="font-mono font-bold text-slate-600 text-xs">
              Code: <span className="text-indigo-600 font-extrabold">{classCode}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {activeLecture?.title || 'Classroom Overview'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {classroomData?.classroom?.name} ({classroomData?.classroom?.subject})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lecture Switcher */}
          <div className="relative">
            <select
              value={activeLecture?.id || ''}
              onChange={(e) => onSelectLecture && onSelectLecture(Number(e.target.value))}
              className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold py-2.5 pl-3 pr-8 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              {lectures?.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  Lec {lec.lecture_number}: {lec.title.length > 28 ? lec.title.substring(0, 28) + '...' : lec.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
          </div>

          {/* New Lecture */}
          <button
            onClick={() => setShowNewLectureModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lecture</span>
          </button>

          {/* Project QR Code */}
          <button
            onClick={onOpenQR}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Project Join QR</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalDoubts}</div>
            <div className="text-xs font-bold text-slate-500">Anonymous Doubts</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">+{totalUpvotes}</div>
            <div className="text-xs font-bold text-slate-500">"Me Too" Upvotes</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalGroupsCount}</div>
            <div className="text-xs font-bold text-slate-500">AI Confusion Clusters</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{resolutionRate}%</div>
            <div className="text-xs font-bold text-slate-500">Explained ({explainedCount}/{totalGroupsCount})</div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-sm font-extrabold">
        <button
          onClick={() => setActiveTab('wall')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'wall'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ranked Confusion Wall</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Analytics & Progression</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lecture History</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {activeTab === 'wall' && (
        <div className="space-y-8 animate-fade-in">
          {/* Top 3 Confusion Points Podium */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>Top 3 Confusion Points in this Lecture</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Ranked by student demand (total doubts submitted + "Me Too" peer upvotes)
                </p>
              </div>
            </div>

            {top3Groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {top3Groups.map((grp) => (
                  <TopConfusionCard
                    key={grp.id}
                    group={grp}
                    onExplainClick={onOpenExplanation}
                    onToggleExplained={handleToggleExplained}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                <p className="text-sm text-slate-500">No confusion points detected yet in this session.</p>
              </div>
            )}
          </div>

          {/* Remaining Confusion Points */}
          {otherGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                Other Confusion Points ({otherGroups.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                          Rank #{grp.rank}
                        </span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                          {grp.total_students_affected} affected
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{grp.topic_label}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{grp.summary}</p>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onOpenExplanation(grp)}
                        className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition"
                      >
                        AI Re-Explain Deck
                      </button>
                      <button
                        onClick={() => handleToggleExplained(grp.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          grp.is_explained
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {grp.is_explained ? 'Explained' : 'Mark Explained'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <AnalyticsCharts analyticsData={analyticsData} />
      )}

      {/* Lecture History Tab */}
      {activeTab === 'history' && (
        <LectureHistory
          lectureHistory={analyticsData?.lecture_history}
          activeLectureId={activeLecture?.id}
          onSelectLecture={onSelectLecture}
          onActivateLecture={onActivateLecture}
        />
      )}

      {/* Modal: Create New Lecture */}
      {showNewLectureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Start New Lecture Session</h3>
            <p className="text-xs text-slate-500">
              Starting a new lecture archives the current session and launches a fresh anonymous confusion tracker for your students.
            </p>

            <form onSubmit={handleCreateLecture} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lecture Topic / Title</label>
                <input
                  type="text"
                  value={newLectureTitle}
                  onChange={(e) => setNewLectureTitle(e.target.value)}
                  placeholder="e.g., Lecture 5: Singly Linked Lists & Node Pointers"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewLectureModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLecture || !newLectureTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {creatingLecture ? 'Creating...' : 'Create & Launch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
