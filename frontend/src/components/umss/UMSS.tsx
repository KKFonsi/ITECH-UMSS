import { useState, useEffect } from "react";
import { useAuth, type Profile, type Role } from "../../lib/auth";
import { protectedScreen, homeScreen, type Screen } from "../../lib/navigation";
import { useWorkOrders, WorkOrdersProvider, WorkOrderFeedback } from "../../lib/workOrders";
import { LiveReportForm } from "./LiveReportForm";
import { LiveTechnicianQueue } from "./LiveTechnicianQueue";
import { Dialog } from "./Dialog";
import { ApplicationShell, StudentShell } from "./layouts";
import { WorkOrderTable } from "./WorkOrderTable";
import pupLogo from "@/assets/PUP_LOGO.png";
import {
  Wrench, User, Shield, Star, ChevronDown, Eye, EyeOff,
  ArrowLeft, QrCode, TriangleAlert, MapPin, Clock, CheckCircle,
  Lock, ClipboardList, Send, ChevronRight, Search,
  ToggleLeft, ToggleRight, Users, FileText, LogOut, Bell, X,
  PlusCircle, Activity, BarChart2, Camera, Trash2,
  ArrowRightLeft, PackageCheck, UserCheck, UserX, MessageCircle, Bot,
  Building2, Calendar, Package, Plus, Minus, CalendarClock
} from "lucide-react";
import {
  STUDENTS, TECHNICIANS, ADMINS, SUPER_ADMIN,
  AUDIT_LOG,
  type WorkOrderStatus, type Admin, type Student,
} from "./mockData";

interface CurrentUser {
  name: string;
  id: string;
  role: Role;
}

const GRADIENT_HEADER = "linear-gradient(135deg, #810000, #c0392b)";
const LOGIN_BG = "linear-gradient(175deg, #810000 0%, #5a0000 55%, #1a0000 100%)";

// ─── URL param helpers ────────────────────────────────────────────────────────
function getInitialScreen(): Screen {
  const p = new URLSearchParams(window.location.search);
  const s = p.get("screen");
  const valid: Screen[] = [
    "login","student-dashboard","qr-review","report-form","technician-queue",
    "admin-dashboard","superadmin-dashboard","campus-assistant",
    "room-reservation","equipment-request","user-management",
  ];
  return (valid.includes(s as Screen) ? s : "login") as Screen;
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const map: Record<WorkOrderStatus, { cls: string; icon: React.ReactNode }> = {
    Pending:     { cls: "bg-red-50 text-red-600 border border-red-200",      icon: <Clock size={10} className="mr-1" /> },
    "In Progress":{ cls: "bg-yellow-50 text-yellow-700 border border-yellow-200", icon: <Activity size={10} className="mr-1" /> },
    Resolved:    { cls: "bg-green-50 text-green-700 border border-green-200", icon: <CheckCircle size={10} className="mr-1" /> },
  };
  const { cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {icon}{status}
    </span>
  );
}

function ProfileDropdown({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  return (
    <div className="absolute top-12 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-56 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{user.id}</p>
      </div>
      <button className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
        <User size={15} className="text-gray-400" /> My Profile
      </button>
      <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-medium">
        <LogOut size={15} /> Log Out
      </button>
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  return <Dialog title="GSO technician access" onClose={onClose}>
    <div className="p-6"><h2 className="text-lg font-bold text-[#810000]">GSO technician access</h2>
      <p className="my-4 text-sm text-gray-600">The maintenance queue is available to verified technician accounts. Sign out and sign in with your technician email to access your assigned work orders.</p>
      <button onClick={onClose} className="rounded-xl bg-[#810000] px-5 py-3 text-white">Close</button>
    </div>
  </Dialog>;
}

function StudentBottomNav({ active, navigate, onGsoTap }: {
  active: string;
  navigate: (s: Screen) => void;
  onGsoTap: () => void;
}) {
  const items = [
    { id: "dashboard",  label: "Home",      icon: ClipboardList, action: () => navigate("student-dashboard") },
    { id: "qr",         label: "Scan QR",   icon: QrCode,        action: () => navigate("qr-review") },
    { id: "report",     label: "Report",    icon: TriangleAlert, action: () => navigate("report-form") },
    { id: "rooms",      label: "Rooms",     icon: Building2,     action: () => navigate("room-reservation") },
    { id: "equipment",  label: "Equipment", icon: Package,       action: () => navigate("equipment-request") },
    { id: "gso",        label: "GSO",       icon: Wrench,        action: onGsoTap },
  ];
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 flex z-30" style={{ paddingBottom: 10 }}>
      {items.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button key={item.id} aria-current={isActive ? "page" : undefined} onClick={item.action} className="flex-1 flex flex-col items-center pt-2 gap-0.5">
            <Icon size={18} color={isActive ? "#810000" : "#9ca3af"} />
            <span className="text-[9px] font-semibold" style={{ color: isActive ? "#810000" : "#9ca3af" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ signIn, accountError, onSignOut }: { signIn: (email: string, password: string) => Promise<void>; accountError: string | null; onSignOut?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async () => {
    setBusy(true); setError(null);
    try { await signIn(email, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in"); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-8 pb-6" style={{ background: LOGIN_BG }}>
      <div className="flex flex-col items-center mb-8 mt-6">
        <img src={pupLogo} alt="PUP Logo" className="w-24 h-24 rounded-full mb-4 shadow-xl object-cover" />
        <h1 className="text-white font-bold text-xl text-center leading-tight">
          University Maintenance<br />Services System (UMSS)
        </h1>
        <p className="text-white/70 text-sm mt-1">University General Services Office</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); handleLogin(); }} className="w-full bg-white rounded-3xl shadow-2xl p-6">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">SIGN IN</p>

        <div className="mb-4">
          <label htmlFor="login-username" className="block text-[11px] font-bold text-gray-500 mb-1.5 tracking-wider uppercase">Email address</label>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <User size={16} className="text-gray-400 shrink-0" />
            <input id="login-username" autoComplete="username" className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
              type="email" required placeholder="you@pup.edu.ph" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="login-password" className="block text-[11px] font-bold text-gray-500 mb-1.5 tracking-wider uppercase">Password</label>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <input className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
              required id="login-password" autoComplete="current-password" type={showPass ? "text" : "password"} placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" aria-label={showPass ? "Hide password" : "Show password"} onClick={() => setShowPass(!showPass)} className="text-gray-400">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {(error || accountError) && <p role="alert" className="mb-4 text-sm text-red-700">{error || accountError}</p>}
        <button disabled={busy} type="submit" className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-95 transition-transform"
          style={{ background: GRADIENT_HEADER }}>
          {busy ? "Signing in?" : "Sign In to Portal"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Forgot password? Contact the <span className="underline text-gray-600">GSO IT Office</span>
        </p>
        {onSignOut && <button type="button" onClick={onSignOut} className="mt-3 w-full py-2 text-sm text-[#810000]">Sign out of current session</button>}
      </form>

      <p className="text-white/30 text-[10px] mt-6 tracking-widest text-center">
        UNIVERSITY MAINTENANCE SERVICES SYSTEM · v1.0
      </p>
    </div>
  );
}

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────
function StudentDashboard({ user, navigate, logout, submissions, demoSubmissions }: {
  user: CurrentUser; navigate: (s: Screen) => void; logout: () => void;
  submissions: Submission[];
  demoSubmissions: Submission[];
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleGsoAccess = () => { setShowProfile(false); setShowAuth(true); };

  return (
    <div className="flex flex-col min-h-[100dvh] relative" onClick={() => setShowProfile(false)}>
      <div className="relative pt-10 pb-6 px-5" style={{ background: GRADIENT_HEADER }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/80 text-[10px] font-bold tracking-widest">CAMPUS MAINTENANCE PORTAL</p>
          <button aria-label="Profile and logout" aria-expanded={showProfile} onClick={e => { e.stopPropagation(); setShowProfile(!showProfile); }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <User size={16} className="text-white" />
          </button>
        </div>
        <h2 className="text-white font-bold text-2xl leading-tight">{greeting},<br />{user.name}</h2>
        <p className="text-white/70 text-xs mt-1">Student ID · {user.id}</p>
        {showProfile && <ProfileDropdown user={user} onLogout={logout} />}
      </div>

      <div className="flex-1 bg-gray-50 px-4 pt-5 pb-2">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">QUICK ACTIONS</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate("report-form")} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <TriangleAlert size={18} className="text-red-400" />
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">Report a Broken Item</p>
            <p className="text-xs text-gray-400 mt-0.5">Campus infrastructure issues</p>
          </button>
          <button onClick={() => navigate("qr-review")} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left active:scale-95 transition-transform">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <QrCode size={18} className="text-red-400" />
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">Scan Classroom QR Code</p>
            <p className="text-xs text-gray-400 mt-0.5">Rate room condition</p>
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest">YOUR SUBMISSIONS</p>
          <span className="text-xs font-semibold text-[#810000]">View All</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          {submissions.map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i < submissions.length - 1 ? "border-b border-gray-50" : ""}`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === "Pending" ? "bg-red-500" : s.status === "In Progress" ? "bg-yellow-400" : "bg-green-500"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{s.location}</p>
                </div>
              </div>
              <div className="text-right ml-2 shrink-0">
                <StatusBadge status={s.status} />
                <p className="text-[10px] text-gray-400 mt-0.5">{s.time}</p>
              </div>
            </div>
          ))}
        </div>

        {submissions.length === 0 && <p className="mb-4 text-sm text-gray-500">You have no maintenance reports yet.</p>}
        {demoSubmissions.length > 0 && <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-semibold">Demo activity (this session only)</h3>{demoSubmissions.map(item => <p key={item.id} className="mt-2 text-xs">{item.title} ? {item.status}</p>)}</section>}
        <button onClick={handleGsoAccess}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 active:scale-95 transition-transform mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: GRADIENT_HEADER }}>
            <Wrench size={20} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900 text-sm">GSO Technician View</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Lock size={10} /> Requires a technician account</p>
          </div>
          <Shield size={16} className="text-gray-300" />
        </button>
      </div>

      {/* Floating Campus Assistant button */}
      <button aria-label="Open campus assistant"
        onClick={() => navigate("campus-assistant")}
        className="absolute bottom-20 right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ background: GRADIENT_HEADER }}
      >
        <MessageCircle size={22} className="text-white" />
      </button>

      <StudentBottomNav active="dashboard" navigate={navigate} onGsoTap={handleGsoAccess} />

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}

// ─── CAMPUS ASSISTANT CHATBOT ─────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const CHAT_QA: { q: string; a: string }[] = [
  {
    q: "How do I report a broken item?",
    a: "Tap 'Report a Broken Item' on your dashboard, choose your campus and building, select the issue category, and describe the problem. You'll see it appear under 'Your Submissions' once sent.",
  },
  {
    q: "How do I scan a classroom QR code?",
    a: "Tap 'Scan Classroom QR Code' on your dashboard, point your camera at the QR sticker in the room, rate the room's condition, and check off any defects you noticed.",
  },
  {
    q: "How can I check my submission status?",
    a: "Your dashboard's 'Your Submissions' list shows the status of everything you've reported — Pending, In Progress, or Resolved.",
  },
  {
    q: "Who do I contact for urgent issues?",
    a: "For urgent safety issues, please contact the GSO Office directly in addition to submitting a report here, so it can be addressed immediately.",
  },
];

const GREETING: ChatMessage = {
  id: "greeting",
  role: "bot",
  text: "Hi! I'm the UMSS Campus Assistant. Tap a question below to get started.",
};

function CampusAssistant({ navigate }: { navigate: (s: Screen) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);

  const handleChip = (qa: { q: string; a: string }) => {
    const ts = Date.now().toString();
    setMessages(prev => [
      ...prev,
      { id: `u-${ts}`, role: "user", text: qa.q },
      { id: `b-${ts}`, role: "bot",  text: qa.a },
    ]);
  };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <div className="pt-10 pb-5 px-5 shrink-0" style={{ background: GRADIENT_HEADER }}>
        <button onClick={() => navigate("student-dashboard")} className="flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Campus Assistant</h2>
            <p className="text-white/70 text-[10px] font-bold tracking-widest">UMSS HELP BOT</p>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 bg-gray-50 px-4 pt-4 pb-2 overflow-y-auto flex flex-col gap-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "bot" ? "justify-start" : "justify-end"}`}>
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-[#810000] flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === "bot"
                  ? "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                  : "text-white rounded-tr-sm"
              }`}
              style={msg.role === "user" ? { background: GRADIENT_HEADER } : {}}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested question chips */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">SUGGESTED QUESTIONS</p>
        <div className="flex flex-col gap-2">
          {CHAT_QA.map(qa => (
            <button
              key={qa.q}
              onClick={() => handleChip(qa)}
              className="text-left px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-700 font-medium hover:border-[#81000040] hover:bg-red-50 active:scale-95 transition-all"
            >
              {qa.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QR REVIEW ────────────────────────────────────────────────────────────────
function QrReview({ navigate, onSubmit }: {
  navigate: (s: Screen) => void;
  onSubmit: (sub: Submission) => void;
}) {
  const [rating, setRating] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [desc, setDesc] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const items = ["Defective Aircon / Fan", "Broken Chairs / Desks", "Busted Projector / Whiteboard", "Flickering Ceiling Lights", "Other"];

  const handleSubmit = () => {
    onSubmit({
      id: `qr-${Date.now()}`,
      title: "Room 305 condition review",
      location: "Science Building, 3rd Floor",
      status: "Pending",
      time: "Just now",
    });
    setSubmitted(true);
    setTimeout(() => navigate("student-dashboard"), 1800);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
      {/* Success toast */}
      {submitted && (
        <div className="absolute top-12 left-4 right-4 z-50 bg-green-600 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
          <CheckCircle size={18} />
          <p className="font-semibold text-sm">Room review submitted!</p>
        </div>
      )}

      <div className="pt-10 pb-6 px-5" style={{ background: GRADIENT_HEADER }}>
        <button onClick={() => navigate("student-dashboard")} className="flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <QrCode size={13} className="text-white" />
          </div>
          <p className="text-white/80 text-[10px] font-bold tracking-widest">CLASSROOM CONDITION REVIEW</p>
        </div>
        <h2 className="text-white font-bold text-2xl">Detected: Room 305</h2>
        <p className="text-white/70 text-sm">Science Building · 3rd Floor</p>
      </div>

      <div className="flex-1 bg-gray-50 px-4 pt-5 pb-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-4">RATE CURRENT CLASSROOM CONDITION</p>
          <div className="flex justify-center gap-2 mb-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} aria-label={`Rate ${n} out of 5`} aria-pressed={rating === n} onClick={() => setRating(n)}>
                <Star size={32} fill={n <= rating ? "#f59e0b" : "none"} stroke={n <= rating ? "#f59e0b" : "#d1d5db"} />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400">{rating === 0 ? "Tap a star to rate" : `${rating} star${rating > 1 ? "s" : ""}`}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-4">CLASSROOM DEFECT CHECKLIST</p>
          {items.map(item => (
            <button key={item} onClick={() => setChecks(c => ({ ...c, [item]: !c[item] }))}
              className="flex items-center gap-3 w-full py-2.5 text-left">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checks[item] ? "bg-[#810000] border-[#810000]" : "border-gray-300"}`}>
                {checks[item] && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-gray-800">{item}</span>
              {item === "Other" && <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5 font-medium">custom</span>}
            </button>
          ))}
        </div>

        {/* Description field */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DESCRIPTION</p>
          <textarea aria-label="Room review description"
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Add any additional notes about this room (optional)..."
            className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none resize-none placeholder-gray-400"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-4"
          style={{ background: submitted ? "#86efac" : "#16a34a" }}
        >
          <Send size={16} /> Submit Room Review
        </button>
      </div>

      <StudentBottomNav active="qr" navigate={navigate} onGsoTap={() => setShowAuth(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ─── REPORT FORM ──────────────────────────────────────────────────────────────
const CAMPUS_AREAS = [
  "Main Campus",
  "Institute of Technology (ITECH)",
  "College of Communication (COC)",
  "College of Tourism, Hospitality and Transportation Management (CTHTM)",
];

const SPECIFIC_LOCATIONS = [
  "Library",
  "Main Building",
  "West Wing",
  "East Wing",
  "Gymnasium",
  "Science Building",
  "Admin Building",
  "Others",
];

const ROOMS_BY_BUILDING: Record<string, string[]> = {
  "Main Campus": ["Room 101", "Room 205", "Room 305", "Library", "Gymnasium", "Faculty Lounge", "Admin Office", "Others"],
  "Institute of Technology (ITECH)": ["Room 101", "Room 102", "Computer Lab 1", "Computer Lab 2", "Computer Lab 3", "Tech Workshop", "Others"],
  "College of Communication (COC)": ["Room 201", "Room 202", "Studio A", "Studio B", "Editing Lab", "Others"],
  "College of Tourism, Hospitality and Transportation Management (CTHTM)": ["Room 101", "Culinary Lab", "Mock Restaurant", "Conference Room", "Others"],
  "Others": ["Others"],
};

const ROOM_RATINGS: Record<string, number | null> = {
  r1: 4.2,
  r2: 2.4,
  r3: 4.8,
  r4: 3.6,
  r5: null,
  r6: 4.1,
};

const TIME_SLOTS = [
  "7:00–8:00 AM", "8:00–9:00 AM", "9:00–10:00 AM", "10:00–11:00 AM",
  "11:00 AM–12:00 PM", "12:00–1:00 PM", "1:00–2:00 PM", "2:00–3:00 PM",
  "3:00–4:00 PM", "4:00–5:00 PM", "5:00–6:00 PM",
];

type EquipStatus = "Pending" | "Fulfilled" | "Approved" | "Denied";
type ReqStatus   = "Pending" | "Approved" | "Denied";
interface EquipmentRequestItem {
  id: string; requester: string; room: string; items: string; status: EquipStatus; date: string;
}
const EQUIPMENT_REQUESTS: EquipmentRequestItem[] = [
  { id: "eq1", requester: "Ezren Dela Golpijon", room: "Library",          items: "Chairs ×4, Projector ×1",           status: "Pending",   date: "Jun 19" },
  { id: "eq2", requester: "Maria Santos",        room: "Science Building", items: "Extension Cord ×2, Whiteboard ×1",  status: "Pending",   date: "Jun 18" },
  { id: "eq3", requester: "Juan Dela Cruz",      room: "Gymnasium",        items: "Tables ×6, Chairs ×12",             status: "Fulfilled", date: "Jun 15" },
];

interface RoomRequestItem {
  id: string; room: string; building: string; requester: string; date: string; slot: string; status: ReqStatus;
}
const INIT_ROOM_REQUESTS: RoomRequestItem[] = [
  { id: "rr1", room: "Room 305", building: "Science Building", requester: "Maria Santos",   date: "Tue 16", slot: "2:00–3:00 PM",   status: "Pending" },
  { id: "rr2", room: "Room 205", building: "Main Building",    requester: "Juan Dela Cruz", date: "Wed 17", slot: "10:00–11:00 AM", status: "Pending" },
  { id: "rr3", room: "Room 101", building: "Main Building",    requester: "Anna Reyes",     date: "Thu 18", slot: "1:00–2:00 PM",   status: "Pending" },
];

const DATE_CHIPS = [
  { day: "Mon", date: "15" },
  { day: "Tue", date: "16" },
  { day: "Wed", date: "17" },
  { day: "Thu", date: "18" },
  { day: "Fri", date: "19" },
  { day: "Sat", date: "20" },
  { day: "Sun", date: "21" },
];

interface AppUser { id: string; name: string; role: string; department: string; }
const INIT_APP_USERS: AppUser[] = [
  { id: "u1", name: "Prof. A. Ramos", role: "Faculty", department: "College of Engineering" },
  { id: "u2", name: "L. Cruz",        role: "Staff",   department: "Registrar's Office" },
  { id: "u3", name: "Dr. M. Bautista",role: "Faculty", department: "College of Sciences" },
];

type AdminTab = "dashboard" | "users" | "technicians" | "workorders";

function AdminDashboard({ user, logout, navigate }: { user: CurrentUser; logout: () => void; navigate: (screen: Screen) => void }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [search, setSearch] = useState("");
  const { displayOrders: woData, technicians, update } = useWorkOrders();
  const [roomReqs, setRoomReqs] = useState<RoomRequestItem[]>(INIT_ROOM_REQUESTS);
  const [equipReqs, setEquipReqs] = useState<EquipmentRequestItem[]>(EQUIPMENT_REQUESTS.map(r => ({...r})));

  const openCount = woData.filter(w => w.status !== "Resolved").length;
  const activeTechs = technicians.length;

  const labels = { dashboard: "Dashboard", users: "Students (demo)", technicians: "Technicians (demo)", workorders: "Work Orders" };
  const icons = { dashboard: BarChart2, users: Users, technicians: Wrench, workorders: FileText };
  return (
    <ApplicationShell title={labels[tab]} roleLabel="Admin" user={user} active={tab} onLogout={logout}
      items={[
        ...(["dashboard", "users", "technicians", "workorders"] as AdminTab[]).map(id => ({ id, label: labels[id], icon: icons[id], onSelect: () => setTab(id) })),
        { id: "report", label: "New Report", icon: PlusCircle, onSelect: () => navigate("report-form") },
      ]}>
      <div className="flex-1 bg-gray-50 px-4 pt-4 pb-2">
        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Open Work Orders",   value: openCount,    icon: <FileText size={16} className="text-red-500" />,    bg: "bg-red-50" },
                { label: "Active Technicians", value: activeTechs,  icon: <Wrench size={16} className="text-blue-500" />,    bg: "bg-blue-50" },
                { label: "Demo: Avg. Resolution",    value: "2.3 days",   icon: <Clock size={16} className="text-yellow-500" />,   bg: "bg-yellow-50" },
                { label: "Loaded Work Orders",  value: woData.length,            icon: <BarChart2 size={16} className="text-green-600" />,bg: "bg-green-50" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="dashboard-panels">
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">MAINTENANCE REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              {woData.slice(0, 4).map((w, i) => (
                <div key={w.id} className={`px-4 py-3 flex items-center justify-between ${i < 3 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{w.title}</p>
                    <p className="text-xs text-gray-400 truncate">{w.location} · {w.reportedBy}</p>
                  </div>
                  <div className="ml-2 shrink-0"><StatusBadge status={w.status} /></div>
                </div>
              ))}
            </div>
              </section>
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DEMO: ROOM RESERVATION REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              {roomReqs.map((r, i) => (
                <div key={r.id} className={`px-4 py-3 ${i < roomReqs.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">{r.room}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ApproveDenyBtns status={r.status}
                        onApprove={() => setRoomReqs(l => l.map(x => x.id === r.id ? {...x, status: "Approved" as ReqStatus} : x))}
                        onDeny={() => setRoomReqs(l => l.map(x => x.id === r.id ? {...x, status: "Denied" as ReqStatus} : x))}
                      />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reqBadgeCls(r.status)}`}>{r.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{r.building} · {r.requester} · {r.date} · {r.slot}</p>
                </div>
              ))}
            </div>
              </section>
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DEMO: EQUIPMENT REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {equipReqs.map((eq, i) => (
                <div key={eq.id} className={`px-4 py-3 ${i < equipReqs.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">{eq.items}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ApproveDenyBtns status={eq.status}
                        onApprove={() => setEquipReqs(l => l.map(x => x.id === eq.id ? {...x, status: "Approved" as EquipStatus} : x))}
                        onDeny={() => setEquipReqs(l => l.map(x => x.id === eq.id ? {...x, status: "Denied" as EquipStatus} : x))}
                      />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reqBadgeCls(eq.status)}`}>{eq.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{eq.room} · {eq.requester} · {eq.date}</p>
                </div>
              ))}
            </div>
              </section>
            </div>
          </>
        )}

        {tab === "users" && (
          <>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 mb-4">
              <Search size={14} className="text-gray-400" />
              <input aria-label="Search students..." className="flex-1 text-sm outline-none placeholder-gray-400" placeholder="Search students..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {STUDENTS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search))
                .map((s, i, arr) => (
                  <div key={s.id} className={`px-4 py-3 flex items-center justify-between ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User size={14} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.studentId} · {s.submissions} submissions</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
                  </div>
              ))}
            </div>
          </>
        )}

        {tab === "technicians" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {TECHNICIANS.map((t, i) => (
              <div key={t.id} className={`px-4 py-3 ${i < TECHNICIANS.length - 1 ? "border-b border-gray-50" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{t.status}</span>
                </div>
                <p className="text-xs text-gray-400">{t.techId} · {t.zone}</p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">{t.activeTasks} active tasks</p>
              </div>
            ))}
          </div>
        )}

        {tab === "workorders" && (
          <WorkOrderTable orders={woData} onReassign={(id, technician) => { void update(id, { assigned_to: technician }).catch(() => {}); }} />
        )}
      </div>

    </ApplicationShell>
  );
}

type SATab = "dashboard" | "admins" | "users" | "audit" | "workorders";

const AUDIT_ICON: Record<string, React.ReactNode> = {
  reassigned:  <ArrowRightLeft size={14} className="text-blue-500" />,
  submitted:   <FileText size={14} className="text-yellow-500" />,
  resolved:    <CheckCircle size={14} className="text-green-600" />,
  deactivated: <UserX size={14} className="text-red-500" />,
  activated:   <UserCheck size={14} className="text-green-600" />,
  closed:      <PackageCheck size={14} className="text-gray-500" />,
};

function SuperAdminDashboard({ user, logout, navigate }: { user: CurrentUser; logout: () => void; navigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<SATab>("dashboard");
  const { displayOrders: workOrders, technicians, update } = useWorkOrders();
  const [filter, setFilter] = useState<"All"|"Students"|"Technicians"|"Admins">("All");
  const [adminList, setAdminList] = useState(ADMINS);
  const [studentList, setStudentList] = useState(STUDENTS);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminZone, setNewAdminZone] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [saRoomReqs, setSaRoomReqs] = useState<RoomRequestItem[]>(INIT_ROOM_REQUESTS);
  const [saEquipReqs, setSaEquipReqs] = useState<EquipmentRequestItem[]>(EQUIPMENT_REQUESTS.map(r => ({...r})));

  const allUsers = [
    ...studentList.map(s => ({ name: s.name, id: s.studentId, type: "Students" as const, key: s.id })),
    ...TECHNICIANS.map(t => ({ name: t.name, id: t.techId, type: "Technicians" as const, key: t.id })),
    ...adminList.map(a => ({ name: a.name, id: a.username, type: "Admins" as const, key: a.id })),
  ];
  const filteredUsers = filter === "All" ? allUsers : allUsers.filter(u => u.type === filter);

  const labels = { dashboard: "Dashboard", admins: "Admins (demo)", users: "User Directory (demo)", audit: "Audit Log (demo)", workorders: "Work Orders" };
  const icons = { dashboard: BarChart2, admins: Shield, users: Users, audit: Activity, workorders: FileText };
  return (
    <ApplicationShell title={labels[tab]} roleLabel="SuperAdmin" user={user} active={tab} onLogout={logout}
      items={[
        ...(["dashboard", "workorders", "admins", "users", "audit"] as SATab[]).map(id => ({ id, label: labels[id], icon: icons[id], onSelect: () => setTab(id) })),
        { id: "manage", label: "User Management", icon: UserCheck, onSelect: () => navigate("user-management") },
        { id: "report", label: "New Report", icon: PlusCircle, onSelect: () => navigate("report-form") },
      ]}>
      <div className="flex-1 bg-gray-50 px-4 pt-4 pb-2">
        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Demo: Total Users",       value: studentList.length + TECHNICIANS.length, icon: <Users size={16} className="text-violet-600" />, bg: "bg-violet-50" },
                { label: "Demo: Total Admins",      value: adminList.length, icon: <Shield size={16} className="text-blue-600" />, bg: "bg-blue-50" },
                { label: "Active Technicians", value: technicians.length, icon: <Wrench size={16} className="text-orange-600" />, bg: "bg-orange-50" },
                { label: "Open / Resolved",  value: `${workOrders.filter(w=>w.status!=="Resolved").length}/${workOrders.filter(w=>w.status==="Resolved").length}`, icon: <FileText size={16} className="text-green-600" />, bg: "bg-green-50" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="dashboard-panels">
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">MAINTENANCE REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              {workOrders.slice(0, 4).map((w, i) => (
                <div key={w.id} className={`px-4 py-3 flex items-center justify-between ${i < 3 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{w.title}</p>
                    <p className="text-xs text-gray-400 truncate">{w.location} · {w.reportedBy}</p>
                  </div>
                  <div className="ml-2 shrink-0"><StatusBadge status={w.status} /></div>
                </div>
              ))}
            </div>
              </section>
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DEMO: ROOM RESERVATION REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              {saRoomReqs.map((r, i) => (
                <div key={r.id} className={`px-4 py-3 ${i < saRoomReqs.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">{r.room}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ApproveDenyBtns status={r.status}
                        onApprove={() => setSaRoomReqs(l => l.map(x => x.id === r.id ? {...x, status: "Approved" as ReqStatus} : x))}
                        onDeny={() => setSaRoomReqs(l => l.map(x => x.id === r.id ? {...x, status: "Denied" as ReqStatus} : x))}
                      />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reqBadgeCls(r.status)}`}>{r.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{r.building} · {r.requester} · {r.date} · {r.slot}</p>
                </div>
              ))}
            </div>
              </section>
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DEMO: EQUIPMENT REQUESTS</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
              {saEquipReqs.map((eq, i) => (
                <div key={eq.id} className={`px-4 py-3 ${i < saEquipReqs.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">{eq.items}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ApproveDenyBtns status={eq.status}
                        onApprove={() => setSaEquipReqs(l => l.map(x => x.id === eq.id ? {...x, status: "Approved" as EquipStatus} : x))}
                        onDeny={() => setSaEquipReqs(l => l.map(x => x.id === eq.id ? {...x, status: "Denied" as EquipStatus} : x))}
                      />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reqBadgeCls(eq.status)}`}>{eq.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{eq.room} · {eq.requester} · {eq.date}</p>
                </div>
              ))}
            </div>
            {/* Simplified audit preview */}
              </section>
              <section className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">DEMO: RECENT ACTIVITY</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {AUDIT_LOG.slice(0, 4).map((a, i) => (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{AUDIT_ICON[a.type]}</div>
                  <p className="flex-1 text-xs text-gray-700">{a.label}</p>
                  <p className="text-[10px] text-gray-400 shrink-0">{a.relTime}</p>
                </div>
              ))}
            </div>
              </section>
            </div>
          </>
        )}

        {tab === "workorders" && <WorkOrderTable orders={workOrders} onReassign={(id, technician) => { void update(id, { assigned_to: technician }).catch(() => {}); }} />}

        {tab === "admins" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest">ALL ADMINS</p>
              <button onClick={() => setShowAddAdmin(true)} className="flex items-center gap-1 text-[#810000] text-xs font-semibold">
                <PlusCircle size={13} /> Add Admin
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {adminList.map((a, i) => (
                <div key={a.id} className={`px-4 py-3 ${i < adminList.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 flex-1 truncate pr-2">{a.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Toggle status for ${a.name}`} onClick={() => setAdminList(list => list.map(x => x.id === a.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))}
                        className="flex items-center gap-0.5 text-xs font-semibold"
                        style={{ color: a.status === "Active" ? "#16a34a" : "#9ca3af" }}>
                        {a.status === "Active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button aria-label={`Remove ${a.name}`} onClick={() => setAdminList(list => list.filter(x => x.id !== a.id))}
                        className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{a.username} · {a.zoneManaged}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.usersUnder} users · <span style={{ color: a.status === "Active" ? "#16a34a" : "#9ca3af" }}>{a.status}</span></p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "users" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(["All","Students","Technicians","Admins"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? "text-white" : "bg-gray-100 text-gray-500"}`}
                    style={filter === f ? { background: GRADIENT_HEADER } : {}}>
                    {f}
                  </button>
                ))}
              </div>
              {filter === "Students" && (
                <button onClick={() => setShowAddUser(true)} className="shrink-0 flex items-center gap-1 text-[#810000] text-xs font-semibold ml-2">
                  <PlusCircle size={13} /> Add
                </button>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredUsers.map((u, i) => (
                <div key={u.key + u.type} className={`px-4 py-3 flex items-center gap-3 ${i < filteredUsers.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.id}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                    {u.type.replace(/s$/, "")}
                  </span>
                  {u.type === "Students" && (
                    <button
                      aria-label={`Remove ${u.name}`} onClick={() => setStudentList(list => list.filter(s => s.id !== u.key))}
                      className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <Trash2 size={12} className="text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "audit" && (
          <>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">AUDIT LOG</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {AUDIT_LOG.map((a, i) => (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${i < AUDIT_LOG.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    {AUDIT_ICON[a.type]}
                  </div>
                  <p className="flex-1 text-xs text-gray-700">{a.label}</p>
                  <p className="text-[10px] text-gray-400 shrink-0">{a.relTime}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <Dialog title="Add New Admin" onClose={() => setShowAddAdmin(false)}>
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900">Add New Admin</p>
              <button aria-label="Close add admin dialog" onClick={() => setShowAddAdmin(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <input aria-label="Full Name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-3 placeholder-gray-400"
              placeholder="Full Name" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} />
            <input aria-label="Username (e.g. admin.lastname)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-3 placeholder-gray-400"
              placeholder="Username (e.g. admin.lastname)" value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} />
            <input aria-label="Zone Managed" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-4 placeholder-gray-400"
              placeholder="Zone Managed" value={newAdminZone} onChange={e => setNewAdminZone(e.target.value)} />
            <button
              onClick={() => {
                if (newAdminName && newAdminUser) {
                  setAdminList(l => [...l, { id: `a${Date.now()}`, name: newAdminName, username: newAdminUser, zoneManaged: newAdminZone || "Unassigned", usersUnder: 0, status: "Active" }]);
                  setNewAdminName(""); setNewAdminUser(""); setNewAdminZone(""); setShowAddAdmin(false);
                }
              }}
              className="w-full py-3.5 rounded-2xl text-white font-semibold" style={{ background: GRADIENT_HEADER }}>
              Add Admin
            </button>
          </div>
        </Dialog>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <Dialog title="Add New Student" onClose={() => setShowAddUser(false)}>
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-900">Add New Student</p>
              <button aria-label="Close add student dialog" onClick={() => setShowAddUser(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <input aria-label="Full Name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-3 placeholder-gray-400"
              placeholder="Full Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
            <input aria-label="Student ID (e.g. 2024-00001)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-4 placeholder-gray-400"
              placeholder="Student ID (e.g. 2024-00001)" value={newUserId} onChange={e => setNewUserId(e.target.value)} />
            <button
              onClick={() => {
                if (newUserName && newUserId) {
                  setStudentList(l => [...l, { id: `s${Date.now()}`, name: newUserName, studentId: newUserId, status: "Active", submissions: 0, lastActivity: "Just now" }]);
                  setNewUserName(""); setNewUserId(""); setShowAddUser(false);
                }
              }}
              className="w-full py-3.5 rounded-2xl text-white font-semibold" style={{ background: GRADIENT_HEADER }}>
              Add Student
            </button>
          </div>
        </Dialog>
      )}
    </ApplicationShell>
  );
}

// ─── ROOM RESERVATION ─────────────────────────────────────────────────────────
interface Room {
  id: string;
  name: string;
  building: string;
  status: "available" | "occupied" | "reserved";
  until?: string;
  slot?: string;
}

const TODAY = new Date().toISOString().split("T")[0];

const INITIAL_ROOMS: Room[] = [
  { id: "r1", name: "Room 101",           building: "Main Building",   status: "available" },
  { id: "r2", name: "Room 305",           building: "Science Building",status: "occupied",  until: "2:30 PM" },
  { id: "r3", name: "Library Study Room 2",building: "Library",        status: "available" },
  { id: "r4", name: "Computer Lab 3",     building: "ITECH Building",  status: "occupied",  until: "4:00 PM" },
  { id: "r5", name: "Gymnasium Court",    building: "Gymnasium",       status: "available" },
  { id: "r6", name: "Conference Room A",  building: "Admin Building",  status: "occupied",  until: "11:00 AM" },
];

function DateChips({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  return (
    <div className="flex gap-1 mb-3">
      {DATE_CHIPS.map(c => {
        const active = selected === c.date;
        return (
          <button key={c.date} onClick={() => onSelect(c.date)}
            className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${active ? "text-white shadow-sm" : "bg-gray-50 text-gray-500 border border-gray-200"}`}
            style={active ? { background: GRADIENT_HEADER } : {}}>
            <span className="text-[9px] font-semibold leading-tight">{c.day}</span>
            <span className="text-sm font-bold leading-tight">{c.date}</span>
          </button>
        );
      })}
    </div>
  );
}

function reqBadgeCls(s: string) {
  if (s === "Approved" || s === "Fulfilled") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "Denied") return "bg-gray-100 text-gray-500";
  return "bg-red-50 text-red-600 border border-red-200";
}

function ApproveDenyBtns({ status, onApprove, onDeny }: {
  status: string; onApprove: () => void; onDeny: () => void;
}) {
  if (status !== "Pending") return null;
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button aria-label="Approve request" onClick={onApprove} className="w-7 h-7 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center active:scale-95">
        <CheckCircle size={13} className="text-green-600" />
      </button>
      <button aria-label="Deny request" onClick={onDeny} className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center active:scale-95">
        <X size={13} className="text-red-500" />
      </button>
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <p className="text-[10px] text-gray-400 mt-0.5">No ratings yet</p>;
  return (
    <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-0.5">
      <Star size={9} fill="#f59e0b" stroke="#f59e0b" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-gray-400 ml-0.5">student rating</span>
    </p>
  );
}

function RoomReservation({ navigate, onSubmit }: { navigate: (s: Screen) => void; onSubmit: (sub: Submission) => void }) {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [showForm, setShowForm] = useState<Room | null>(null);
  const [dateChip, setDateChip] = useState("20");
  const [slot, setSlot] = useState("");
  const [purpose, setPurpose] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState("");

  const handleReserve = () => {
    if (!showForm || !slot) return;
    setRooms(rs => rs.map(r => r.id === showForm.id ? { ...r, status: "reserved", slot } : r));
    onSubmit({
      id: `rsv-${Date.now()}`,
      title: `Room reservation — ${showForm.name}`,
      location: showForm.building,
      status: "Pending",
      time: "Just now",
    });
    setToast(`${showForm.name} reserved · ${slot}`);
    setShowForm(null);
    setSlot(""); setPurpose("");
    setTimeout(() => setToast(""), 2800);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
      {toast && (
        <div className="absolute top-12 left-4 right-4 z-50 bg-green-600 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
          <CheckCircle size={18} /><p className="font-semibold text-sm">{toast}</p>
        </div>
      )}
      <div className="pt-10 pb-6 px-5" style={{ background: GRADIENT_HEADER }}>
        <button onClick={() => navigate("student-dashboard")} className="flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 size={13} className="text-white" />
          </div>
          <p className="text-white/80 text-[10px] font-bold tracking-widest">ROOM AVAILABILITY</p>
        </div>
        <h2 className="text-white font-bold text-2xl">Room Reservation</h2>
        <p className="text-white/70 text-sm">Live room availability</p>
      </div>

      <div className="flex-1 bg-gray-50 px-4 pt-5 pb-2 space-y-3">
        {rooms.map(room => {
          const rating = ROOM_RATINGS[room.id] ?? null;
          const isAvailable = room.status === "available";
          const isReserved = room.status === "reserved";
          const iconColor = isAvailable ? "#16a34a" : isReserved ? "#d97706" : "#dc2626";
          const iconBg   = isAvailable ? "bg-green-50"  : isReserved ? "bg-amber-50" : "bg-red-50";
          return (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Building2 size={18} color={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{room.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{room.building}</p>
                {room.status === "occupied" && room.until && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5"><Clock size={10} />Occupied until {room.until}</p>
                )}
                {room.status === "reserved" && room.slot && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><Clock size={10} />Reserved · {room.slot}</p>
                )}
                <StarRating rating={rating} />
              </div>
              <div className="shrink-0">
                {isAvailable ? (
                  <button onClick={() => setShowForm(room)}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
                    style={{ background: GRADIENT_HEADER }}>
                    Reserve
                  </button>
                ) : isReserved ? (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">Reserved</span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold">Occupied</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <StudentBottomNav active="rooms" navigate={navigate} onGsoTap={() => setShowAuth(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Reserve form modal */}
      {showForm && (
        <Dialog title="Reserve Room" onClose={() => setShowForm(null)}>
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-900">Reserve {showForm.name}</p>
                <p className="text-xs text-gray-400">{showForm.building}</p>
              </div>
              <button aria-label="Close reservation dialog" onClick={() => setShowForm(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-2">DATE — JUNE 2026</p>
            <DateChips selected={dateChip} onSelect={setDateChip} />
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">TIME SLOT</p>
            <div className="relative mb-3">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select aria-label="Reservation time slot" value={slot} onChange={e => setSlot(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-3 text-sm text-gray-600 outline-none appearance-none">
                <option value="">Select a time slot...</option>
                {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <input aria-label="Purpose (e.g. Group Study, Meeting)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-4 placeholder-gray-400"
              placeholder="Purpose (e.g. Group Study, Meeting)"
              value={purpose} onChange={e => setPurpose(e.target.value)} />
            <button onClick={handleReserve} disabled={!slot}
              className="w-full py-3.5 rounded-2xl text-white font-semibold transition-opacity"
              style={{ background: slot ? GRADIENT_HEADER : "#d4a5a5" }}>
              Confirm Reservation
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── EQUIPMENT REQUEST ─────────────────────────────────────────────────────────
const EQUIP_ITEMS = ["Chairs", "Tables", "Projector", "Extension Cord", "Whiteboard", "Microphone / Speaker", "Others"];

function EquipmentRequest({ navigate, onSubmit }: { navigate: (s: Screen) => void; onSubmit: (sub: Submission) => void }) {
  const [building, setBuilding] = useState("");
  const [customBuilding, setCustomBuilding] = useState("");
  const [specificRoom, setSpecificRoom] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [othersText, setOthersText] = useState("");
  const [neededDate, setNeededDate] = useState("20");
  const [showAuth, setShowAuth] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const roomOptions = building ? (ROOMS_BY_BUILDING[building] ?? ["Others"]) : [];

  const adjust = (item: string, delta: number) =>
    setQtys(q => { const n = Math.max(0, (q[item] ?? 0) + delta); return { ...q, [item]: n }; });

  const handleSubmit = () => {
    const bLabel = building === "Others" ? (customBuilding || "Others") : building;
    const rLabel = specificRoom === "Others" ? (customRoom || "Others") : specificRoom;
    const locLabel = [bLabel, rLabel].filter(Boolean).join(" — ") || "Campus";
    onSubmit({
      id: `eq-${Date.now()}`,
      title: "Equipment request",
      location: locLabel,
      status: "Pending",
      time: "Just now",
    });
    setSubmitted(true);
    setTimeout(() => navigate("student-dashboard"), 1800);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
      {submitted && (
        <div className="absolute top-12 left-4 right-4 z-50 bg-green-600 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
          <CheckCircle size={18} /><p className="font-semibold text-sm">Equipment request submitted!</p>
        </div>
      )}
      <div className="pt-10 pb-6 px-5" style={{ background: GRADIENT_HEADER }}>
        <button onClick={() => navigate("student-dashboard")} className="flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Package size={13} className="text-white" />
          </div>
          <p className="text-white/80 text-[10px] font-bold tracking-widest">EQUIPMENT REQUEST</p>
        </div>
        <h2 className="text-white font-bold text-2xl">Equipment Request</h2>
        <p className="text-white/70 text-sm">Request items for your room</p>
      </div>

      <div className="flex-1 bg-gray-50 px-4 pt-5 pb-2 space-y-4">
        {/* Building / Specific Room — two-tier dropdowns */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          {/* Dropdown 1: Building/Location */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">BUILDING / LOCATION</p>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select aria-label="Building" value={building} onChange={e => { setBuilding(e.target.value); setCustomBuilding(""); setSpecificRoom(""); setCustomRoom(""); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-3 text-sm text-gray-600 outline-none appearance-none">
                <option value="">Select building...</option>
                {[...CAMPUS_AREAS, "Others"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {building === "Others" && (
              <input aria-label="e.g. Annex Building, Extension Campus" className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none placeholder-gray-400"
                placeholder="e.g. Annex Building, Extension Campus"
                value={customBuilding} onChange={e => setCustomBuilding(e.target.value)} />
            )}
          </div>

          {/* Dropdown 2: Specific Room */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">SPECIFIC ROOM</p>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select aria-label="Room" value={specificRoom} onChange={e => { setSpecificRoom(e.target.value); setCustomRoom(""); }}
                disabled={!building}
                className={`w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-3 text-sm outline-none appearance-none transition-opacity ${!building ? "text-gray-300 opacity-60 cursor-not-allowed" : "text-gray-600"}`}>
                <option value="">{building ? "Select a room..." : "Select a building first"}</option>
                {roomOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {specificRoom === "Others" && (
              <input aria-label="e.g. Room 404, Computer Lab B" className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none placeholder-gray-400"
                placeholder="e.g. Room 404, Computer Lab B"
                value={customRoom} onChange={e => setCustomRoom(e.target.value)} />
            )}
          </div>
        </div>

        {/* Items needed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-3">ITEMS NEEDED</p>
          <div className="space-y-3">
            {EQUIP_ITEMS.map(item => (
              <div key={item}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{item}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button aria-label={`Decrease ${item}`} onClick={() => adjust(item, -1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Minus size={12} className="text-gray-500" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-900">{qtys[item] ?? 0}</span>
                    <button aria-label={`Increase ${item}`} onClick={() => adjust(item, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: GRADIENT_HEADER }}>
                      <Plus size={12} className="text-white" />
                    </button>
                  </div>
                </div>
                {item === "Others" && (qtys[item] ?? 0) > 0 && (
                  <input aria-label="Specify item..." className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none placeholder-gray-400"
                    placeholder="Specify item..."
                    value={othersText} onChange={e => setOthersText(e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Needed by */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-2">NEEDED BY — JUNE 2026</p>
          <DateChips selected={neededDate} onSelect={setNeededDate} />
        </div>

        <button onClick={handleSubmit} disabled={submitted}
          className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-2"
          style={{ background: submitted ? "#86efac" : GRADIENT_HEADER }}>
          <Send size={16} /> Submit Equipment Request
        </button>
      </div>

      <StudentBottomNav active="equipment" navigate={navigate} onGsoTap={() => setShowAuth(true)} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ─── USER MANAGEMENT (SuperAdmin dedicated screen) ────────────────────────────
type UMTab = "Students" | "Technicians" | "Admins" | "Users";

function UserManagement({ navigate }: { navigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<UMTab>("Students");
  const [studentList, setStudentList] = useState(STUDENTS);
  const [techList, setTechList] = useState(TECHNICIANS);
  const [adminList, setAdminList] = useState(ADMINS);
  const [userList, setUserList] = useState<AppUser[]>(INIT_APP_USERS);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [idField, setIdField] = useState("");
  const [extraField, setExtraField] = useState("");

  const addPlaceholder: Record<UMTab, { id: string; extra: string }> = {
    Students:    { id: "Student ID (e.g. 2024-00001)", extra: "" },
    Technicians: { id: "Tech ID (e.g. TECH-007)",      extra: "Zone (e.g. Main Campus)" },
    Admins:      { id: "Username (e.g. admin.lastname)", extra: "Zone Managed" },
    Users:       { id: "Role (e.g. Faculty / Staff)",   extra: "Department / College" },
  };

  const handleAdd = () => {
    if (!name || !idField) return;
    if (tab === "Students")    setStudentList(l => [...l, { id: `s${Date.now()}`, name, studentId: idField, status: "Active" as const, submissions: 0, lastActivity: "Just now" }]);
    if (tab === "Technicians") setTechList(l => [...l, { id: `t${Date.now()}`, name, techId: idField, zone: extraField || "Unassigned", status: "Active" as const, activeTasks: 0 }]);
    if (tab === "Admins")      setAdminList(l => [...l, { id: `a${Date.now()}`, name, username: idField, zoneManaged: extraField || "Unassigned", usersUnder: 0, status: "Active" as const }]);
    if (tab === "Users")       setUserList(l => [...l, { id: `u${Date.now()}`, name, role: idField, department: extraField || "Unassigned" }]);
    setName(""); setIdField(""); setExtraField(""); setShowAdd(false);
  };

  const rows = tab === "Students"
    ? studentList.map(s => ({ key: s.id, name: s.name, sub: s.studentId, badge: s.status, remove: () => setStudentList(l => l.filter(x => x.id !== s.id)) }))
    : tab === "Technicians"
    ? techList.map(t => ({ key: t.id, name: t.name, sub: `${t.techId} · ${t.zone}`, badge: t.status, remove: () => setTechList(l => l.filter(x => x.id !== t.id)) }))
    : tab === "Admins"
    ? adminList.map(a => ({ key: a.id, name: a.name, sub: `${a.username} · ${a.zoneManaged}`, badge: a.status, remove: () => setAdminList(l => l.filter(x => x.id !== a.id)) }))
    : userList.map(u => ({ key: u.id, name: u.name, sub: `${u.role} · ${u.department}`, badge: "Active", remove: () => setUserList(l => l.filter(x => x.id !== u.id)) }));

  return (
    <div className="flex flex-col min-h-[100dvh] relative">
      <div className="pt-10 pb-5 px-5" style={{ background: GRADIENT_HEADER }}>
        <button onClick={() => navigate("superadmin-dashboard")} className="flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Users size={13} className="text-white" />
          </div>
          <p className="text-white/80 text-[10px] font-bold tracking-widest">USER MANAGEMENT</p>
        </div>
        <h2 className="text-white font-bold text-2xl">Manage Users</h2>
        <p className="text-white/70 text-sm">Students · Technicians · Admins · Users</p>
      </div>

      <div className="flex-1 bg-gray-50 px-4 pt-4 pb-2">
        {/* Segmented control — 4 tabs, smaller text */}
        <div className="flex rounded-2xl bg-white border border-gray-200 p-1 mb-4 shadow-sm gap-0.5">
          {(["Students","Technicians","Admins","Users"] as UMTab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowAdd(false); }}
              className={`flex-1 py-2 rounded-xl text-[10px] font-semibold transition-all ${tab === t ? "text-white shadow-sm" : "text-gray-500"}`}
              style={tab === t ? { background: GRADIENT_HEADER } : {}}>
              {t}
            </button>
          ))}
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest">{tab.toUpperCase()} ({rows.length})</p>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 text-[#810000] text-xs font-semibold">
            <PlusCircle size={13} /> Add {tab.replace(/s$/, "")}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <input aria-label="Full Name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-2 placeholder-gray-400"
              placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <input aria-label={addPlaceholder[tab].id} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-2 placeholder-gray-400"
              placeholder={addPlaceholder[tab].id} value={idField} onChange={e => setIdField(e.target.value)} />
            {addPlaceholder[tab].extra && (
              <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none mb-2 placeholder-gray-400"
                aria-label={addPlaceholder[tab].extra} placeholder={addPlaceholder[tab].extra} value={extraField} onChange={e => setExtraField(e.target.value)} />
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 font-medium">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: GRADIENT_HEADER }}>Add</button>
            </div>
          </div>
        )}

        <table className="responsive-table">
          <caption className="sr-only">{tab} directory</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Identification / assignment</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={4}>No {tab} yet</td></tr> : rows.map(r => (
            <tr key={r.key}>
              <td data-label="Name" className="font-semibold">{r.name}</td>
              <td data-label="Identification / assignment">{r.sub}</td>
              <td data-label="Status"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">{r.badge}</span></td>
              <td data-label="Actions"><button aria-label={`Remove ${r.name}`} onClick={r.remove} className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><Trash2 size={14} />Remove</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export interface Submission {
  id: string;
  title: string;
  location: string;
  status: WorkOrderStatus;
  time: string;
}

export function UMSS() {
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const logout = () => { void auth.signOut().catch(cause => setLogoutError(cause instanceof Error ? cause.message : "Unable to sign out")); };
  if (auth.loading) return <StudentShell><div className="flex items-center justify-center p-6" role="status">Verifying your session?</div></StudentShell>;
  if (!auth.profile) return <StudentShell login><LoginScreen signIn={auth.signIn} accountError={auth.error || logoutError} onSignOut={auth.session ? logout : undefined} /></StudentShell>;
  return <WorkOrdersProvider key={auth.profile.id + auth.profile.role} user={auth.profile}>
    {logoutError && <p role="alert" className="bg-red-50 p-3 text-center text-sm text-red-700">{logoutError}</p>}
    <WorkOrderFeedback />
    <AuthenticatedUMSS profile={auth.profile} logout={logout} />
  </WorkOrdersProvider>;
}

function AuthenticatedUMSS({ profile, logout }: { profile: Profile; logout: () => void }) {
  const [requested, setRequested] = useState<Screen>(getInitialScreen);
  const [demoSubmissions, setDemoSubmissions] = useState<Submission[]>([]);
  const { displayOrders } = useWorkOrders();
  const screen = protectedScreen(profile.role, requested);
  const user: CurrentUser = { name: profile.full_name, id: profile.university_id || profile.username || profile.id, role: profile.role };
  const navigate = (next: Screen) => setRequested(protectedScreen(profile.role, next));
  const addDemoSubmission = (submission: Submission) => setDemoSubmissions(current => [submission, ...current]);
  const submissions: Submission[] = displayOrders.map(order => ({ id: order.id, title: order.title, location: order.location, status: order.status, time: order.date }));
  useEffect(() => { window.scrollTo({ top: 0 }); }, [screen]);
  const studentScreens: Screen[] = ["student-dashboard", "qr-review", "report-form", "campus-assistant", "room-reservation", "equipment-request"];
  const demoNotice = <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">QR reviews, room/equipment requests, directories and audit previews are demos. Changes to those features are not saved.</p>;
  return <>
    {studentScreens.includes(screen) && <StudentShell>
      {screen !== "report-form" && demoNotice}
      {screen === "student-dashboard" && <StudentDashboard user={user} navigate={navigate} logout={logout} submissions={submissions} demoSubmissions={demoSubmissions} />}
      {screen === "qr-review" && <QrReview navigate={navigate} onSubmit={addDemoSubmission} />}
      {screen === "report-form" && <LiveReportForm onBack={() => navigate(homeScreen(profile.role))} />}
      {screen === "campus-assistant" && <CampusAssistant navigate={navigate} />}
      {screen === "room-reservation" && <RoomReservation navigate={navigate} onSubmit={addDemoSubmission} />}
      {screen === "equipment-request" && <EquipmentRequest navigate={navigate} onSubmit={addDemoSubmission} />}
    </StudentShell>}
    {screen === "technician-queue" && <ApplicationShell title="Maintenance Queue" roleLabel="Technician" user={user} active="queue" onLogout={logout}
      items={[{ id: "queue", label: "Work-order Queue", icon: Wrench, onSelect: () => {} }]}><LiveTechnicianQueue /></ApplicationShell>}
    {screen === "admin-dashboard" && <>{demoNotice}<AdminDashboard user={user} logout={logout} navigate={navigate} /></>}
    {screen === "superadmin-dashboard" && <>{demoNotice}<SuperAdminDashboard user={user} logout={logout} navigate={navigate} /></>}
    {screen === "user-management" && <>{demoNotice}<ApplicationShell title="User Management (demo)" roleLabel="SuperAdmin" user={user} active="manage" onLogout={logout}
      items={[
        { id: "dashboard", label: "Dashboard", icon: BarChart2, onSelect: () => navigate("superadmin-dashboard") },
        { id: "manage", label: "User Management (demo)", icon: Users, onSelect: () => {} },
      ]}><UserManagement navigate={navigate} /></ApplicationShell></>}
  </>;
}
