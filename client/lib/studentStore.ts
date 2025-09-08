export type StudentId = string;

export type StudentDetails = {
  name: string;
  parentName: string;
  parentContact: string;
  studentContact: string;
  address: string;
  email: string;
  totalAmount: number | null;
  joiningDate: string; // ISO date
  profilePhotoDataUrl?: string; // base64 preview
  documents?: { name: string; dataUrl: string }[];
};

export type StudentCredentials = {
  username: string;
  password: string; // kept only in warden space
};

export type StudentRecord = {
  id: StudentId;
  details: StudentDetails;
  credentials?: StudentCredentials; // optional until created
};

const STORAGE_KEY = "campusstay.students.v1";

function readAll(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudentRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(students: StudentRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listStudents(): StudentRecord[] {
  return readAll();
}

export function getStudent(id: StudentId): StudentRecord | undefined {
  return readAll().find((s) => s.id === id);
}

export function upsertStudent(record: StudentRecord): StudentRecord {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === record.id);
  if (idx >= 0) all[idx] = record; else all.push(record);
  writeAll(all);
  return record;
}

export function createStudent(details: Partial<StudentDetails> & { name: string }): StudentRecord {
  const record: StudentRecord = {
    id: uid(),
    details: {
      name: details.name,
      parentName: details.parentName ?? "",
      parentContact: details.parentContact ?? "",
      studentContact: details.studentContact ?? "",
      address: details.address ?? "",
      email: details.email ?? "",
      totalAmount: details.totalAmount ?? null,
      joiningDate: details.joiningDate ?? "",
      profilePhotoDataUrl: details.profilePhotoDataUrl,
      documents: details.documents ?? [],
    },
  };
  return upsertStudent(record);
}

export function setCredentials(id: StudentId, creds: StudentCredentials) {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Student not found");
  all[idx] = { ...all[idx], credentials: creds };
  writeAll(all);
}

export function resetPassword(id: StudentId, newPassword: string) {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Student not found");
  const current = all[idx];
  all[idx] = { ...current, credentials: current.credentials ? { ...current.credentials, password: newPassword } : undefined };
  writeAll(all);
}

export type StudentPublicView = {
  id: StudentId;
  details: StudentDetails;
  username?: string; // optional for convenience, but no password
};

export function getStudentPublic(id: StudentId): StudentPublicView | undefined {
  const s = getStudent(id);
  if (!s) return undefined;
  return { id: s.id, details: s.details, username: s.credentials?.username };
}

export function updateDetails(id: StudentId, patch: Partial<StudentDetails>) {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("Student not found");
  all[idx] = { ...all[idx], details: { ...all[idx].details, ...patch } };
  writeAll(all);
}

export function importFilesToDataUrls(files: FileList | File[]): Promise<{ name: string; dataUrl: string }[]> {
  const arr = Array.from(files);
  return Promise.all(
    arr.map(
      (file) =>
        new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result) });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function suggestUsername(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const tail = Math.floor(1000 + Math.random() * 9000);
  return `${clean || "student"}.${tail}`;
}

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// -------------------- Attendance & Geofencing (frontend-only demo) --------------------
export type GeoPoint = { lat: number; lng: number };
export type HostelSettings = { center: GeoPoint; radiusM: number };

export type AttendanceSession = {
  id: string;
  token: string;
  dateKey: string; // YYYY-MM-DD
  createdAt: number;
  expiresAt: number;
  locked: boolean;
};

export type AttendanceRecord = {
  studentId: StudentId;
  dateKey: string;
  time: string; // ISO
  status: "present" | "absent";
  location?: GeoPoint;
};

const SESSIONS_KEY = "campusstay.attendance.sessions.v1";
const RECORDS_KEY = "campusstay.attendance.records.v1";
const SETTINGS_KEY = "campusstay.hostel.settings.v1";

export function dateKey(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

function readSessions(): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as AttendanceSession[]) : [];
  } catch {
    return [];
  }
}
function writeSessions(s: AttendanceSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
}
function readRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch {
    return [];
  }
}
function writeRecords(r: AttendanceRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(r));
}

export function getHostelSettings(): HostelSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as HostelSettings) : null;
  } catch {
    return null;
  }
}
export function setHostelSettings(settings: HostelSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function haversineMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function withinFence(point: GeoPoint): boolean {
  const s = getHostelSettings();
  if (!s) return true; // if not configured, allow for demo
  return haversineMeters(point, s.center) <= s.radiusM;
}

export function createAttendanceSession({ durationMs = 60 * 60 * 1000, forDate = dateKey() } = {}) {
  const now = Date.now();
  const session: AttendanceSession = {
    id: uid(),
    token: `QR-${uid()}`,
    dateKey: forDate,
    createdAt: now,
    expiresAt: now + durationMs,
    locked: false,
  };
  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);
  return session;
}

export function getActiveAttendanceSession(): AttendanceSession | null {
  const now = Date.now();
  return readSessions().find((s) => now < s.expiresAt && !s.locked) || null;
}

export function lockAttendance(date: string) {
  const sessions = readSessions();
  for (const s of sessions) {
    if (s.dateKey === date) s.locked = true;
  }
  writeSessions(sessions);
}

export function listAttendanceForDate(date: string): AttendanceRecord[] {
  return readRecords().filter((r) => r.dateKey === date);
}

export function setManualPresence(date: string, studentId: StudentId, present: boolean) {
  const recs = readRecords();
  const idx = recs.findIndex((r) => r.dateKey === date && r.studentId === studentId);
  const base: AttendanceRecord = {
    studentId,
    dateKey: date,
    time: new Date().toISOString(),
    status: present ? "present" : "absent",
  };
  if (idx >= 0) recs[idx] = { ...recs[idx], ...base };
  else recs.push(base);
  writeRecords(recs);
}

export function finalizeAttendance(date: string) {
  const allStudents = listStudents();
  const recs = readRecords();
  const presentSet = new Set(recs.filter((r) => r.dateKey === date && r.status === "present").map((r) => r.studentId));
  for (const s of allStudents) {
    if (!presentSet.has(s.id)) {
      const existingIdx = recs.findIndex((r) => r.dateKey === date && r.studentId === s.id);
      const base: AttendanceRecord = {
        studentId: s.id,
        dateKey: date,
        time: new Date().toISOString(),
        status: "absent",
      };
      if (existingIdx >= 0) recs[existingIdx] = { ...recs[existingIdx], ...base };
      else recs.push(base);
    }
  }
  writeRecords(recs);
  lockAttendance(date);
}

export function markAttendanceWithToken(token: string, studentId: StudentId, point?: GeoPoint) {
  const session = getActiveAttendanceSession();
  if (!session || session.token !== token) throw new Error("Invalid or expired QR");
  if (Date.now() > session.expiresAt) throw new Error("QR expired");
  if (point && !withinFence(point)) throw new Error("Outside hostel geofence");

  const recs = readRecords();
  const idx = recs.findIndex((r) => r.dateKey === session.dateKey && r.studentId === studentId);
  const base: AttendanceRecord = {
    studentId,
    dateKey: session.dateKey,
    time: new Date().toISOString(),
    status: "present",
    location: point,
  };
  if (idx >= 0) recs[idx] = { ...recs[idx], ...base };
  else recs.push(base);
  writeRecords(recs);
  return base;
}

export function getAbsenteesForDate(date: string): StudentRecord[] {
  const recs = listAttendanceForDate(date);
  const presentSet = new Set(recs.filter((r) => r.status === "present").map((r) => r.studentId));
  return listStudents().filter((s) => !presentSet.has(s.id));
}

export function formatWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// -------------------- Mess Polling (frontend-only demo) --------------------
export const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;
export type WeekDay = typeof WEEK_DAYS[number];
export const MEALS3 = ["Breakfast","Lunch","Dinner"] as const;
export type Meal3 = typeof MEALS3[number];
export const MEAL_SLOTS = ["Milk","Breakfast","Lunch","Snacks","Dinner"] as const;
export type MealSlot = typeof MEAL_SLOTS[number];

export type WeeklyPoll = {
  id: string;
  weekKey: string; // Monday date key
  open: boolean;
  options: Record<WeekDay, Record<Meal3, string[]>>;
  votes: Record<StudentId, Partial<Record<WeekDay, Partial<Record<Meal3, string>>>>>;
};
export type WeeklyMenu = Record<WeekDay, Record<Meal3, string>>;

export type DailyMealPoll = {
  id: string;
  dateKey: string;
  meal: MealSlot;
  menuText?: string;
  cutoffAt: number;
  open: boolean;
  responses: Record<StudentId, "eating" | "not">;
};

const WEEKLY_POLLS_KEY = "campusstay.mess.weekly.polls.v1";
const WEEKLY_MENUS_KEY = "campusstay.mess.weekly.menus.v1"; // { [weekKey]: WeeklyMenu }
const DAILY_MEAL_POLLS_KEY = "campusstay.mess.daily.polls.v1";

function readWeeklyPolls(): WeeklyPoll[] {
  try { const raw = localStorage.getItem(WEEKLY_POLLS_KEY); return raw ? JSON.parse(raw) as WeeklyPoll[] : []; } catch { return []; }
}
function writeWeeklyPolls(p: WeeklyPoll[]) { localStorage.setItem(WEEKLY_POLLS_KEY, JSON.stringify(p)); }
function readWeeklyMenus(): Record<string, WeeklyMenu> { try { const raw = localStorage.getItem(WEEKLY_MENUS_KEY); return raw ? JSON.parse(raw) as Record<string, WeeklyMenu> : {}; } catch { return {}; } }
function writeWeeklyMenus(m: Record<string, WeeklyMenu>) { localStorage.setItem(WEEKLY_MENUS_KEY, JSON.stringify(m)); }
function readDailyMealPolls(): DailyMealPoll[] { try { const raw = localStorage.getItem(DAILY_MEAL_POLLS_KEY); return raw ? JSON.parse(raw) as DailyMealPoll[] : []; } catch { return []; } }
function writeDailyMealPolls(p: DailyMealPoll[]) { localStorage.setItem(DAILY_MEAL_POLLS_KEY, JSON.stringify(p)); }

export function weekStartKey(d = new Date()) {
  const day = d.getDay(); // 0 Sun -> 6 Sat
  const delta = (day + 6) % 7; // to Monday
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - delta);
  return dateKey(monday);
}

export function createWeeklyPoll(optionsForAllMeals: string[] = ["Idli","Upma","Poha","Dosa","Paratha"]) {
  const week = weekStartKey();
  const base: Record<Meal3, string[]> = { Breakfast: optionsForAllMeals, Lunch: optionsForAllMeals, Dinner: optionsForAllMeals };
  const options: WeeklyPoll["options"] = Object.fromEntries(WEEK_DAYS.map((d) => [d, { ...base }])) as any;
  const poll: WeeklyPoll = { id: uid(), weekKey: week, open: true, options, votes: {} };
  const polls = readWeeklyPolls();
  polls.push(poll);
  writeWeeklyPolls(polls);
  return poll;
}

export function getActiveWeeklyPoll(): WeeklyPoll | null {
  const wk = weekStartKey();
  const polls = readWeeklyPolls();
  return polls.find((p) => p.weekKey === wk && p.open) || null;
}

export function voteWeekly(day: WeekDay, meal: Meal3, option: string, studentId: StudentId) {
  const poll = getActiveWeeklyPoll();
  if (!poll) throw new Error("No active weekly poll");
  if (!poll.options[day][meal].includes(option)) throw new Error("Invalid option");
  poll.votes[studentId] = poll.votes[studentId] || {};
  poll.votes[studentId]![day] = poll.votes[studentId]![day] || {};
  (poll.votes[studentId]![day] as any)[meal] = option;
  const polls = readWeeklyPolls();
  const idx = polls.findIndex((p) => p.id === poll.id);
  polls[idx] = poll;
  writeWeeklyPolls(polls);
}

export function closeWeeklyPoll() {
  const poll = getActiveWeeklyPoll();
  if (!poll) return null;
  const menu: WeeklyMenu = Object.fromEntries(
    WEEK_DAYS.map((d) => [d, Object.fromEntries(MEALS3.map((m) => {
      const counts: Record<string, number> = {};
      Object.values(poll.votes).forEach((perStudent) => {
        const choice = (perStudent[d] || ({} as any))[m];
        if (choice) counts[choice] = (counts[choice] || 0) + 1;
      });
      let best = poll.options[d][m][0];
      let bestCount = -1;
      for (const opt of poll.options[d][m]) {
        const c = counts[opt] || 0;
        if (c > bestCount) { best = opt; bestCount = c; }
      }
      return [m, best];
    })) as Record<Meal3, string>])
  ) as any;

  poll.open = false;
  const polls = readWeeklyPolls();
  polls[polls.findIndex((p) => p.id === poll.id)] = poll;
  writeWeeklyPolls(polls);
  const menus = readWeeklyMenus();
  menus[poll.weekKey] = menu;
  writeWeeklyMenus(menus);
  return { poll, menu };
}

export function getWeeklyResults() {
  const poll = getActiveWeeklyPoll();
  const target = poll || readWeeklyPolls().slice(-1)[0];
  if (!target) return null;
  const totals = Object.keys(target.votes).length || 0;
  const result: Record<WeekDay, Record<Meal3, { option: string; percent: number }[]>> = {} as any;
  for (const d of WEEK_DAYS) {
    result[d] = {} as any;
    for (const m of MEALS3) {
      const counts: Record<string, number> = {};
      Object.values(target.votes).forEach((s) => {
        const choice = (s[d] || ({} as any))[m];
        if (choice) counts[choice] = (counts[choice] || 0) + 1;
      });
      result[d][m] = target.options[d][m].map((opt) => ({ option: opt, percent: totals ? Math.round(((counts[opt] || 0) / totals) * 100) : 0 }));
    }
  }
  return { poll: target, result, totals };
}

export function getMenuForWeek(weekKey = weekStartKey()): WeeklyMenu | null {
  const menus = readWeeklyMenus();
  return menus[weekKey] || null;
}

// Daily meal attendance polls
export function createDailyMealPoll(meal: MealSlot, { cutoffMinutes = 60, menuText = "" } = {}) {
  const dKey = dateKey();
  const p: DailyMealPoll = { id: uid(), dateKey: dKey, meal, menuText, cutoffAt: Date.now() + cutoffMinutes * 60 * 1000, open: true, responses: {} };
  const polls = readDailyMealPolls();
  polls.push(p);
  writeDailyMealPolls(polls);
  return p;
}

export function getActiveDailyMealPolls(forDate = dateKey()): DailyMealPoll[] {
  const now = Date.now();
  return readDailyMealPolls().filter((p) => p.dateKey === forDate && p.open && now < p.cutoffAt);
}

export function respondDailyMeal(studentId: StudentId, pollId: string, value: "eating" | "not") {
  const polls = readDailyMealPolls();
  const idx = polls.findIndex((p) => p.id === pollId);
  if (idx === -1) throw new Error("Poll not found");
  const p = polls[idx];
  if (!p.open || Date.now() > p.cutoffAt) throw new Error("Poll closed");
  p.responses[studentId] = value;
  polls[idx] = p;
  writeDailyMealPolls(polls);
}

export function closeDailyMealPoll(pollId: string) {
  const polls = readDailyMealPolls();
  const idx = polls.findIndex((p) => p.id === pollId);
  if (idx === -1) return;
  polls[idx].open = false;
  writeDailyMealPolls(polls);
}

export function listDailyPollsForDate(dKey = dateKey()) {
  return readDailyMealPolls().filter((p) => p.dateKey === dKey);
}

export function skippedMealsCount(studentId: StudentId, monthKey = new Date().toISOString().slice(0,7)) {
  const polls = readDailyMealPolls().filter((p) => p.dateKey.startsWith(monthKey));
  let count = 0;
  for (const p of polls) { if (p.responses[studentId] === "not") count++; }
  return count;
}
