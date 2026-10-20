import React, { useState, useEffect } from 'react';

const AdminDashboard = ({ userData }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todaysAttendance: 0,
    pendingLeaves: 0,
    payrollAmount: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    // Fake API calls (replace with real API later)
    setStats({
      totalEmployees: 156,
      todaysAttendance: 142,
      pendingLeaves: 8,
      payrollAmount: 75420
    });

    setRecentActivities([
      { id: 1, action: 'New employee registered', user: 'Sarah Johnson', time: '10:30 AM' },
      { id: 2, action: 'Leave approved', user: 'Mike Chen', time: '09:15 AM' },
      { id: 3, action: 'Payroll processed', user: 'Finance Dept', time: '08:45 AM' }
    ]);
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-purple-600',
      green: 'from-green-500 to-emerald-600',
      orange: 'from-pink-500 to-red-500',
      purple: 'from-cyan-500 to-blue-500'
    };
    
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white text-2xl`}>
            <i className={icon}></i>
          </div>
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
            {subtitle && <span className="text-xs text-gray-400 mt-1 block">{subtitle}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-800 p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-xl text-white/90">Welcome back, {userData?.name || userData?.fullName || 'Administrator'} 👋</p>
      </header>

      {/* Stats */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon="fas fa-users"
            color="blue"
            subtitle="+5 this month"
          />
          <StatCard
            title="Today's Attendance"
            value={`${stats.todaysAttendance}/${stats.totalEmployees}`}
            icon="fas fa-calendar-check"
            color="green"
            subtitle="89% Present"
          />
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves}
            icon="fas fa-clipboard-list"
            color="orange"
            subtitle="Require attention"
          />
          <StatCard
            title="Payroll Summary"
            value={`$${stats.payrollAmount.toLocaleString()}`}
            icon="fas fa-chart-line"
            color="purple"
            subtitle="This month"
          />
        </div>
      </section>

      {/* Analytics */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/95 backdrop-blur rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">📊 Attendance Trends</h3>
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-purple-500">
                <option>This Week</option>
                <option>This Month</option>
                <option>This Quarter</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-400">[Attendance Chart Placeholder]</p>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">🗓 Leave Statistics</h3>
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-purple-500">
                <option>This Month</option>
                <option>This Quarter</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-400">[Leave Distribution Chart Placeholder]</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activities */}
      <section className="mb-8">
        <div className="bg-white/95 backdrop-blur rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">🔔 Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <i className="fas fa-bell"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{activity.action}</p>
                  <span className="text-sm text-gray-600">{activity.user}</span>
                </div>
                <span className="text-sm text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-white mb-4">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-user-plus text-3xl text-indigo-600"></i>
            <span className="font-medium text-gray-800">Add Employee</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-file-invoice-dollar text-3xl text-indigo-600"></i>
            <span className="font-medium text-gray-800">Process Payroll</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-chart-bar text-3xl text-indigo-600"></i>
            <span className="font-medium text-gray-800">Generate Reports</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-cog text-3xl text-indigo-600"></i>
            <span className="font-medium text-gray-800">System Settings</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
