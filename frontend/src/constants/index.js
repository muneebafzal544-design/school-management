import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Settings,
  CalendarDays,
  ClipboardCheck,
  Banknote,
  Library,
  FileBarChart2,
  Megaphone,
  TrendingDown,
  TrendingUp,
  Bus,
  BookMarked,
  DollarSign,
  NotebookPen,
  CalendarRange,
  Package,
  MessageSquare,
  BookText,
  ListChecks,
  BarChart3,
  FileText,
  Clock,
  Stethoscope,
  ShoppingCart,
  CalendarCheck,
  Award,
  Users2,
  FileCheck,
  Video,
  HardHat,
  Zap,
  BarChart2,
  AlertTriangle,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Activity,
  CreditCard,
  FolderOpen,
  ShieldAlert,
  Layers,
  UserX,
  LayoutGrid,
  Home,
  GitBranch,
  PieChart,
  Globe,
  MapPin,
  Navigation,
  MessagesSquare,
  UserCheck,
  QrCode,
  Smartphone,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  NAV_LINKS
//
//  Two item shapes:
//    Flat link  → { label, to, icon, description, adminChildren? }
//    Group      → { label, icon, color, group: true, children[] }
//
//  adminChildren  — shown only as children of Dashboard for admin role.
//  The corresponding paths (/teacher-dashboard etc.) still live in ROLE_LINKS
//  for non-admin roles which see them as flat Dashboard links.
// ─────────────────────────────────────────────────────────────────────────────
export const NAV_LINKS = [

  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    description: 'Overview & analytics',
    adminChildren: [
      { label: 'Teacher View',  to: '/teacher-dashboard', description: 'Teacher portal view' },
      { label: 'Student View',  to: '/student-dashboard', description: 'Student portal view' },
      { label: 'Parent View',   to: '/parent-dashboard',  description: 'Parent portal view' },
    ],
  },

  // Role-specific dashboards (rendered as flat for teacher / student / parent)
  { label: 'Dashboard', to: '/teacher-dashboard', icon: LayoutDashboard, description: 'Teacher portal', adminSkip: true },
  { label: 'Dashboard', to: '/student-dashboard', icon: LayoutDashboard, description: 'Student portal',  adminSkip: true },
  { label: 'Dashboard', to: '/parent-dashboard',  icon: LayoutDashboard, description: 'My child overview', adminSkip: true },

  // Parent-only pages (flat, visible to parent role only via ROLE_LINKS)
  { label: 'Messages',      to: '/parent-messages',   icon: MessageSquare, description: 'Message teachers',    adminSkip: true },
  { label: 'Fee Ledger',    to: '/parent-fee-ledger', icon: Banknote,      description: 'Full fee history',    adminSkip: true },
  { label: 'Live Tracking', to: '/live-tracking',     icon: MapPin,        description: 'Track school van',    adminSkip: true },
  { label: 'Class Chat',   to: '/class-chat',        icon: MessagesSquare,description: 'Chat with classmates', adminSkip: true },

  // ── People ────────────────────────────────────────────────────────────────
  {
    label: 'People',
    icon: Users,
    color: '#0ea5e9',
    group: true,
    children: [
      { label: 'Students',    to: '/students',      icon: Users,        description: 'Enrolled students' },
      { label: 'Admissions',  to: '/admission/new', icon: ClipboardList, description: 'New enrollment' },
      { label: 'Teachers',     to: '/teachers',      icon: GraduationCap, description: 'Staff & assignments' },
      { label: 'Support Staff',to: '/staff',         icon: HardHat,       description: 'Non-teaching staff' },
      { label: 'Staff Leaves', to: '/leaves',        icon: CalendarDays,  description: 'Leave management' },
      { label: 'Alumni',       to: '/alumni',        icon: Users2,        description: 'Graduated students' },
    ],
  },

  // ── Academic ──────────────────────────────────────────────────────────────
  {
    label: 'Academic',
    icon: BookOpen,
    color: '#8b5cf6',
    group: true,
    children: [
      { label: 'Classes',   to: '/classes',   icon: BookOpen,    description: 'Classes & sections' },
      { label: 'Subjects',  to: '/subjects',  icon: Library,     description: 'Subjects & teachers' },
      { label: 'Timetable', to: '/timetable', icon: CalendarDays, description: 'Class schedules' },
      { label: 'Syllabus',  to: '/syllabus',  icon: ListChecks,  description: 'Curriculum tracking' },
    ],
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  {
    label: 'Attendance',
    icon: ClipboardCheck,
    color: '#10b981',
    group: true,
    children: [
      { label: 'Quick Attendance', to: '/quick-attendance', icon: Zap,           description: 'One-tap daily attendance' },
      { label: 'Attendance',       to: '/attendance',       icon: ClipboardCheck, description: 'Daily tracking' },
      { label: 'Late Arrivals',    to: '/late-arrivals',    icon: Clock,          description: 'Late arrival register' },
    ],
  },

  // ── Exams ─────────────────────────────────────────────────────────────────
  {
    label: 'Exams',
    icon: FileBarChart2,
    color: '#f59e0b',
    group: true,
    children: [
      { label: 'Exams',        to: '/exams',        icon: FileBarChart2, description: 'Marks & results' },
      { label: 'Gradebook',   to: '/gradebook',   icon: BarChart2,     description: 'Spreadsheet marks entry' },
      { label: 'Board Exams', to: '/board-exams', icon: GraduationCap, description: 'BISE registrations' },
      { label: 'Quizzes',     to: '/quizzes',     icon: FileCheck,     description: 'Online assessments' },
      { label: 'Exam Seating',to: '/exam-seating',icon: LayoutGrid,    description: 'Auto-generate seating plans' },
    ],
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    label: 'Finance',
    icon: Banknote,
    color: '#059669',
    group: true,
    children: [
      { label: 'Fees',         to: '/fees',          icon: Banknote,     description: 'Fee management' },
      { label: 'Fee Analytics',    to: '/fee-analytics',    icon: BarChart3,    description: 'Revenue trends & heatmaps' },
      { label: 'Online Payments',  to: '/online-payments',  icon: Smartphone,   description: 'JazzCash & EasyPaisa history' },
      { label: 'Salary',       to: '/salary',        icon: DollarSign,   description: 'Teacher payroll' },
      { label: 'Expenses',     to: '/expenses',      icon: TrendingDown, description: 'School spending' },
      { label: 'Income',       to: '/income',        icon: TrendingUp,   description: 'Revenue tracking' },
      { label: 'Scholarships', to: '/scholarships',  icon: Award,        description: 'Concessions' },
    ],
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    label: 'Communication',
    icon: MessageSquare,
    color: '#ec4899',
    group: true,
    children: [
      { label: 'Announcements', to: '/announcements', icon: Megaphone,        description: 'Notices & updates' },
      { label: 'Class Chat',    to: '/class-chat',    icon: MessagesSquare,  description: 'Real-time class rooms' },
      { label: 'Messages',      to: '/messaging',     icon: MessageSquare,   description: 'Direct messaging' },
      { label: 'Events',        to: '/events',        icon: CalendarRange, description: 'School events' },
      { label: 'PTM Scheduler', to: '/meetings',      icon: CalendarCheck, description: 'Parent meetings' },
      { label: 'Diary',         to: '/diary',         icon: BookText,      description: 'Class diary' },
    ],
  },

  // ── Learning ──────────────────────────────────────────────────────────────
  {
    label: 'Learning',
    icon: Video,
    color: '#0891b2',
    group: true,
    children: [
      { label: 'Online Classes', to: '/online-classes', icon: Video,       description: 'Virtual classes' },
      { label: 'Homework',       to: '/homework',       icon: NotebookPen, description: 'Assignments' },
      { label: 'Study Planner',  to: '/study-planner',  icon: ListChecks,  description: 'Focus topics & weak subjects' },
    ],
  },

  // ── Resources ─────────────────────────────────────────────────────────────
  {
    label: 'Resources',
    icon: Package,
    color: '#7c3aed',
    group: true,
    children: [
      { label: 'Library',       to: '/library',          icon: BookMarked,  description: 'Books & issues' },
      { label: 'Inventory',     to: '/inventory',        icon: Package,     description: 'Stock & assets' },
      { label: 'Transport',     to: '/transport',        icon: Bus,         description: 'Buses & routes' },
      { label: 'Live Tracking', to: '/live-tracking',   icon: MapPin,      description: 'Real-time bus map' },
      { label: 'Driver Panel',  to: '/driver-tracking', icon: Navigation,  description: 'GPS driver dashboard' },
      { label: 'Canteen',       to: '/canteen',          icon: ShoppingCart, description: 'POS & revenue' },
      { label: 'Medical',       to: '/medical',          icon: Stethoscope, description: 'Health records' },
    ],
  },

  // ── Communication extras ──────────────────────────────────────────────────
  {
    label: 'WhatsApp',
    to: '/whatsapp',
    icon: MessageCircle,
    description: 'Bulk messaging campaigns',
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    label: 'Reports',
    icon: BarChart3,
    color: '#d97706',
    group: true,
    children: [
      { label: 'At-Risk Students', to: '/risk',                       icon: AlertTriangle, description: 'AI risk scores' },
      { label: 'Financial',        to: '/analytics/financial',        icon: BarChart3,     description: 'P&L analytics' },
      { label: 'Annual Report',    to: '/analytics/annual-report',    icon: FileText,      description: 'Year summary' },
      { label: 'Custom Report',    to: '/analytics/custom-report',    icon: ClipboardList, description: 'Custom exports' },
    ],
  },

  // ── Resources extras ──────────────────────────────────────────────────────
  {
    label: 'Documents',
    to: '/documents',
    icon: FolderOpen,
    description: 'Student document storage',
  },

  // ── Academic extras ───────────────────────────────────────────────────────
  {
    label: 'AI Timetable',
    to: '/timetable-generator',
    icon: Sparkles,
    description: 'Auto-generate conflict-free timetable',
  },

  // ── Automation ────────────────────────────────────────────────────────────
  {
    label: 'Automation',
    to: '/automation',
    icon: Zap,
    description: 'Smart workflows & AI insights',
  },

  // ── Settings (flat) ───────────────────────────────────────────────────────
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    description: 'School info & configuration',
  },

  // ── Documentation ─────────────────────────────────────────────────────────
  {
    label: 'Documentation',
    to: '/docs',
    icon: BookOpen,
    description: 'API reference, user & developer guides',
  },

  // ── Admin tools ───────────────────────────────────────────────────────────
  {
    label: 'Audit Logs',
    to: '/audit-logs',
    icon: ShieldCheck,
    description: 'Full action history',
  },
  {
    label: 'System Health',
    to: '/system-health',
    icon: Activity,
    description: 'Performance & uptime metrics',
  },
  {
    label: 'Billing',
    to: '/billing',
    icon: CreditCard,
    description: 'Plan & subscription management',
  },

  // ── New Features ──────────────────────────────────────────────────────────
  {
    label: 'Fee Installments',
    to: '/fee-installments',
    icon: Layers,
    description: 'Installment plans & tracking',
  },
  {
    label: 'Discipline',
    to: '/discipline',
    icon: ShieldAlert,
    description: 'Student behavior & incidents',
  },
  {
    label: 'Substitutions',
    to: '/substitutions',
    icon: UserX,
    description: 'Teacher substitution manager',
  },
  {
    label: 'Complaints',
    to: '/complaints',
    icon: MessageSquare,
    description: 'Complaints & feedback portal',
  },
  {
    label: 'Hostel',
    to: '/hostel',
    icon: Home,
    description: 'Boarding & hostel management',
  },
  {
    label: 'Branches',
    to: '/branches',
    icon: GitBranch,
    description: 'Multi-campus branch management',
  },
  {
    label: 'Budget',
    to: '/budget',
    icon: PieChart,
    description: 'Annual budget planning & tracking',
  },
  {
    label: 'Website Builder',
    to: '/website-builder',
    icon: Globe,
    description: 'Manage school public website',
  },
  {
    label: 'Visitors',
    to: '/visitors',
    icon: UserCheck,
    description: 'Visitor log & badge printing',
  },
  {
    label: 'QR Attendance',
    to: '/qr-attendance',
    icon: QrCode,
    description: 'Scan QR codes to mark attendance',
  },

  // ── Live Tracking ─────────────────────────────────────────────────────────
  {
    label: 'Live Tracking',
    to: '/live-tracking',
    icon: MapPin,
    description: 'Real-time bus location for parents',
  },
  {
    label: 'Driver Panel',
    to: '/driver-tracking',
    icon: Navigation,
    description: 'GPS tracking dashboard for drivers',
  },

  // ── Approvals ─────────────────────────────────────────────────────────────
  {
    label: 'Approvals',
    to: '/approvals',
    icon: ClipboardCheck,
    description: 'Parent approval for promotions & grades',
  },

];

/* ── Student status colors (static full strings for Tailwind scanning) ── */
export const STATUS_STYLES = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  inactive:  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  suspended: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
  graduated: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/40',
};

/* ── Gender badge colors ── */
export const GENDER_STYLES = {
  Male:   'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
  Female: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/40',
  Other:  'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-pink-800/40',
};

/* ── Avatar gradient pairs [from, to] in hex ── */
export const AVATAR_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#8b5cf6', '#a855f7'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#f97316'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#14b8a6'],
  ['#ef4444', '#f97316'],
  ['#84cc16', '#10b981'],
];

/* ── Grades list ── */
export const GRADES = [
  'Nursery', 'KG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8',
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
];

/* ── Sections ── */
export const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

/* ── Teacher status colors ── */
export const TEACHER_STATUS_STYLES = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  on_leave: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
};

/* ── Qualifications ── */
export const QUALIFICATIONS = [
  'B.Ed', 'M.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc',
  'B.Com', 'M.Com', 'MBA', 'PhD', 'Other',
];
