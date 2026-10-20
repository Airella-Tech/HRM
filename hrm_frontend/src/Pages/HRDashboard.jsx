import React, { useState, useEffect } from 'react';

const HRDashboard = ({ userData }) => {
  const [employees, setEmployees] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    newHires: 0,
    probationEmployees: 0
  });

  useEffect(() => {
    // Simulate API calls
    const fetchHRData = async () => {
      setEmployees([
        { id: 1, name: 'John Doe', role: 'Senior Developer', department: 'IT', status: 'Active' },
        { id: 2, name: 'Jane Smith', role: 'UX Designer', department: 'Design', status: 'Active' },
        { id: 3, name: 'Mike Johnson', role: 'HR Specialist', department: 'HR', status: 'Active' }
      ]);

      setPendingLeaves([
        { id: 1, employee: 'John Doe', type: 'Sick Leave', dates: 'Dec 15-16, 2024', status: 'Pending' },
        { id: 2, employee: 'Sarah Wilson', type: 'Annual Leave', dates: 'Dec 20-25, 2024', status: 'Pending' }
      ]);

      setStats({
        activeEmployees: 142,
        newHires: 5,
        probationEmployees: 3
      });
    };

    fetchHRData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-green-600 to-emerald-700 p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">HR Dashboard</h1>
        <p className="text-xl text-white/90">Human Resources Management - Welcome, {userData?.name || userData?.fullName || 'HR Manager'}</p>
      </header>

      {/* HR Statistics */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-green-600 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-user-check"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800">{stats.activeEmployees}</h3>
                <p className="text-sm text-gray-600 mt-1">Active Employees</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-user-plus"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800">{stats.newHires}</h3>
                <p className="text-sm text-gray-600 mt-1">New Hires This Month</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800">{stats.probationEmployees}</h3>
                <p className="text-sm text-gray-600 mt-1">Under Probation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Employee Management Section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee List */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Recent Employees</h3>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map(employee => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                          <span className="text-sm font-medium text-gray-800">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{employee.role}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{employee.department}</td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          {employee.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Pending Leave Requests</h3>
              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">{pendingLeaves.length}</span>
            </div>
            <div className="space-y-4">
              {pendingLeaves.map(leave => (
                <div key={leave.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{leave.employee}</h4>
                    <p className="text-sm text-gray-600">{leave.type} • {leave.dates}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">Approve</button>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick HR Actions */}
      <section className="mb-8">
        <h3 className="text-2xl font-semibold text-white mb-4">HR Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-user-edit text-3xl text-teal-600"></i>
            <span className="font-medium text-gray-800">Employee Onboarding</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-file-contract text-3xl text-teal-600"></i>
            <span className="font-medium text-gray-800">Contract Management</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-chart-line text-3xl text-teal-600"></i>
            <span className="font-medium text-gray-800">HR Analytics</span>
          </button>
          <button className="bg-white rounded-xl p-6 flex flex-col items-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <i className="fas fa-calendar-alt text-3xl text-teal-600"></i>
            <span className="font-medium text-gray-800">Leave Management</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default HRDashboard;
