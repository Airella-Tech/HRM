import { Routes, Route } from "react-router-dom";
import Login from "./Pages/login.jsx";
import Hero from "./Pages/hero.jsx";
import About from "./Pages/about.jsx";
import Services from "./Pages/services.jsx";
import Blog from "./Pages/blog.jsx";
import Contact from "./Pages/contact.jsx";
import CreateAccount from "./Pages/createaccount.jsx";
import ForgotPassword from "./Pages/forgotpassword.jsx";
import ResetPassword from "./Pages/resetpassword.jsx";
import EmployeeDashboard from "./Pages/employee/Dashboard.jsx";
import HRDashboard from "./Pages/hr/Dashboard.jsx";
import AdminDashboard from "./Pages/admin/Dashboard.jsx";
import Attendance from "./Pages/employee/Attendance.jsx";
import Leave from "./Pages/employee/Leave.jsx";
import Payslip from "./Pages/employee/Payslip.jsx";
import Profile from "./Pages/employee/Profile.jsx";
import HRAttendance from "./Pages/hr/Attendance.jsx";
import HRLeave from "./Pages/hr/Leave.jsx";
import HRPayslip from "./Pages/hr/Payslip.jsx";
import HRSalaryAssign from "./Pages/hr/SalaryAssign.jsx";
import HRIndividualAllowance from "./Pages/hr/IndividualAllowance.jsx";
import HRAllowanceRequests from "./Pages/hr/AllowanceRequests.jsx";
import HRProfile from "./Pages/hr/Profile.jsx";
import HRDepartment from "./Pages/hr/Department.jsx";
import HREmployee from "./Pages/hr/Employee.jsx";
import HRReport from "./Pages/hr/Report.jsx";
import HRNotifications from "./Pages/hr/Notifications.jsx";
import HRLeaveTypes from "./Pages/hr/LeaveTypes.jsx";
import HRLeaveAssign from "./Pages/hr/LeaveAssign.jsx";
import HREmploymentTypes from "./Pages/hr/EmploymentTypes.jsx";
import AdminAttendance from "./Pages/admin/Attendance.jsx";
import AdminLeave from "./Pages/admin/Leave.jsx";
import AdminPayslip from "./Pages/admin/Payslip.jsx";
import AdminProfile from "./Pages/admin/Profile.jsx";
import Companies from "./Pages/admin/Companies.jsx";
import AdminSystemUsers from "./Pages/admin/SystemUser.jsx";
import AdminSystemConfig from "./Pages/admin/SystemConfig.jsx";


import RecruitmentDashboard from "./Pages/recruitment/Dashboard.jsx";
import RecruitmentVacancies from "./Pages/recruitment/Vacancies.jsx";
import RecruitmentApplications from "./Pages/recruitment/Applications.jsx";
import RecruitmentApplicationReview from "./Pages/recruitment/ApplicationReview.jsx";
import RecruitmentCandidateShortlist from "./Pages/recruitment/CandidateShortlist.jsx";
import RecruitmentResumeDownload from "./Pages/recruitment/ResumeDownload.jsx";
import RecruitmentCandidates from "./Pages/recruitment/Candidates.jsx";
import RecruitmentInterviews from "./Pages/recruitment/Interviews.jsx";
import RecruitmentEvaluations from "./Pages/recruitment/Evaluations.jsx";
import RecruitmentOffers from "./Pages/recruitment/Offers.jsx";
import RecruitmentReports from "./Pages/recruitment/Reports.jsx";
import RecruitmentRolesPermissions from "./Pages/hr/RecruitmentRolesPermissions.jsx";
import Careers from "./Pages/careers/Careers.jsx";
import CareerJob from "./Pages/careers/CareerJob.jsx";
import CareerTrack from "./Pages/careers/CareerTrack.jsx";
import RecruitmentRouteGuard from "./Pages/recruitment/RecruitmentRouteGuard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/careers/jobs/:id" element={<CareerJob />} />
      <Route path="/careers/track" element={<CareerTrack />} />
      <Route path="/createaccount" element={<CreateAccount />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
      <Route path="/employee/attendance" element={<Attendance />} />
      <Route path="/employee/leave" element={<Leave />} />
      <Route path="/employee/payslip" element={<Payslip />} />
      <Route path="/employee/profile" element={<Profile />} />
      <Route path="/hr/dashboard" element={<HRDashboard />} />
      <Route path="/hr/departments" element={<HRDepartment />} />
      <Route path="/hr/department" element={<HRDepartment />} />
      <Route path="/hr/employees" element={<HREmployee />} />
      <Route path="/hr/employee" element={<HREmployee />} />
      <Route path="/hr/attendance" element={<HRAttendance />} />
      <Route path="/hr/leave" element={<HRLeave />} />
      <Route path="/hr/leave/types" element={<HRLeaveTypes />} />
      <Route path="/hr/leave/assign" element={<HRLeaveAssign />} />
      <Route path="/hr/leave/employment-types" element={<HREmploymentTypes />} />
      <Route path="/hr/payslip" element={<HRPayslip />} />
      <Route path="/hr/payroll/salaries" element={<HRSalaryAssign />} />
      <Route path="/hr/payroll/individual-allowance" element={<HRIndividualAllowance />} />
      <Route path="/hr/payroll/allowance-requests" element={<HRAllowanceRequests />} />
      <Route path="/hr/report" element={<HRReport />} />
      <Route path="/hr/reports" element={<HRReport />} />
      <Route path="/hr/notifications" element={<HRNotifications />} />
      <Route path="/hr/profile" element={<HRProfile />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/attendance" element={<AdminAttendance />} />
      <Route path="/admin/leave" element={<AdminLeave />} />
      <Route path="/admin/payslip" element={<AdminPayslip />} />
      <Route path="/admin/profile" element={<AdminProfile />} />
      <Route path="/admin/companies" element={<Companies />} />
      <Route path="/admin/system-users" element={<AdminSystemUsers />} />
      <Route path="/admin/system-config" element={<AdminSystemConfig />} />

      <Route path="/recruitment/dashboard" element={<RecruitmentDashboard />} />
      <Route path="/recruitment/vacancies" element={<RecruitmentVacancies />} />
      <Route path="/recruitment/applications" element={<RecruitmentApplications />} />
      <Route path="/recruitment/applications/review" element={<RecruitmentApplicationReview />} />
      <Route path="/recruitment/applications/shortlist" element={<RecruitmentCandidateShortlist />} />
      <Route path="/recruitment/applications/resumes" element={<RecruitmentResumeDownload />} />
      <Route path="/recruitment/review-applications" element={<RecruitmentApplicationReview />} />
      <Route path="/recruitment/shortlist" element={<RecruitmentCandidateShortlist />} />
      <Route path="/recruitment/resumes" element={<RecruitmentResumeDownload />} />
      <Route path="/recruitment/candidates" element={<RecruitmentCandidates />} />
      <Route path="/recruitment/interviews" element={<RecruitmentInterviews />} />
      <Route path="/recruitment/evaluations" element={<RecruitmentEvaluations />} />
      <Route path="/recruitment/offers" element={<RecruitmentOffers />} />
      <Route path="/recruitment/reports" element={<RecruitmentReports />} />

      <Route path="/recruitment/roles-permissions" element={<RecruitmentRolesPermissions />}/>
      <Route path="/hr/roles-permissions" element={<RecruitmentRolesPermissions />}/>
    </Routes>
  );
}

export default App;
