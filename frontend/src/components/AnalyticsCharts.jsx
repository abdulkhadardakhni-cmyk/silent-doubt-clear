import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsCharts({ analyticsData }) {
  if (!analyticsData) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
        <p className="text-sm text-slate-500">Loading lecture analytics...</p>
      </div>
    );
  }

  const { lecture_history, top_overall_topics } = analyticsData;

  // 1. Data for Most Confusing Topics Bar Chart
  const topicsLabels = (top_overall_topics || []).map(t => {
    const label = t.topic_label;
    return label.length > 25 ? label.substring(0, 25) + '...' : label;
  });
  
  const topicsImpact = (top_overall_topics || []).map(t => t.total_affected);
  const topicsDoubts = (top_overall_topics || []).map(t => t.doubts_count);
  const topicsUpvotes = (top_overall_topics || []).map(t => t.upvotes_count);

  const barChartData = {
    labels: topicsLabels,
    datasets: [
      {
        label: 'Total Students Confused',
        data: topicsImpact,
        backgroundColor: [
          'rgba(245, 158, 11, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(168, 85, 247, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(239, 68, 68, 0.85)',
        ],
        borderRadius: 8,
      }
    ]
  };

  const barChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11, weight: '600' } }
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: '600' } }
      }
    }
  };

  // 2. Data for Lecture Progression Line Chart
  const lectureLabels = (lecture_history || []).map(l => `Lec ${l.lecture_number}`);
  const lectureDoubts = (lecture_history || []).map(l => l.total_doubts);
  const lectureUpvotes = (lecture_history || []).map(l => l.total_upvotes);

  const lineChartData = {
    labels: lectureLabels,
    datasets: [
      {
        label: 'Doubts Asked',
        data: lectureDoubts,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointRadius: 5,
      },
      {
        label: 'Me Too Upvotes',
        data: lectureUpvotes,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 5,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { size: 12, weight: 'bold' }, usePointStyle: true, boxWidth: 6 }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        cornerRadius: 8,
        padding: 10
      }
    },
    scales: {
      x: { grid: { color: '#f1f5f9' } },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Most Confusing Topics Bar Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Most Confusing Topics (Student Demand)
            </h4>
            <p className="text-xs text-slate-500">
              Aggregated across all lecture sessions
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72">
          {top_overall_topics?.length > 0 ? (
            <Bar data={barChartData} options={barChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No topic data recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Changes Across Lectures Line Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
              Confusion Activity Across Lectures
            </h4>
            <p className="text-xs text-slate-500">
              Volume of doubts & "Me Too" votes per lecture
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72">
          {lecture_history?.length > 0 ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No lecture progression history recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
