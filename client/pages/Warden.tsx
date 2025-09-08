import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, KeyRound, RefreshCw, Plus, Eye, EyeOff, UploadCloud, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StudentRecord,
  StudentId,
  listStudents,
  createStudent,
  setCredentials,
  resetPassword,
  updateDetails,
  importFilesToDataUrls,
  suggestUsername,
  generatePassword,
} from "@/lib/studentStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Warden() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<StudentId | "new" | "">("");
  const [showPassword, setShowPassword] = useState(false);

  // Account form state
  const [studentName, setStudentName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Details form state
  const [details, setDetails] = useState({
    name: "",
    parentName: "",
    parentContact: "",
    studentContact: "",
    address: "",
    email: "",
    totalAmount: "",
    joiningDate: "",
    profilePhotoDataUrl: "",
    documents: [] as { name: string; dataUrl: string }[],
  });

  useEffect(() => {
    setStudents(listStudents());
  }, []);

  useEffect(() => {
    if (studentName && !username) setUsername(suggestUsername(studentName));
  }, [studentName, username]);

  const selected = useMemo(() => students.find((s) => s.id === selectedId), [students, selectedId]);

  const refresh = () => setStudents(listStudents());

  function handleCreateLogin() {
    const name = studentName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter student name first." });
      return;
    }
    const user = username.trim() || suggestUsername(name);
    const pass = password || generatePassword();

    const record = createStudent({ name });
    setCredentials(record.id, { username: user, password: pass });
    refresh();
    setSelectedId(record.id);
    setShowPassword(false);
    toast({ title: "Login created", description: `Username: ${user}` });
  }

  function handleResetPassword() {
    if (!selected) {
      toast({ title: "Select a student", description: "Choose a student to reset password." });
      return;
    }
    const pass = generatePassword();
    resetPassword(selected.id, pass);
    refresh();
    setShowPassword(false);
    toast({ title: "Password reset", description: `New password generated.` });
  }

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    let id = selected?.id;
    if (!id) {
      const rec = createStudent({ name: details.name || studentName || "Unnamed" });
      id = rec.id;
    }
    updateDetails(id!, {
      name: details.name,
      parentName: details.parentName,
      parentContact: details.parentContact,
      studentContact: details.studentContact,
      address: details.address,
      email: details.email,
      totalAmount: details.totalAmount ? Number(details.totalAmount) : null,
      joiningDate: details.joiningDate,
      profilePhotoDataUrl: details.profilePhotoDataUrl || undefined,
      documents: details.documents,
    });
    refresh();
    setSelectedId(id!);
    toast({ title: "Member saved", description: "Details stored locally (demo)." });
  }

  async function onUploadPhoto(files?: FileList | null) {
    if (!files || !files.length) return;
    const [img] = await importFilesToDataUrls([files[0]]);
    setDetails((d) => ({ ...d, profilePhotoDataUrl: img.dataUrl }));
  }

  async function onUploadDocs(files?: FileList | null) {
    if (!files || !files.length) return;
    const docs = await importFilesToDataUrls(files);
    setDetails((d) => ({ ...d, documents: [...(d.documents || []), ...docs] }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Warden Section</h1>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList>
            <TabsTrigger value="account">Student Account Management</TabsTrigger>
            <TabsTrigger value="details">Add Member Details</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Create Student Login</CardTitle>
                  <CardDescription>Generate username and password for a student. Only warden can view/change credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Student Name</Label>
                    <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Riya Sharma" />
                  </div>
                  <div>
                    <Label>Username</Label>
                    <div className="flex gap-2">
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="auto-generated" />
                      <Button type="button" variant="secondary" onClick={() => setUsername(suggestUsername(studentName || "student"))}>Suggest</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="flex gap-2">
                      <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="auto-generated" />
                      <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())}>Generate</Button>
                      <Button type="button" variant="outline" onClick={() => setShowPassword((s) => !s)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Credentials are visible only here (warden). Not shown in student view.</p>
                  </div>
                  <Button onClick={handleCreateLogin} className="w-full"><Plus className="mr-2 h-4 w-4" /> Create Login</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Reset Password</CardTitle>
                  <CardDescription>Select a student and issue a new password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Student</Label>
                    <Select value={selectedId} onValueChange={(v) => setSelectedId(v as StudentId)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose a student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.details.name} {s.credentials ? `(@${s.credentials.username})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selected?.credentials ? (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Current username</span>
                        <span className="font-medium">@{selected.credentials.username}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span>Password (warden only)</span>
                        <span className="font-mono">{showPassword ? selected.credentials.password : "••••••••"}</span>
                      </div>
                    </div>
                  ) : null}
                  <Button onClick={handleResetPassword} disabled={!selected}><RefreshCw className="mr-2 h-4 w-4" /> Issue new password</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <form onSubmit={handleSubmitDetails} className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Add Member Details</CardTitle>
                    <CardDescription>Fill student information. On submit, data is stored locally and mirrored to student view (except password).</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Name</Label>
                      <Input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Parent’s Name</Label>
                      <Input value={details.parentName} onChange={(e) => setDetails({ ...details, parentName: e.target.value })} />
                    </div>
                    <div>
                      <Label>Parent’s Contact Number</Label>
                      <Input value={details.parentContact} onChange={(e) => setDetails({ ...details, parentContact: e.target.value })} inputMode="tel" />
                    </div>
                    <div>
                      <Label>Student Contact Number</Label>
                      <Input value={details.studentContact} onChange={(e) => setDetails({ ...details, studentContact: e.target.value })} inputMode="tel" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Address</Label>
                      <Textarea value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
                    </div>
                    <div>
                      <Label>Total Amount / Hostel Fee</Label>
                      <Input type="number" value={details.totalAmount} onChange={(e) => setDetails({ ...details, totalAmount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Joining Date</Label>
                      <Input type="date" value={details.joiningDate} onChange={(e) => setDetails({ ...details, joiningDate: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5" /> Uploads</CardTitle>
                    <CardDescription>Upload profile photo and documents (ID proof, admission letter, etc.).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Profile Photo</Label>
                      <Input type="file" accept="image/*" onChange={(e) => onUploadPhoto(e.currentTarget.files)} />
                      {details.profilePhotoDataUrl ? (
                        <img src={details.profilePhotoDataUrl} alt="Profile" className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border" />
                      ) : null}
                    </div>
                    <div>
                      <Label>Documents</Label>
                      <Input type="file" multiple onChange={(e) => onUploadDocs(e.currentTarget.files)} />
                      {details.documents?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                          {details.documents.map((d, i) => (
                            <li key={i} className="truncate">{d.name}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <Button type="submit" className="w-full">Submit</Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Existing</CardTitle>
                    <CardDescription>Load an existing member to edit.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={selectedId} onValueChange={(v) => {
                      setSelectedId(v as StudentId);
                      const s = listStudents().find((x) => x.id === v);
                      if (s) setDetails({
                        name: s.details.name,
                        parentName: s.details.parentName,
                        parentContact: s.details.parentContact,
                        studentContact: s.details.studentContact,
                        address: s.details.address,
                        email: s.details.email,
                        totalAmount: s.details.totalAmount?.toString() || "",
                        joiningDate: s.details.joiningDate,
                        profilePhotoDataUrl: s.details.profilePhotoDataUrl || "",
                        documents: s.details.documents || [],
                      });
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose a student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.details.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Student Mirror Preview</CardTitle>
                    <CardDescription>What students can see (without password).</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selected ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium">{selected.details.name}</div>
                        <div className="text-muted-foreground">@{selected.credentials?.username || "no-username"}</div>
                        {selected.details.profilePhotoDataUrl ? (
                          <img src={selected.details.profilePhotoDataUrl} alt="Profile" className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border" />
                        ) : null}
                        <div className="mt-2">Parent: {selected.details.parentName || "-"}</div>
                        <div>Parent Contact: {selected.details.parentContact || "-"}</div>
                        <div>Student Contact: {selected.details.studentContact || "-"}</div>
                        <div>Email: {selected.details.email || "-"}</div>
                        <div>Address: {selected.details.address || "-"}</div>
                        <div>Total Amount: {selected.details.totalAmount ?? "-"}</div>
                        <div>Joining Date: {selected.details.joiningDate || "-"}</div>
                        {selected.details.documents?.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {selected.details.documents.map((d, i) => (
                              <li key={i} className="truncate">{d.name}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Select a student to preview</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
