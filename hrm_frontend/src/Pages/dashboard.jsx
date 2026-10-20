import React, { useState, useEffect, createContext, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import logo from "../assets/logo.jpg"; // Assuming you have your logo here
import { 
  OverviewContent, 
  TasksContent, 
  LeaveContent, 
  ProfileContent, 
  SettingsContent,
  LeaveManagementContent 
} from "./DashboardPages";
import AdminDashboard from "./AdminDashboard";
import HRDashboard from "./HRDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

// 1. User Context (for easy prop drilling)
const UserContext = createContext();

// 2. Main Dashboard Component
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Overview"); // To control which page is shown
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // 3. Authentication and User Loading
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no user, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  // 4. Logout Function
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // 5. Loading State
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // 6. Main Layout
  return (
    <UserContext.Provider value={{ user, handleLogout, activeMenu, setActiveMenu }}>
      <div className="flex min-h-screen bg-gray-100">
        
        {/* --- Sidebar (Desktop) --- */}
        <Sidebar isOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        {/* --- Mobile Menu Toggle --- */}
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-full shadow-lg"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* --- Sidebar (Mobile) --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative w-72">
              <Sidebar isOpen={true} setSidebarOpen={() => {}} isMobile={true} setMobileMenuOpen={setMobileMenuOpen} />
            </div>
          </div>
        )}

        {/* --- Main Content Area with left margin to account for fixed sidebar --- */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
          <Header />
          
          {/* --- Content based on activeMenu --- */}
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {renderContent(activeMenu, user, setActiveMenu)}
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
};

// 7. Sidebar Component
const Sidebar = ({ isOpen, setSidebarOpen, isMobile = false, setMobileMenuOpen }) => {
  const { user, handleLogout, activeMenu, setActiveMenu } = useContext(UserContext);

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "My Profile", icon: User },
    { name: "My Leave", icon: CalendarDays },
    { name: "Tasks", icon: CheckSquare },
    { name: "Settings", icon: Settings },
  ];

  // Role-based links
  const adminItems = [
    { name: "Employees", icon: Users },
    { name: "Leave Mgt.", icon: CheckSquare },
  ];

  const handleMenuClick = (name) => {
    setActiveMenu(name);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={`
        bg-gray-900 text-white flex flex-col shadow-lg transition-all duration-300
        ${isMobile
          // Mobile classes: Fixed, full-screen overlay
          ? 'fixed top-0 left-0 z-50 h-screen w-72'
          // Desktop classes: Fixed sidebar that stays in place when scrolling
          : `fixed top-0 left-0 h-screen ${isOpen ? 'w-72' : 'w-20'} hidden md:flex`
        }
      `}
    >
      {/* --- Logo and Toggle --- */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-gray-700">
        <img
          src={logo}
          alt="Logo"
          className={`rounded-full transition-all ${isOpen ? "w-10 h-10" : "w-10 h-10"}`}
        />
        {isOpen && (
          <span className="text-xl font-bold text-white flex-1 ml-3">HRM Portal</span>
        )}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!isOpen)}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700"
          >
            {isOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        )}
        {isMobile && (
           <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700"
          >
            <X />
          </button>
        )}
      </div>

      {/* --- Navigation Links --- */}
      <ul className="flex-1 py-4 space-y-2">
        {navItems.map((item) => (
          <SidebarItem
            key={item.name}
            item={item}
            isActive={activeMenu === item.name}
            onClick={handleMenuClick}
            isOpen={isOpen}
          />
        ))}

        {/* --- Role-Based Section --- */}
        {(user.role === "admin" || user.role === "hr_manager") && (
          <>
            <li className={`px-4 pt-4 pb-2 text-xs uppercase text-gray-500 ${!isOpen && "text-center"}`}>
              {isOpen ? "Admin" : "---"}
            </li>
            {adminItems.map((item) => (
              <SidebarItem
                key={item.name}
                item={item}
                isActive={activeMenu === item.name}
                onClick={handleMenuClick}
                isOpen={isOpen}
              />
            ))}
          </>
        )}
      </ul>

      {/* --- Logout Section --- */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full p-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors ${!isOpen && "justify-center"}`}
        >
          <LogOut className="w-6 h-6" />
          {isOpen && <span className="ml-4 font-medium">Logout</span>}
        </button>
      </div>
    </nav>
  );
};

// 8. Sidebar Item Component (No changes)
const SidebarItem = ({ item, isActive, onClick, isOpen }) => {
  return (
    <li className="px-4">
      <Link
        to="#"
        onClick={() => onClick(item.name)}
        className={`flex items-center p-3 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-600 text-white shadow-md"
            : "text-gray-300 hover:bg-gray-700 hover:text-white"
        } ${!isOpen && "justify-center"}`}
      >
        <item.icon className="w-6 h-6" />
        {isOpen && <span className="ml-4 font-medium">{item.name}</span>}
      </Link>
    </li>
  );
};

// 9. Header Component (No changes)
const Header = () => {
  const { user, handleLogout, activeMenu } = useContext(UserContext);
  const [isProfileOpen, setProfileOpen] = useState(false);

  return (
    <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-8">
      {/* --- Page Title --- */}
      <h1 className="text-xl font-semibold text-gray-800">{activeMenu}</h1>
      
      {/* --- Header Controls --- */}
      <div className="flex items-center gap-4">
        {/* --- Search --- */}
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-64 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* --- Notifications --- */}
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="w-6 h-6" />
        </button>
        
        {/* --- Profile Dropdown --- */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2"
          >
            <img
              src={`https://ui-avatars.com/api/?name=${user.fullName}&background=0D8ABC&color=fff&rounded=true&size=40`}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="hidden md:flex flex-col items-start">
              <span className="font-semibold text-sm text-gray-800">{user.fullName}</span>
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen && "rotate-180"}`} />
          </button>
          
          {/* --- Dropdown Menu --- */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-10">
              <Link
                to="#"
                onClick={() => {
                  setActiveMenu("My Profile"); // Also set active menu
                  setProfileOpen(false);
                }}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Profile
              </Link>
              <Link
                to="#"
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// 10. Content Renderer Function
const renderContent = (menu, user, setActiveMenu) => {
  // Check if we're on Overview and route based on user role
  if (menu === "Overview") {
    // Route to specific dashboard based on role
    if (user.role === "admin") {
      return <AdminDashboard userData={user} />;
    } else if (user.role === "hr") {
      return <HRDashboard userData={user} />;
    } else {
      // Default to employee dashboard for "employee" role or any other role
      return <EmployeeDashboard userData={user} />;
    }
  }

  // Other menu items remain the same
  switch (menu) {
    case "My Profile":
      return <ProfileContent user={user} />;
    case "My Leave":
      return <LeaveContent />;
    case "Tasks":
      return <TasksContent />;
    case "Settings":
      return <SettingsContent />;
    case "Employees":
      return <EmployeeContent />;
    case "Leave Mgt.":
      return <LeaveManagementContent />;
    default:
      // Default overview also routes by role
      if (user.role === "admin") {
        return <AdminDashboard userData={user} />;
      } else if (user.role === "hr") {
        return <HRDashboard userData={user} />;
      } else {
        return <EmployeeDashboard userData={user} />;
      }
  }
};

// 11. Employee Content Component
const EmployeeContent = () => {
  const [employees] = useState([
    { id: 1, name: "John Doe", email: "john@example.com", department: "Engineering", role: "employee" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", department: "Marketing", role: "employee" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", department: "Sales", role: "employee" },
    { id: 4, name: "Admin User", email: "admin@example.com", department: "Engineering", role: "admin" },
  ]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Employee Management</h2>
        <Link 
          to="/createaccount"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add New Employee
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    emp.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {emp.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" className="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                  <a href="#" className="text-red-600 hover:text-red-900">Delete</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Dashboard;