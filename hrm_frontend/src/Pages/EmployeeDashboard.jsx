import React, { useState, useEffect } from 'react';

const EmployeeDashboard = ({ userData }) => {
  const [attendance, setAttendance] = useState({});
  const [leaveBalance, setLeaveBalance] = useState({});
  const [recentPayslips, setRecentPayslips] = useState([]);

  useEffect(() => {
    // Simulated API
    setAttendance({
      todayStatus: 'Present',
      clockIn: '09:00 AM',
      clockOut: '06:00 PM',
      hoursWorked: '9.0'
    });

    setLeaveBalance({
      casual: 12,
      sick: 8,
      annual: 18
    });

    setRecentPayslips([
      { id: 1, month: 'December 2025', amount: '$4,500', status: 'Processed' },
      { id: 2, month: 'November 2025', amount: '$4,500', status: 'Processed' }
    ]);
  }, []);

  const QuickActionButton = ({ icon, label, onClick, variant }) => {
    const colorClasses = {
      primary: 'text-cyan-500',
      secondary: 'text-indigo-600',
      success: 'text-green-500',
      info: 'text-pink-500'
    };
    
    return (
      <button 
        className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        onClick={onClick}
      >
        <i className={`${icon} text-3xl ${colorClasses[variant]}`}></i>
        <span className="font-medium text-gray-800">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {userData?.name || userData?.fullName || 'Employee'}
          </h1>
          <p className="text-xl text-white/90">Here's your overview for today 🚀</p>
        </div>
        <div className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg ${
          attendance.todayStatus?.toLowerCase() === 'present' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <i className="fas fa-user-clock text-xl"></i>
          <span className="font-semibold">{attendance.todayStatus}</span>
        </div>
      </header>

      {/* Attendance */}
      <section className="mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Today's Attendance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <label className="block text-sm text-gray-600 mb-2">Clock In</label>
              <span className="text-2xl font-bold text-gray-800">{attendance.clockIn}</span>
            </div>
            <div className="text-center">
              <label className="block text-sm text-gray-600 mb-2">Clock Out</label>
              <span className="text-2xl font-bold text-gray-800">{attendance.clockOut}</span>
            </div>
            <div className="text-center">
              <label className="block text-sm text-gray-600 mb-2">Hours Worked</label>
              <span className="text-2xl font-bold text-gray-800">{attendance.hoursWorked} hrs</span>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button className="flex-1 max-w-xs px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 hover:-translate-y-1 transition-all duration-300">Clock In</button>
            <button className="flex-1 max-w-xs px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 hover:-translate-y-1 transition-all duration-300">Clock Out</button>
          </div>
        </div>
      </section>

      {/* Leave Balance */}
      <section className="mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Leave Balance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl mb-4">
                <i className="fas fa-umbrella-beach"></i>
              </div>
              <span className="text-3xl font-bold text-gray-800">{leaveBalance.casual}</span>
              <span className="text-sm text-gray-600 mt-1">Casual</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center text-white text-2xl mb-4">
                <i className="fas fa-heartbeat"></i>
              </div>
              <span className="text-3xl font-bold text-gray-800">{leaveBalance.sick}</span>
              <span className="text-sm text-gray-600 mt-1">Sick</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-2xl mb-4">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <span className="text-3xl font-bold text-gray-800">{leaveBalance.annual}</span>
              <span className="text-sm text-gray-600 mt-1">Annual</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton icon="fas fa-fingerprint" label="Clock In/Out" variant="primary" />
          <QuickActionButton icon="fas fa-calendar-plus" label="Apply Leave" variant="secondary" />
          <QuickActionButton icon="fas fa-file-invoice" label="View Payslip" variant="success" />
          <QuickActionButton icon="fas fa-user-edit" label="Update Profile" variant="info" />
        </div>
      </section>

      {/* Payslips */}
      <section className="mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">Recent Payslips</h3>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {recentPayslips.map(payslip => (
              <div key={payslip.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{payslip.month}</h4>
                  <p className="text-sm text-gray-600">{payslip.amount}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    {payslip.status}
                  </span>
                  <button className="w-10 h-10 flex items-center justify-center bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 hover:-translate-y-1 transition-all duration-300">
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmployeeDashboard;
