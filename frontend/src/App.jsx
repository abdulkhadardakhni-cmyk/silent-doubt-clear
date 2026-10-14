import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import StudentView from './components/StudentView';
import TeacherDashboard from './components/TeacherDashboard';
import QRCodeModal from './components/QRCodeModal';
import ExplanationModal from './components/ExplanationModal';
import { api, getStudentHash } from './services/api';
import { LectureWebSocket } from './services/websocket';

export default function App() {
  // Read class code from URL if present
  const queryParams = new URLSearchParams(window.location.search);
  const initialCode = (queryParams.get('code') || 'CS101').toUpperCase();

  const [classCode, setClassCode] = useState(initialCode);
  const [currentRole, setCurrentRole] = useState('student'); // 'student' | 'teacher'
  
  // Data state
  const [classroomData, setClassroomData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [confusionGroups, setConfusionGroups] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  
  // Live connection & status
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingReset, setLoadingReset] = useState(false);

  // Modals
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGroupForExplanation, setSelectedGroupForExplanation] = useState(null);

  const socketRef = useRef(null);
  const studentHash = getStudentHash();

  // Load classroom and active lecture data
  const loadClassroomData = async (code = classCode) => {
    try {
      setLoading(true);
      const data = await api.getClassroom(code);
      setClassroomData(data);

      const lecList = await api.getLectures(code);
      setLectures(lecList);

      const active = data.active_lecture || (lecList.length > 0 ? lecList[0] : null);
      setActiveLecture(active);

      if (active) {
        await loadConfusionGroups(active.id);
      }

      const anData = await api.getClassroomAnalytics(code);
      setAnalyticsData(anData);
    } catch (err) {
      console.error('Error loading classroom:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfusionGroups = async (lectureId) => {
    try {
      const groups = await api.getConfusionGroups(lectureId, studentHash);
      setConfusionGroups(groups);
    } catch (err) {
      console.error('Error loading confusion groups:', err);
    }
  };

  // Switch class code
  const handleClassChange = (newCode) => {
    setClassCode(newCode);
    const newUrl = `${window.location.pathname}?code=${encodeURIComponent(newCode)}`;
    window.history.pushState(null, '', newUrl);
    loadClassroomData(newCode);
  };

  // Initial load
  useEffect(() => {
    loadClassroomData(classCode);
  }, [classCode]);

  // Connect WebSocket when active lecture changes
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (activeLecture?.id) {
      socketRef.current = new LectureWebSocket(
        activeLecture.id,
        (msg) => {
          console.log('[App] Received WebSocket message:', msg);
          // Auto refresh groups when new doubt, upvote, or explained toggle arrives
          loadConfusionGroups(activeLecture.id);
          // Also refresh analytics in background
          api.getClassroomAnalytics(classCode).then(setAnalyticsData).catch(() => {});
        },
        (status) => setIsLive(status)
      );
      socketRef.current.connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeLecture?.id, classCode]);

  // Lecture selection & activation
  const handleSelectLecture = async (lectureId) => {
    const found = lectures.find(l => l.id === lectureId);
    if (found) {
      setActiveLecture(found);
      await loadConfusionGroups(found.id);
    }
  };

  const handleActivateLecture = async (lectureId) => {
    try {
      await api.activateLecture(lectureId);
      await loadClassroomData(classCode);
    } catch (err) {
      alert('Error activating lecture: ' + err.message);
    }
  };

  // Reset demo data handler
  const handleResetDemo = async () => {
    if (!window.confirm('Reset demo classroom CS101 to default ranked confusion points?')) return;
    setLoadingReset(true);
    try {
      await api.resetDemoData();
      await loadClassroomData('CS101');
      setClassCode('CS101');
    } catch (err) {
      alert('Error resetting demo: ' + err.message);
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        classCode={classCode}
        isLive={isLive}
        onResetDemo={handleResetDemo}
        onOpenQR={() => setShowQRModal(true)}
        loadingReset={loadingReset}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {loading && !classroomData ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading Classroom & AI Groups...
            </p>
          </div>
        ) : currentRole === 'student' ? (
          <StudentView
            classCode={classCode}
            onClassChange={handleClassChange}
            classroomData={classroomData}
            activeLecture={activeLecture}
            confusionGroups={confusionGroups}
            onRefresh={() => loadConfusionGroups(activeLecture?.id)}
            onOpenQR={() => setShowQRModal(true)}
          />
        ) : (
          <TeacherDashboard
            classCode={classCode}
            classroomData={classroomData}
            lectures={lectures}
            activeLecture={activeLecture}
            confusionGroups={confusionGroups}
            analyticsData={analyticsData}
            onSelectLecture={handleSelectLecture}
            onActivateLecture={handleActivateLecture}
            onRefresh={() => loadClassroomData(classCode)}
            onOpenQR={() => setShowQRModal(true)}
            onOpenExplanation={(grp) => setSelectedGroupForExplanation(grp)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-600">
            Silent Doubt Wall – Anonymous Classroom Confusion Tracker
          </p>
          <p className="text-slate-400">
            Built for College Hackathon • AI-Enabled Pedagogical Intelligence
          </p>
        </div>
      </footer>

      {/* Presenter QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        classCode={classCode}
        lectureTitle={activeLecture?.title}
      />

      {/* AI Re-Explanation Deck Modal */}
      <ExplanationModal
        isOpen={Boolean(selectedGroupForExplanation)}
        onClose={() => setSelectedGroupForExplanation(null)}
        group={selectedGroupForExplanation}
        onSaved={() => {
          if (activeLecture) loadConfusionGroups(activeLecture.id);
        }}
      />
    </div>
  );
}
