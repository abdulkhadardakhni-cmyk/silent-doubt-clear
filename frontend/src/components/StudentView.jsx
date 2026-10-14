import React, { useState, useEffect } from 'react';
import { 
  Send, ShieldCheck, Heart, ThumbsUp, Sparkles, AlertCircle, 
  CheckCircle, QrCode, Search, HelpCircle, Layers, Users, BookOpen
} from 'lucide-react';
import { api, getStudentHash } from '../services/api';
import confetti from 'canvas-confetti';

export default function StudentView({
  classCode,
  onClassChange,
  classroomData,
  activeLecture,
  confusionGroups,
  onRefresh,
  onOpenQR
}) {
  const [doubtText, setDoubtText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [classInput, setClassInput] = useState(classCode || '');
  const [upvotingId, setUpvotingId] = useState(null);

  const studentHash = getStudentHash();
  const MAX_CHARS = 300;

  const handleClassJoin = (e) => {
    e.preventDefault();
    if (classInput.trim()) {
      onClassChange(classInput.trim().toUpperCase());
    }
  };

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmissionSuccess(null);

    const cleanText = doubtText.trim();
    if (cleanText.length < 5) {
      setErrorMsg('Please write at least 5 characters to describe your doubt.');
      return;
    }

    if (!activeLecture?.id) {
      setErrorMsg('No active lecture in this classroom right now.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitDoubt(activeLecture.id, cleanText, studentHash);
      
      // Trigger subtle celebration confetti for speaking up without fear
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#4f46e5', '#10b981', '#f59e0b']
        });
      } catch (err) {}

      setSubmissionSuccess({
        text: cleanText,
        topicLabel: res.topic_label,
        isNewGroup: res.is_new_group,
        engineUsed: res.engine_used,
        score: res.similarity_score
      });
      setDoubtText('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit doubt. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (doubtId) => {
    setUpvotingId(doubtId);
    try {
      await api.upvoteDoubt(doubtId, studentHash);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Could not register Me Too vote.');
    } finally {
      setUpvotingId(null);
    }
  };

  // Filter groups and doubts by search query
  const filteredGroups = (confusionGroups || []).filter((grp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const topicMatch = grp.topic_label.toLowerCase().includes(q);
    const doubtMatch = grp.representative_doubts?.some(d => d.text.toLowerCase().includes(q));
    return topicMatch || doubtMatch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* 1. Classroom Join / Header Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Anonymous Student Environment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {classroomData?.classroom?.name || 'Classroom Confusion Wall'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Subject: <span className="font-semibold text-slate-700">{classroomData?.classroom?.subject || 'General'}</span>
              {activeLecture && (
                <span className="ml-2 font-medium text-indigo-600">
                  • Currently Live: <span className="underline font-bold">{activeLecture.title}</span>
                </span>
              )}
            </p>
          </div>

          {/* Class Code Switcher */}
          <form onSubmit={handleClassJoin} className="flex items-center gap-2">
            <input
              type="text"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              placeholder="Code (e.g. CS101)"
              className="w-32 uppercase font-mono font-bold text-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Join
            </button>
            {onOpenQR && (
              <button
                type="button"
                onClick={onOpenQR}
                className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                title="Classroom QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* 2. Safe Anonymous Doubt Submission Box */}
      <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-indigo-100 relative overflow-hidden">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Submit Your Doubt Anonymously
          </h2>
        </div>

        <p className="text-xs text-slate-500 mb-4 max-w-xl">
          Never hesitate to ask. No teacher or peer can see your name, device, or student identity. Our AI groups similar questions so the teacher can explain the difficult concepts again.
        </p>

        <form onSubmit={handleSubmitDoubt} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={doubtText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setDoubtText(e.target.value);
                }
              }}
              placeholder="What feels confusing right now? (e.g. Why do we use arrays instead of normal variables? How does zero indexing work?)"
              className="w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none shadow-xs"
            />

            {/* Character Counter */}
            <div className={`absolute bottom-3 right-3 text-[11px] font-mono font-medium ${
              doubtText.length > MAX_CHARS - 30 ? 'text-amber-600 font-bold' : 'text-slate-400'
            }`}>
              {doubtText.length} / {MAX_CHARS}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submission Success Banner */}
          {submissionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1 animate-fade-in">
              <div className="flex items-center space-x-2 font-bold text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Your doubt was anonymously submitted!</span>
              </div>
              <p className="text-emerald-700">
                AI analyzed and grouped your doubt under:{' '}
                <span className="font-extrabold underline">{submissionSuccess.topicLabel}</span>
                {submissionSuccess.score < 1.0 && (
                  <span className="ml-1 text-[11px] text-emerald-600 font-mono">
                    (Similarity Match: {Math.round(submissionSuccess.score * 100)}%)
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Private • Untracked • Safe</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || doubtText.trim().length < 5}
              className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition shadow-sm ${
                isSubmitting || doubtText.trim().length < 5
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Grouping with AI...' : 'Post Anonymous Doubt'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Live Classroom Doubt Wall (Grouped by AI Topics) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Classroom Confusion Wall</span>
            </h3>
            <p className="text-xs text-slate-500">
              See what fellow classmates are confused about. Click <span className="font-bold text-indigo-600">"Me Too"</span> if you share the same doubt!
            </p>
          </div>

          {/* Search doubts */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doubts or topics..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Empty state */}
        {filteredGroups.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">No doubts in this lecture yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first to submit a question! Everything is 100% anonymous.
            </p>
          </div>
        )}

        {/* List of AI Confusion Groups */}
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            return (
              <div
                key={group.id}
                className={`bg-white rounded-3xl border-2 transition-all p-5 sm:p-6 shadow-sm hover:shadow-md ${
                  group.rank === 1
                    ? 'border-amber-400/90 shadow-amber-50'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Group Heading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    {group.rank && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        group.rank === 1
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        #{group.rank}
                      </span>
                    )}
                    <h4 className="text-base font-extrabold text-slate-900">
                      {group.topic_label}
                    </h4>
                  </div>

                  {/* Badges: Total students affected & Status */}
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
                      <Users className="w-3.5 h-3.5" />
                      <span>{group.total_students_affected} students confused</span>
                    </span>

                    {group.is_explained && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Explained by Teacher</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* List of Doubts under this Topic */}
                <div className="mt-4 space-y-2.5">
                  {group.representative_doubts?.map((doubt) => {
                    const hasUpvoted = doubt.has_upvoted;
                    return (
                      <div
                        key={doubt.id}
                        className="bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-800 leading-snug">
                            "{doubt.text}"
                          </p>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                            <span>Anonymous classmate</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-600">
                              {doubt.upvotes_count} {doubt.upvotes_count === 1 ? 'student also faces this' : 'students also face this'}
                            </span>
                          </div>
                        </div>

                        {/* "Me Too" Button */}
                        <button
                          onClick={() => handleUpvote(doubt.id)}
                          disabled={hasUpvoted || upvotingId === doubt.id}
                          className={`shrink-0 inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                            hasUpvoted
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 cursor-default'
                              : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-300 active:scale-95'
                          }`}
                          title={hasUpvoted ? 'You upvoted this doubt' : 'I have this exact same doubt too'}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                          <span>{hasUpvoted ? 'Me Too! (Saved)' : 'Me Too!'}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                            hasUpvoted ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-700'
                          }`}>
                            +{doubt.upvotes_count}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
