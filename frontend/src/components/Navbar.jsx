import React from 'react';
import { HelpCircle, Shield, Wifi, WifiOff, RefreshCw, QrCode, GraduationCap, LayoutDashboard } from 'lucide-react';

export default function Navbar({
  currentRole,
  onRoleChange,
  classCode,
  isLive,
  onResetDemo,
  onOpenQR,
  loadingReset
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-50">
              <HelpCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  Silent Doubt Wall
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  AI Confusion Tracker
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Anonymous Classroom Doubts & Live Pedagogical Intelligence
              </p>
            </div>
          </div>

          {/* Center: Live Status & Class Code Badge */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {classCode && (
              <div className="flex items-center bg-slate-100 hover:bg-slate-200/70 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm">
                <span className="text-slate-500 mr-1.5 font-medium">Class:</span>
                <span className="font-mono font-bold text-indigo-700 tracking-wider">{classCode}</span>
              </div>
            )}

            {/* Real-time WebSocket connection pill */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isLive ? 'Real-Time WebSocket Sync Active' : 'Connecting WebSocket...'}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden md:inline">{isLive ? 'Live Sync' : 'Reconnecting'}</span>
            </div>

            {/* Presenter QR Code Button */}
            {onOpenQR && (
              <button
                onClick={onOpenQR}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition shadow-sm"
                title="Open Classroom QR Code for Projector"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Join QR</span>
              </button>
            )}

            {/* Quick Demo Reset for Judges */}
            <button
              onClick={onResetDemo}
              disabled={loadingReset}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
              title="Reset Demo Data (CS101)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReset ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>
          </div>

          {/* Right Mode Switcher (Student vs Teacher) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => onRoleChange('student')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'student'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>
            <button
              onClick={() => onRoleChange('teacher')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Teacher</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
