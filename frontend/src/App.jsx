import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/ui/Spinner';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

/* Auth — kept eager: needed on cold load / redirect */
import LoginPage          from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import SetupPage          from './pages/SetupPage';
import NotFoundPage       from './pages/NotFoundPage';

/* All other pages — lazy loaded, each gets its own JS chunk */
const DashboardPage          = lazy(() => import('./pages/DashboardPage'));
const TeacherDashboardPage   = lazy(() => import('./pages/TeacherDashboardPage'));
const StudentDashboardPage   = lazy(() => import('./pages/StudentDashboardPage'));
const ParentDashboardPage    = lazy(() => import('./pages/ParentDashboardPage'));
const StudentsPage           = lazy(() => import('./pages/StudentsPage'));
const TeachersPage           = lazy(() => import('./pages/TeachersPage'));
const TeacherDetailPage      = lazy(() => import('./pages/TeacherDetailPage'));
const ClassesPage            = lazy(() => import('./pages/ClassesPage'));
const AdmissionPage          = lazy(() => import('./pages/AdmissionPage'));
const ClassDetailPage        = lazy(() => import('./pages/ClassDetailPage'));
const TimetablePage          = lazy(() => import('./pages/TimetablePage'));
const TimetablePrintPage     = lazy(() => import('./pages/TimetablePrintPage'));
const AttendancePage         = lazy(() => import('./pages/AttendancePage'));
const FeesPage               = lazy(() => import('./pages/FeesPage'));
const SubjectsPage           = lazy(() => import('./pages/SubjectsPage'));
const ExamsPage              = lazy(() => import('./pages/ExamsPage'));
const ReportCardPrintPage    = lazy(() => import('./pages/ReportCardPrintPage'));
const PaperPrintPage         = lazy(() => import('./pages/PaperPrintPage'));
const ExamDateSheetPrint     = lazy(() => import('./pages/ExamDateSheetPrint'));
const ExamRollSlipsPrint     = lazy(() => import('./pages/ExamRollSlipsPrint'));
const StudentIdCardPage      = lazy(() => import('./pages/StudentIdCardPage'));
const TeacherIdCardPage      = lazy(() => import('./pages/TeacherIdCardPage'));
const CertificatePrintPage   = lazy(() => import('./pages/CertificatePrintPage'));
const AnnouncementsPage      = lazy(() => import('./pages/AnnouncementsPage'));
const ExpensesPage           = lazy(() => import('./pages/ExpensesPage'));
const TransportPage          = lazy(() => import('./pages/TransportPage'));
const LibraryPage            = lazy(() => import('./pages/LibraryPage'));
const FeeInvoicePrint        = lazy(() => import('./pages/FeeInvoicePrint'));
const FeeReceiptPrint        = lazy(() => import('./pages/FeeReceiptPrint'));
const FeeBulkPrintPage       = lazy(() => import('./pages/FeeBulkPrintPage'));
const FeeDefaultersPrintPage = lazy(() => import('./pages/FeeDefaultersPrintPage'));
const SalaryPage             = lazy(() => import('./pages/SalaryPage'));
const SalarySlipPrintPage    = lazy(() => import('./pages/SalarySlipPrintPage'));
const HomeworkPage           = lazy(() => import('./pages/HomeworkPage'));
const EventsPage             = lazy(() => import('./pages/EventsPage'));
const InventoryPage          = lazy(() => import('./pages/InventoryPage'));
const SettingsPage           = lazy(() => import('./pages/SettingsPage'));
const StudentPerformancePage = lazy(() => import('./pages/StudentPerformancePage'));
const StudentDetailPrintPage = lazy(() => import('./pages/StudentDetailPrintPage'));
const MessagingPage          = lazy(() => import('./pages/MessagingPage'));
const DiaryPage              = lazy(() => import('./pages/DiaryPage'));
const FeeChallanPrint        = lazy(() => import('./pages/FeeChallanPrint'));
const SiblingVoucherPrintPage= lazy(() => import('./pages/SiblingVoucherPrintPage'));
const AttendancePrintPage    = lazy(() => import('./pages/AttendancePrintPage'));
const BoardExamsPage         = lazy(() => import('./pages/BoardExamsPage'));
const IncomePage             = lazy(() => import('./pages/IncomePage'));
const LeavePage              = lazy(() => import('./pages/LeavePage'));
const FeeStructurePrintPage  = lazy(() => import('./pages/FeeStructurePrintPage'));
const StudentFeePage         = lazy(() => import('./pages/StudentFeePage'));
const FeeMonthlySlipPage     = lazy(() => import('./pages/FeeMonthlySlipPage'));
const TeacherDetailPrintPage = lazy(() => import('./pages/TeacherDetailPrintPage'));
const SyllabusPage           = lazy(() => import('./pages/SyllabusPage'));
const FinancialAnalyticsPage = lazy(() => import('./pages/FinancialAnalyticsPage'));
const AnnualReportPage       = lazy(() => import('./pages/AnnualReportPage'));
const CustomReportPage       = lazy(() => import('./pages/CustomReportPage'));
const LateArrivalsPage       = lazy(() => import('./pages/LateArrivalsPage'));
const MedicalRecordsPage     = lazy(() => import('./pages/MedicalRecordsPage'));
const CanteenPage            = lazy(() => import('./pages/CanteenPage'));
const MeetingsPage           = lazy(() => import('./pages/MeetingsPage'));
const MeetingsPrintPage      = lazy(() => import('./pages/MeetingsPrintPage'));
const ScholarshipsPage       = lazy(() => import('./pages/ScholarshipsPage'));
const AlumniPage             = lazy(() => import('./pages/AlumniPage'));
const RolloverWizardPage     = lazy(() => import('./pages/RolloverWizardPage'));
const QuizzesPage            = lazy(() => import('./pages/QuizzesPage'));
const QuizTakePage           = lazy(() => import('./pages/QuizTakePage'));
const QuizResultsPage        = lazy(() => import('./pages/QuizResultsPage'));
const OnlineClassesPage      = lazy(() => import('./pages/OnlineClassesPage'));
const AcademicCalendarPage   = lazy(() => import('./pages/AcademicCalendarPage'));
const StaffPage              = lazy(() => import('./pages/StaffPage'));
const AutomationPage         = lazy(() => import('./pages/AutomationPage'));
const QuickAttendancePage    = lazy(() => import('./pages/QuickAttendancePage'));
const GradebookPage          = lazy(() => import('./pages/GradebookPage'));
const ParentMessagingPage    = lazy(() => import('./pages/ParentMessagingPage'));
const ParentFeeLedgerPage    = lazy(() => import('./pages/ParentFeeLedgerPage'));
const SuperAdminPage         = lazy(() => import('./pages/SuperAdminPage'));
const OnboardingPage         = lazy(() => import('./pages/OnboardingPage'));
const AtRiskPage             = lazy(() => import('./pages/AtRiskPage'));
const WhatsAppPage           = lazy(() => import('./pages/WhatsAppPage'));
const TimetableGeneratorPage = lazy(() => import('./pages/TimetableGeneratorPage'));
const AuditLogsPage          = lazy(() => import('./pages/AuditLogsPage'));
const SystemHealthPage       = lazy(() => import('./pages/SystemHealthPage'));
const DocsPage               = lazy(() => import('./pages/DocsPage'));
const BillingPage            = lazy(() => import('./pages/BillingPage'));
const DocumentsPage          = lazy(() => import('./pages/DocumentsPage'));
const FeeInstallmentsPage    = lazy(() => import('./pages/FeeInstallmentsPage'));
const FeeAnalyticsPage       = lazy(() => import('./pages/FeeAnalyticsPage'));
const VisitorPage            = lazy(() => import('./pages/VisitorPage'));
const QrAttendancePage       = lazy(() => import('./pages/QrAttendancePage'));
const DisciplinePage         = lazy(() => import('./pages/DisciplinePage'));
const SubstitutionsPage      = lazy(() => import('./pages/SubstitutionsPage'));
const ComplaintsPage         = lazy(() => import('./pages/ComplaintsPage'));
const ExamSeatingPage        = lazy(() => import('./pages/ExamSeatingPage'));
const HostelPage             = lazy(() => import('./pages/HostelPage'));
const BranchesPage           = lazy(() => import('./pages/BranchesPage'));
const BudgetPage             = lazy(() => import('./pages/BudgetPage'));
const WebsiteBuilderPage     = lazy(() => import('./pages/WebsiteBuilderPage'));
const LiveTrackingPage       = lazy(() => import('./pages/LiveTrackingPage'));
const DriverTrackingPage     = lazy(() => import('./pages/DriverTrackingPage'));
const ChatPage               = lazy(() => import('./pages/ChatPage'));
const RolesPage              = lazy(() => import('./pages/RolesPage'));
const StudentLifecyclePage   = lazy(() => import('./pages/StudentLifecyclePage'));
const FeeLedgerPage          = lazy(() => import('./pages/FeeLedgerPage'));
const FeeReceiptVerifyPage   = lazy(() => import('./pages/FeeReceiptVerifyPage'));
const TeacherDocumentPage    = lazy(() => import('./pages/TeacherDocumentPage'));
const StudyPlannerPage       = lazy(() => import('./pages/StudyPlannerPage'));
const OnlinePaymentsPage        = lazy(() => import('./pages/OnlinePaymentsPage'));
const ApprovalWorkflowPage      = lazy(() => import('./pages/ApprovalWorkflowPage'));
/* Redirect / → role-appropriate home */
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (user.role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (user.role === 'parent')  return <Navigate to="/parent-dashboard"  replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/setup"           element={<SetupPage />} />
            <Route path="/onboarding"      element={
              <ProtectedRoute roles={['admin']}>
                <OnboardingPage />
              </ProtectedRoute>
            } />

            {/* Root → smart redirect */}
            <Route path="/" element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            } />

            {/* Role dashboards */}
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute roles={['teacher', 'admin']}>
                <TeacherDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard" element={
              <ProtectedRoute roles={['student', 'admin']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/parent-dashboard" element={
              <ProtectedRoute roles={['parent', 'admin']}>
                <ParentDashboardPage />
              </ProtectedRoute>
            } />

            {/* Academic Calendar — visible to all authenticated roles */}
            <Route path="/calendar" element={
              <ProtectedRoute>
                <AcademicCalendarPage />
              </ProtectedRoute>
            } />

            {/* Admin-only pages */}
            <Route path="/students" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <StudentsPage />
              </ProtectedRoute>
            } />
            <Route path="/students/id-cards" element={
              <ProtectedRoute roles={['admin']}>
                <StudentIdCardPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/id-cards" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherIdCardPage />
              </ProtectedRoute>
            } />
            <Route path="/students/certificate" element={
              <ProtectedRoute roles={['admin']}>
                <CertificatePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers" element={
              <ProtectedRoute roles={['admin']}>
                <TeachersPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/:id" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/:id/print" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherDetailPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/:id/documents" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherDocumentPage />
              </ProtectedRoute>
            } />
            <Route path="/classes" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ClassesPage />
              </ProtectedRoute>
            } />
            <Route path="/classes/:id" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ClassDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/admission/new" element={
              <ProtectedRoute roles={['admin']}>
                <AdmissionPage />
              </ProtectedRoute>
            } />
            <Route path="/admission/edit/:id" element={
              <ProtectedRoute roles={['admin']}>
                <AdmissionPage />
              </ProtectedRoute>
            } />
            <Route path="/timetable" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <TimetablePage />
              </ProtectedRoute>
            } />
            <Route path="/timetable/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <TimetablePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/attendance/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AttendancePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute roles={['admin']}>
                <FeesPage />
              </ProtectedRoute>
            } />
            <Route path="/subjects" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SubjectsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/report-card/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ReportCardPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/papers/:id/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <PaperPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId/date-sheet/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ExamDateSheetPrint />
              </ProtectedRoute>
            } />
            <Route path="/exams/:examId/roll-slips/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ExamRollSlipsPrint />
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AnnouncementsPage />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute roles={['admin']}>
                <ExpensesPage />
              </ProtectedRoute>
            } />
            <Route path="/transport" element={
              <ProtectedRoute roles={['admin']}>
                <TransportPage />
              </ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute roles={['admin']}>
                <LibraryPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/invoice/:id/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeInvoicePrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/invoice/:id/challan" element={
              <ProtectedRoute roles={['admin']}>
                <FeeChallanPrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/sibling-voucher/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SiblingVoucherPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/receipt/:id" element={
              <ProtectedRoute roles={['admin']}>
                <FeeReceiptPrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/bulk-print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeBulkPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/defaulters/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeDefaultersPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/structure/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeStructurePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/student/:id" element={
              <ProtectedRoute roles={['admin']}>
                <StudentFeePage />
              </ProtectedRoute>
            } />
            <Route path="/fees/monthly-slip/:studentId" element={
              <ProtectedRoute roles={['admin']}>
                <FeeMonthlySlipPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/ledger/:studentId" element={
              <ProtectedRoute roles={['admin','teacher']}>
                <FeeLedgerPage />
              </ProtectedRoute>
            } />
            {/* Public receipt verification — no auth required */}
            <Route path="/verify-receipt/:receiptNo" element={<FeeReceiptVerifyPage />} />
            <Route path="/salary" element={
              <ProtectedRoute roles={['admin']}>
                <SalaryPage />
              </ProtectedRoute>
            } />
            <Route path="/salary/slip/:id/print" element={
              <ProtectedRoute roles={['admin']}>
                <SalarySlipPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/homework" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <HomeworkPage />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <EventsPage />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute roles={['admin']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/diary" element={
              <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                <DiaryPage />
              </ProtectedRoute>
            } />
            <Route path="/messaging" element={
              <ProtectedRoute roles={['admin', 'teacher', 'parent', 'student']}>
                <MessagingPage />
              </ProtectedRoute>
            } />
            <Route path="/board-exams" element={
              <ProtectedRoute roles={['admin']}>
                <BoardExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/income" element={
              <ProtectedRoute roles={['admin']}>
                <IncomePage />
              </ProtectedRoute>
            } />
            <Route path="/leaves" element={
              <ProtectedRoute roles={['admin']}>
                <LeavePage />
              </ProtectedRoute>
            } />
            <Route path="/syllabus" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SyllabusPage />
              </ProtectedRoute>
            } />

            <Route path="/students/:id/print" element={<StudentDetailPrintPage />} />
            <Route path="/students/:id/performance" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <StudentPerformancePage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/financial" element={
              <ProtectedRoute roles={['admin']}>
                <FinancialAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/annual-report" element={
              <ProtectedRoute roles={['admin']}>
                <AnnualReportPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/custom-report" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <CustomReportPage />
              </ProtectedRoute>
            } />

            <Route path="/late-arrivals" element={<ProtectedRoute roles={['admin','teacher']}><LateArrivalsPage /></ProtectedRoute>} />
            <Route path="/medical" element={<ProtectedRoute roles={['admin','teacher']}><MedicalRecordsPage /></ProtectedRoute>} />
            <Route path="/canteen" element={<ProtectedRoute roles={['admin']}><CanteenPage /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute roles={['admin','teacher','parent']}><MeetingsPage /></ProtectedRoute>} />
            <Route path="/meetings/print" element={<ProtectedRoute roles={['admin','teacher']}><MeetingsPrintPage /></ProtectedRoute>} />
            <Route path="/scholarships" element={<ProtectedRoute roles={['admin']}><ScholarshipsPage /></ProtectedRoute>} />
            <Route path="/alumni" element={<ProtectedRoute roles={['admin']}><AlumniPage /></ProtectedRoute>} />
            <Route path="/rollover" element={<ProtectedRoute roles={['admin']}><RolloverWizardPage /></ProtectedRoute>} />
            <Route path="/quizzes" element={<ProtectedRoute roles={['admin','teacher']}><QuizzesPage /></ProtectedRoute>} />
            <Route path="/quizzes/:id/take" element={<ProtectedRoute roles={['student']}><QuizTakePage /></ProtectedRoute>} />
            <Route path="/quizzes/attempts/:id/results" element={<ProtectedRoute roles={['admin','teacher','student']}><QuizResultsPage /></ProtectedRoute>} />
            <Route path="/study-planner" element={<ProtectedRoute roles={['admin','teacher','student']}><StudyPlannerPage /></ProtectedRoute>} />

            <Route path="/online-classes" element={
              <ProtectedRoute roles={['admin','teacher','student','parent']}>
                <OnlineClassesPage />
              </ProtectedRoute>
            } />

            <Route path="/staff" element={<ProtectedRoute roles={['admin']}><StaffPage /></ProtectedRoute>} />
            <Route path="/automation" element={<ProtectedRoute roles={['admin']}><AutomationPage /></ProtectedRoute>} />
            <Route path="/quick-attendance" element={<ProtectedRoute roles={['admin','teacher']}><QuickAttendancePage /></ProtectedRoute>} />
            <Route path="/gradebook" element={<ProtectedRoute roles={['admin','teacher']}><GradebookPage /></ProtectedRoute>} />
            <Route path="/parent-messages" element={<ProtectedRoute roles={['parent','admin','teacher']}><ParentMessagingPage /></ProtectedRoute>} />
            <Route path="/parent-fee-ledger" element={<ProtectedRoute roles={['parent','admin']}><ParentFeeLedgerPage /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute superAdminOnly><SuperAdminPage /></ProtectedRoute>} />
            <Route path="/risk"                 element={<ProtectedRoute roles={['admin','teacher']}><AtRiskPage /></ProtectedRoute>} />
            <Route path="/whatsapp"             element={<ProtectedRoute roles={['admin','teacher']}><WhatsAppPage /></ProtectedRoute>} />
            <Route path="/timetable-generator"  element={<ProtectedRoute roles={['admin']}><TimetableGeneratorPage /></ProtectedRoute>} />
            <Route path="/audit-logs"           element={<ProtectedRoute roles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
            <Route path="/system-health"        element={<ProtectedRoute roles={['admin']}><SystemHealthPage /></ProtectedRoute>} />
            <Route path="/docs"                 element={<ProtectedRoute><DocsPage /></ProtectedRoute>} />
            <Route path="/billing"              element={<ProtectedRoute roles={['admin']}><BillingPage /></ProtectedRoute>} />
            <Route path="/roles"                element={<ProtectedRoute roles={['admin']}><RolesPage /></ProtectedRoute>} />
            <Route path="/lifecycle/:studentId" element={<ProtectedRoute><StudentLifecyclePage /></ProtectedRoute>} />
            <Route path="/documents"            element={<ProtectedRoute roles={['admin','teacher']}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/fee-installments"     element={<ProtectedRoute roles={['admin']}><FeeInstallmentsPage /></ProtectedRoute>} />
            <Route path="/fee-analytics"        element={<ProtectedRoute roles={['admin','teacher']}><FeeAnalyticsPage /></ProtectedRoute>} />
            <Route path="/online-payments"      element={<ProtectedRoute roles={['admin']}><OnlinePaymentsPage /></ProtectedRoute>} />
            <Route path="/visitors"             element={<ProtectedRoute roles={['admin','teacher']}><VisitorPage /></ProtectedRoute>} />
            <Route path="/qr-attendance"        element={<ProtectedRoute roles={['admin','teacher']}><QrAttendancePage /></ProtectedRoute>} />
            <Route path="/discipline"           element={<ProtectedRoute roles={['admin','teacher']}><DisciplinePage /></ProtectedRoute>} />
            <Route path="/substitutions"        element={<ProtectedRoute roles={['admin','teacher']}><SubstitutionsPage /></ProtectedRoute>} />
            <Route path="/complaints"           element={<ProtectedRoute><ComplaintsPage /></ProtectedRoute>} />
            <Route path="/exam-seating"         element={<ProtectedRoute roles={['admin']}><ExamSeatingPage /></ProtectedRoute>} />
            <Route path="/hostel"               element={<ProtectedRoute roles={['admin']}><HostelPage /></ProtectedRoute>} />
            <Route path="/branches"             element={<ProtectedRoute roles={['admin']}><BranchesPage /></ProtectedRoute>} />
            <Route path="/budget"               element={<ProtectedRoute roles={['admin']}><BudgetPage /></ProtectedRoute>} />
            <Route path="/website-builder"      element={<ProtectedRoute roles={['admin']}><WebsiteBuilderPage /></ProtectedRoute>} />
            <Route path="/class-chat"           element={<ProtectedRoute roles={['admin','teacher','student']}><ChatPage /></ProtectedRoute>} />
            <Route path="/live-tracking"        element={<ProtectedRoute roles={['admin','parent']}><LiveTrackingPage /></ProtectedRoute>} />
            <Route path="/driver-tracking"      element={<ProtectedRoute roles={['admin','teacher']}><DriverTrackingPage /></ProtectedRoute>} />
            <Route path="/approvals"            element={<ProtectedRoute roles={['admin','parent']}><ApprovalWorkflowPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        {/* Floating chatbot assistant — rendered outside <Routes> so it persists across navigation */}
        <ChatbotWidget />
      </AuthProvider>
    </ThemeProvider>
  );
}
