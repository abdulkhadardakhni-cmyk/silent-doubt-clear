import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Lightbulb, Code2, ListOrdered, Edit3, 
  Check, Maximize2, Minimize2, RefreshCw, BookmarkCheck, BookOpen
} from 'lucide-react';
import { api } from '../services/api';

export default function ExplanationModal({ isOpen, onClose, group, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // Explanation fields
  const [explanation, setExplanation] = useState(null);
  const [formData, setFormData] = useState({
    explanation_text: '',
    analogy: '',
    example: '',
    step_by_step: ''
  });

  useEffect(() => {
    if (isOpen && group?.id) {
      loadExplanation();
    }
  }, [isOpen, group?.id]);

  const loadExplanation = async () => {
    setLoading(true);
    try {
      const data = await api.getExplanation(group.id);
      if (data.exists && data.explanation) {
        setExplanation(data.explanation);
        setFormData({
          explanation_text: data.explanation.explanation_text || '',
          analogy: data.explanation.analogy || '',
          example: data.explanation.example || '',
          step_by_step: data.explanation.step_by_step || ''
        });
      } else {
        // Auto-generate if not yet generated
        handleGenerate();
      }
    } catch (err) {
      console.error('Error fetching explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await api.generateExplanation(group.id, teacherPrompt || null);
      setExplanation(data);
      setFormData({
        explanation_text: data.explanation_text || '',
        analogy: data.analogy || '',
        example: data.example || '',
        step_by_step: data.step_by_step || ''
      });
      setShowPromptInput(false);
      setTeacherPrompt('');
      if (onSaved) onSaved(data);
    } catch (err) {
      alert('Failed to generate explanation: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const updated = await api.updateExplanation(group.id, formData);
      setExplanation(updated);
      setIsEditing(false);
      if (onSaved) onSaved(updated);
    } catch (err) {
      alert('Failed to save explanation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in ${
      isFullscreen ? 'p-0' : ''
    }`}>
      <div className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col transition-all overflow-hidden ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl max-h-[92vh]'
      }`}>
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  AI Re-Explanation Deck
                </span>
                {explanation?.is_ai_generated && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    explanation.engine_used.includes('Gemini') || explanation.engine_used.includes('GPT')
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {explanation.engine_used.includes('Gemini') || explanation.engine_used.includes('GPT')
                      ? '⚡ Hosted Neural LLM'
                      : '🧠 Pedagogical Synthesizer (Offline Fallback)'}
                  </span>
                )}
                {explanation?.edited_by_teacher && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Teacher Reviewed & Edited
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                {group.topic_label}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition hidden sm:inline-flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Project to Classroom (Fullscreen)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Teacher Guidance / Regeneration Toolbar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Teacher Controls:</span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isEditing ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Explanation'}</span>
              </button>
              <button
                onClick={() => setShowPromptInput(!showPromptInput)}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Custom Instruction</span>
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition border border-indigo-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Synthesizing...' : 'Regenerate with AI'}</span>
            </button>
          </div>

          {/* Optional Prompt Input */}
          {showPromptInput && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 animate-fade-in">
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                Teacher's Specific Guidance / Focus (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={teacherPrompt}
                  onChange={(e) => setTeacherPrompt(e.target.value)}
                  placeholder="e.g., Use an analogy with a parking lot or apartment building..."
                  className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  Generate
                </button>
              </div>
            </div>
          )}

          {/* Representative Doubts that triggered this confusion */}
          {group.representative_doubts?.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>What Students Asked Anonymously ({group.representative_doubts.length} Doubts):</span>
              </div>
              <ul className="space-y-1.5">
                {group.representative_doubts.slice(0, 3).map((d) => (
                  <li key={d.id} className="text-xs text-amber-950 flex items-start space-x-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span className="italic">"{d.text}"</span>
                    {d.upvotes_count > 0 && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                        +{d.upvotes_count} Me Too
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* EDIT FORM or DISPLAY CARDS */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Simple Re-Explanation (For college students):
                </label>
                <textarea
                  rows={4}
                  value={formData.explanation_text}
                  onChange={(e) => setFormData({ ...formData, explanation_text: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Relatable Real-World Analogy:
                </label>
                <textarea
                  rows={3}
                  value={formData.analogy}
                  onChange={(e) => setFormData({ ...formData, analogy: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Concrete Example / Code Snippet:
                </label>
                <textarea
                  rows={4}
                  value={formData.example}
                  onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                  className="w-full font-mono bg-slate-900 text-slate-100 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Step-by-Step Mental Model Checklist:
                </label>
                <textarea
                  rows={4}
                  value={formData.step_by_step}
                  onChange={(e) => setFormData({ ...formData, step_by_step: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm"
                >
                  Save & Present
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Core Explanation */}
              <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>The Core Re-Explanation</span>
                </div>
                <p className="text-slate-800 text-base leading-relaxed">
                  {formData.explanation_text || 'No explanation generated yet.'}
                </p>
              </div>

              {/* Section 2: Everyday Analogy */}
              {formData.analogy && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>Everyday Life Analogy</span>
                  </div>
                  <p className="text-amber-950 text-sm sm:text-base leading-relaxed italic">
                    "{formData.analogy}"
                  </p>
                </div>
              )}

              {/* Section 3: Concrete Example / Code */}
              {formData.example && (
                <div className="bg-slate-900 rounded-2xl p-5 text-slate-100 shadow-md">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-3">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <span>Concrete Code Example</span>
                  </div>
                  <pre className="font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {formData.example}
                  </pre>
                </div>
              )}

              {/* Section 4: Step-by-Step Breakdown */}
              {formData.step_by_step && (
                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span>Step-by-Step Mental Model</span>
                  </div>
                  <div className="space-y-2 text-sm text-indigo-950 whitespace-pre-line leading-relaxed font-medium">
                    {formData.step_by_step}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Active Topic:</span>
            <span>{group.topic_label}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
          >
            Close Deck
          </button>
        </div>
      </div>
    </div>
  );
}
