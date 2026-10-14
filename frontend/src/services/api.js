/**
 * Silent Doubt Wall - API Service
 */

const BASE_URL = '/api';

/**
 * Get or create a persistent anonymous student hash stored in localStorage.
 * Ensures zero student identification, email, or name is ever requested or transmitted.
 */
export function getStudentHash() {
  let hash = localStorage.getItem('anonymous_doubt_student_hash');
  if (!hash) {
    hash = 'anon_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('anonymous_doubt_student_hash', hash);
  }
  return hash;
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'An unexpected error occurred.');
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Classroom
  getClassroom: (code) => request(`/classrooms/${encodeURIComponent(code)}`),
  createClassroom: (data) => request('/classrooms', { method: 'POST', body: JSON.stringify(data) }),
  verifyTeacherPin: (pin, classCode) => request('/classrooms/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin, class_code: classCode })
  }),

  // Lectures
  getLectures: (code) => request(`/classrooms/${encodeURIComponent(code)}/lectures`),
  createLecture: (data) => request('/lectures', { method: 'POST', body: JSON.stringify(data) }),
  activateLecture: (id) => request(`/lectures/${id}/activate`, { method: 'PUT' }),

  // Confusion Groups & Ranked Top 3
  getConfusionGroups: (lectureId, studentHash = null) => {
    const query = studentHash ? `?student_hash=${encodeURIComponent(studentHash)}` : '';
    return request(`/lectures/${lectureId}/confusion-groups${query}`);
  },

  // Doubts
  submitDoubt: (lectureId, text, studentHash) => request('/doubts', {
    method: 'POST',
    body: JSON.stringify({ lecture_id: lectureId, text, student_hash: studentHash })
  }),
  upvoteDoubt: (doubtId, studentHash) => request('/doubts/upvote', {
    method: 'POST',
    body: JSON.stringify({ doubt_id: doubtId, student_hash: studentHash })
  }),

  // Mark Explained
  toggleMarkExplained: (groupId) => request(`/confusion-groups/${groupId}/mark-explained`, {
    method: 'PUT'
  }),

  // AI Re-Explanation
  getExplanation: (groupId) => request(`/confusion-groups/${groupId}/explanation`),
  generateExplanation: (groupId, teacherNote = null) => request(`/confusion-groups/${groupId}/generate-explanation`, {
    method: 'POST',
    body: JSON.stringify({ confusion_group_id: groupId, teacher_prompt_override: teacherNote })
  }),
  updateExplanation: (groupId, data) => request(`/confusion-groups/${groupId}/explanation`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Analytics
  getClassroomAnalytics: (code) => request(`/classrooms/${encodeURIComponent(code)}/analytics`),

  // Demo Reset
  resetDemoData: () => request('/demo/reset', { method: 'POST' })
};
