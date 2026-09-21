// src/pages/TeacherDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useMarks } from '../features/marks/hooks/useMarks';
import { useAuth } from '../context/AuthContext';

// ─── Feature flags (flip to false to hide) ──────────────
const SHOW_SUBJECTS_CARD = true;
const SHOW_STUDENTS_CARD = false;   // ← hidden per your request

const TeacherDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTeacherSubjects, getStudentsByClass } = useMarks();

  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalStudents: 0,
    recentActivity: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch teacher's assigned subjects
      const subjects = await getTeacherSubjects();

      // 2. Collect UNIQUE student IDs across all assigned classes
      const studentIdSet = new Set<number>();
      const processedClassIds = new Set<number>();

      if (Array.isArray(subjects)) {
        for (const subject of subjects) {
          if (subject.classes && Array.isArray(subject.classes)) {
            for (const cls of subject.classes) {
              // Skip classes we've already fetched — prevents duplicate API calls
              if (processedClassIds.has(cls.id)) continue;
              processedClassIds.add(cls.id);

              const students = await getStudentsByClass(cls.id);
              for (const s of students) {
                studentIdSet.add(s.id);   // Set deduplicates automatically
              }
            }
          }
        }
      }

      // 3. Update state with the deduplicated counts
      setStats({
        totalSubjects: Array.isArray(subjects) ? subjects.length : 0,
        totalStudents: studentIdSet.size,   // ← now the true unique count
        recentActivity: [],
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const navCards = [
    {
      id: 'marks',
      title: 'Marks',
      description: 'Submit and manage student marks',
      action: 'Go to Marks →',
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      path: '/teacher/marks',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'Take and view class attendance',
      action: 'Record Attendance →',
      icon: UsersIcon,
      color: 'green',
      path: '/teacher/attendance',
    },
    {
      id: 'questions',
      title: 'Questions',
      description: 'Upload and manage exam questions',
      action: 'Manage Questions →',
      icon: DocumentTextIcon,
      color: 'purple',
      path: '/teacher/questions',
    },
    {
      id: 'statistics',
      title: 'Statistics',
      description: 'View detailed performance reports',
      action: 'View Reports →',
      icon: ChartBarIcon,
      color: 'orange',
      path: '/teacher/statistics',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── Welcome Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.full_name?.split(' ')[0] || 'Teacher'}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            {SHOW_SUBJECTS_CARD && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                <BookOpenIcon className="h-4 w-4 text-blue-500" />
                <span>
                  {stats.totalSubjects}{' '}
                  {stats.totalSubjects === 1 ? 'Subject' : 'Subjects'}
                </span>
              </div>
            )}

            {SHOW_STUDENTS_CARD && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                <UserGroupIcon className="h-4 w-4 text-green-500" />
                <span>
                  {stats.totalStudents}{' '}
                  {stats.totalStudents === 1 ? 'Student' : 'Students'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Navigation Cards ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((card) => {
            const IconComponent = card.icon;
            const colorClasses = {
              blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
              green: 'bg-green-50 hover:bg-green-100 text-green-600',
              purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
              orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600',
            };

            return (
              <div
                key={card.id}
                onClick={() => navigateTo(card.path)}
                className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group border border-gray-100 hover:border-transparent"
              >
                <div
                  className={`${colorClasses[card.color as keyof typeof colorClasses]} p-3 rounded-lg inline-block mb-3`}
                >
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                <div className="mt-3 flex items-center text-sm font-medium text-blue-600 group-hover:underline">
                  {card.action}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Recent Activity (optional) ─────────────────── */}
        {stats.recentActivity.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {stats.recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                    <p className="text-xs text-gray-400">{activity.subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Outlet />
      </div>
    </div>
  );
};

export default TeacherDashboardPage;