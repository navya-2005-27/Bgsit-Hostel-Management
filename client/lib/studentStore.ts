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
