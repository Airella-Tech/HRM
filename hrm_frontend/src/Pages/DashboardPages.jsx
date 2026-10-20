import React, { useState, useContext } from "react";
import {
  CalendarDays,
  CheckSquare,
  Users,
  User,
  Clock,
  TrendingUp,
  Award,
  FileText,
  Bell,
  Lock,
  Globe,
  Palette,
  Mail,
  Shield,
  Plus,
  Filter,
  Download,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

// Import UserContext (assuming it's exported from dashboard.jsx or create a separate context file)
// For now, I'll create a placeholder
const UserContext = React.createContext();

// ============================================
// OVERVIEW PAGE
// ============================================
export const OverviewContent = ({ user, setActiveMenu }) => {
  const stats = [
    { name: "Days Off Taken", value: 8, total: 25, color: "bg-gradient-to-br from-blue-500 to-blue-600", icon: CalendarDays },
    { name: "Remaining Leave", value: 17, total: 25, color: "bg-gradient-to-br from-green-500 to-green-600", icon: CheckSquare },
    { name: "Pending Tasks", value: 3, total: 10, color: "bg-gradient-to-br from-yellow-500 to-yellow-600", icon: CheckSquare },
    { name: "Team Members", value: 24, color: "bg-gradient-to-br from-purple-500 to-purple-600", icon: Users },
  ];

  const announcements = [
    { title: "End-of-Year Performance Reviews", date: "Nov 10", type: "important" },
    { title: "New Holiday Policy Update", date: "Nov 5", type: "info" },
    { title: "Office Thanksgiving Potluck", date: "Nov 2", type: "event" },
  ];

  const recentActivity = [
    { action: "Leave request approved", time: "2 hours ago" },
    { action: "Task completed: Q4 Report", time: "5 hours ago" },
    { action: "Profile updated", time: "1 day ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-2">
          Welcome back, {user?.fullName?.split(" ")[0]}! 👋
        </h2>
        <p className="text-blue-100">Here's what's happening with your work today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.total && (
                <span className="text-xs text-gray-500">of {stat.total}</span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm font-medium text-gray-500">{stat.name}</p>
            {stat.total && (
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${stat.color}`}
                  style={{ width: `${(stat.value / stat.total) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📢 Announcements</h3>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all</button>
          </div>
          <div className="space-y-4">
            {announcements.map((item) => (
              <div key={item.title} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === 'important' ? 'bg-red-100 text-red-600' :
                        item.type === 'event' ? 'bg-green-100 text-green-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setActiveMenu?.("My Leave")}
                className="w-full text-left p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg text-blue-700 font-medium transition-all transform hover:scale-105 flex items-center justify-between group"
              >
                <span>Request Time Off</span>
                <CalendarDays className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setActiveMenu?.("Tasks")}
                className="w-full text-left p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg text-purple-700 font-medium transition-all transform hover:scale-105 flex items-center justify-between group"
              >
                <span>View My Tasks</span>
                <CheckSquare className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setActiveMenu?.("My Profile")}
                className="w-full text-left p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg text-green-700 font-medium transition-all transform hover:scale-105 flex items-center justify-between group"
              >
                <span>Update Profile</span>
                <User className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🕐 Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TASKS PAGE
// ============================================
export const TasksContent = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Complete Q4 Performance Report", priority: "high", status: "in-progress", dueDate: "2026-01-25", category: "Reports" },
    { id: 2, title: "Review Team Budget Proposal", priority: "medium", status: "pending", dueDate: "2026-01-22", category: "Finance" },
    { id: 3, title: "Update Employee Handbook", priority: "low", status: "pending", dueDate: "2026-01-30", category: "Documentation" },
    { id: 4, title: "Prepare Presentation for Stakeholders", priority: "high", status: "in-progress", dueDate: "2026-01-21", category: "Meetings" },
    { id: 5, title: "Code Review - Authentication Module", priority: "medium", status: "completed", dueDate: "2026-01-18", category: "Development" },
  ]);

  const [filter, setFilter] = useState("all");
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  const statusStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "pending": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{statusStats.total}</p>
            </div>
            <CheckSquare className="w-10 h-10 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{statusStats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-gray-900">{statusStats.inProgress}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{statusStats.completed}</p>
            </div>
            <Award className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {["all", "pending", "in-progress", "completed"].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === status 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "in-progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task title"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Select Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Category"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Task
            </button>
            <button 
              onClick={() => setShowNewTaskForm(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                  <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {task.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MY LEAVE PAGE
// ============================================
export const LeaveContent = () => {
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 1, type: "Vacation", startDate: "2026-02-10", endDate: "2026-02-14", days: 5, status: "approved", reason: "Family vacation" },
    { id: 2, type: "Sick Leave", startDate: "2026-01-15", endDate: "2026-01-15", days: 1, status: "approved", reason: "Medical appointment" },
    { id: 3, type: "Personal", startDate: "2026-03-05", endDate: "2026-03-06", days: 2, status: "pending", reason: "Personal matters" },
  ]);

  const [showRequestForm, setShowRequestForm] = useState(false);

  const leaveBalance = {
    total: 25,
    used: 8,
    pending: 2,
    remaining: 15,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <CalendarDays className="w-10 h-10 mb-3 opacity-80" />
          <p className="text-3xl font-bold">{leaveBalance.total}</p>
          <p className="text-blue-100">Total Allowance</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
          <p className="text-sm text-gray-600">Days Used</p>
          <p className="text-3xl font-bold text-gray-900">{leaveBalance.used}</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-red-500" style={{ width: `${(leaveBalance.used / leaveBalance.total) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
          <p className="text-sm text-gray-600">Pending Approval</p>
          <p className="text-3xl font-bold text-gray-900">{leaveBalance.pending}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <p className="text-sm text-gray-600">Remaining</p>
          <p className="text-3xl font-bold text-green-600">{leaveBalance.remaining}</p>
        </div>
      </div>

      {/* Request Leave Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Leave Requests</h2>
        <button 
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">New Leave Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Select Type</option>
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
              <input
                type="number"
                placeholder="Days"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea
                rows="3"
                placeholder="Please provide a reason for your leave request"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Submit Request
            </button>
            <button 
              onClick={() => setShowRequestForm(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Leave History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveRequests.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{leave.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(leave.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {leave.days} {leave.days === 1 ? 'day' : 'days'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {leave.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {leave.status === 'pending' && (
                      <button className="text-red-600 hover:text-red-900 transition-colors">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MY PROFILE PAGE
// ============================================
export const ProfileContent = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user || {});

  const ProfileField = ({ label, value, name, type = "text", editable = true }) => (
    <div className="border-b border-gray-200 pb-4">
      <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
      {isEditing && editable ? (
        <input
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <p className="text-md text-gray-900">{value || 'N/A'}</p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-6">
          <img
            src={`https://ui-avatars.com/api/?name=${user?.fullName || 'User'}&background=fff&color=4F46E5&size=100&rounded=true`}
            alt="Profile"
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
          />
          <div>
            <h2 className="text-3xl font-bold">{user?.fullName || 'User Name'}</h2>
            <p className="text-blue-100 mt-1">{user?.email || 'user@example.com'}</p>
            <div className="flex gap-3 mt-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user?.role || 'Employee'}</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{user?.department || 'Department'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
              isEditing 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Edit Profile
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileField label="Full Name" value={user?.fullName} name="fullName" />
          <ProfileField label="Employee ID" value={user?.employeeId} name="employeeId" editable={false} />
          <ProfileField label="Email" value={user?.email} name="email" type="email" />
          <ProfileField label="NIC" value={user?.nic} name="nic" />
          <ProfileField label="Date of Birth" value={user?.dob} name="dob" type="date" />
          <ProfileField label="Gender" value={user?.gender} name="gender" />
          <ProfileField label="Department" value={user?.department} name="department" />
          <ProfileField label="Role" value={user?.role} name="role" editable={false} />
        </div>

        <div className="mt-6">
          <ProfileField label="Address" value={user?.address} name="address" />
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h4 className="text-lg font-bold text-gray-900 mb-4">🏆 Performance</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overall Rating</span>
              <span className="font-bold text-gray-900">4.5/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Projects Completed</span>
              <span className="font-bold text-gray-900">24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Years with Company</span>
              <span className="font-bold text-gray-900">3 years</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h4 className="text-lg font-bold text-gray-900 mb-4">📞 Contact</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{user?.department || 'N/A'} Department</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{user?.role || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SETTINGS PAGE
// ============================================
export const SettingsContent = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    leaveReminders: true,
    taskReminders: true,
    theme: 'light',
    language: 'en',
    timezone: 'UTC+5:30',
    twoFactorAuth: false,
  });

  const SettingToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-start justify-between py-4 border-b border-gray-200">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settings Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold">⚙️ Settings</h2>
        <p className="text-blue-100 mt-2">Manage your account preferences and settings</p>
      </div>

      {/* Notifications Settings */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
        </div>
        <div className="space-y-2">
          <SettingToggle
            label="Email Notifications"
            description="Receive email notifications for important updates"
            checked={settings.emailNotifications}
            onChange={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
          />
          <SettingToggle
            label="Push Notifications"
            description="Get push notifications on your device"
            checked={settings.pushNotifications}
            onChange={() => setSettings({...settings, pushNotifications: !settings.pushNotifications})}
          />
          <SettingToggle
            label="Leave Reminders"
            description="Get reminded about upcoming leave dates"
            checked={settings.leaveReminders}
            onChange={() => setSettings({...settings, leaveReminders: !settings.leaveReminders})}
          />
          <SettingToggle
            label="Task Reminders"
            description="Receive reminders for pending tasks"
            checked={settings.taskReminders}
            onChange={() => setSettings({...settings, taskReminders: !settings.taskReminders})}
          />
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-4">
              {['light', 'dark', 'auto'].map(theme => (
                <button
                  key={theme}
                  onClick={() => setSettings({...settings, theme})}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    settings.theme === theme 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 capitalize">{theme}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">Regional</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select 
              value={settings.language}
              onChange={(e) => setSettings({...settings, language: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select 
              value={settings.timezone}
              onChange={(e) => setSettings({...settings, timezone: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UTC+5:30">UTC+5:30 (IST)</option>
              <option value="UTC">UTC</option>
              <option value="UTC-5">UTC-5 (EST)</option>
              <option value="UTC-8">UTC-8 (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-red-600" />
          <h3 className="text-xl font-bold text-gray-900">Security</h3>
        </div>
        <div className="space-y-4">
          <SettingToggle
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            checked={settings.twoFactorAuth}
            onChange={() => setSettings({...settings, twoFactorAuth: !settings.twoFactorAuth})}
          />
          <button className="w-full md:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Change Password
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-4">⚠️ Danger Zone</h3>
        <div className="space-y-3">
          <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Deactivate Account
          </button>
          <p className="text-sm text-red-700">
            Once you deactivate your account, there is no going back. Please be certain.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          Save All Changes
        </button>
      </div>
    </div>
  );
};

// Placeholder for Leave Management (Admin)
export const LeaveManagementContent = () => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Leave Management</h2>
      <p className="text-gray-600">Manage all employee leave requests here.</p>
    </div>
  );
};
