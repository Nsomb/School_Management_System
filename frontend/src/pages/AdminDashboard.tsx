// src/features/dashboard/pages/AdminDashboard.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* -------------------- helpers -------------------- */

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

const getFirstName = (fullName?: string, username?: string): string => {
  if (fullName && fullName.trim()) return fullName.trim().split(' ')[0];
  if (username) return username;
  return 'Admin';
};

const formatToday = (): string =>
  new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/* -------------------- component -------------------- */

const AdminDashboard = () => {
  const { user } = useAuth();
  const firstName = getFirstName(user?.full_name, user?.username);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* WELCOME BANNER */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 right-24 w-32 h-32 bg-white/5 rounded-full -mb-12 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          <p className="text-xs sm:text-sm font-medium tracking-widest text-blue-100 uppercase">
            Administrator Console
          </p>

          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
            {getGreeting()}, {firstName} 👋
          </h1>

          <p className="mt-2 text-sm sm:text-base text-blue-100 max-w-2xl">
            Welcome back. Everything you need is one click away.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-blue-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System online
            </span>
            <span className="hidden sm:inline opacity-60">•</span>
            <span>{formatToday()}</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* QUICK ACTIONS */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <QuickLink
            to="/admin/students"
            icon="🎓"
            title="Students"
            description="Manage enrollment"
            color="from-blue-500 to-blue-600"
          />
          <QuickLink
            to="/admin/teachers"
            icon="👨‍🏫"
            title="Teachers"
            description="Manage staff"
            color="from-purple-500 to-purple-600"
          />
          <QuickLink
            to="/admin/classes"
            icon="🏫"
            title="Classes"
            description="Class setup"
            color="from-emerald-500 to-emerald-600"
          />
          <QuickLink
            to="/admin/report-card"
            icon="📄"
            title="Report Cards"
            description="Generate reports"
            color="from-pink-500 to-rose-600"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* ACCOUNT SUMMARY */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-base sm:text-lg text-gray-800">
            Your Account
          </h2>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Signed in as" value={user?.full_name || user?.username || '—'} />
          <InfoRow label="Username" value={user?.username || '—'} />
          <InfoRow label="Role" value={user?.role ? user.role.toUpperCase() : '—'} />
        </div>
      </div>
    </div>
  );
};

/* -------------------- small presentational components -------------------- */

interface QuickLinkProps {
  to: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const QuickLink: React.FC<QuickLinkProps> = ({ to, icon, title, description, color }) => (
  <Link
    to={to}
    className="group bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
  >
    <div
      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow-sm`}
    >
      <span aria-hidden>{icon}</span>
    </div>
    <h3 className="mt-3 font-semibold text-sm sm:text-base text-gray-800 group-hover:text-blue-700">
      {title}
    </h3>
    <p className="mt-0.5 text-xs text-gray-500">{description}</p>
  </Link>
);

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">
      {label}
    </span>
    <span className="mt-0.5 text-gray-800 font-medium truncate" title={value}>
      {value}
    </span>
  </div>
);

export default AdminDashboard;