import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listStudents,
  getStudentPublic,
  StudentId,
  getActiveAttendanceSession,
  markAttendanceWithToken,
  getActiveWeeklyPoll,
  WEEK_DAYS,
  MEALS3,
  voteWeekly,
  getActiveDailyMealPolls,
  respondDailyMeal,
  MEAL_SLOTS,
  skippedMealsCount,
  authenticateStudent,
  getCurrentStudentId,
  logoutStudent,
  COMPLAINT_CATEGORIES,
  createComplaint,
} from "@/lib/studentStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ComplaintFeed } from "./components.complaints-feed";
import { EventFeed, EventProposalForm } from "./components.events.student";
import { StudentIDCard } from "./components.student-id";
import { Input } from "@/components/ui/input";
import { StudentRoomsPanel } from "./components.rooms.student";
import { StudentParcelsPanel } from "./components.parcels.student";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Student() {
  const [students, setStudents] = useState(listStudents());
  const [selectedId, setSelectedId] = useState<StudentId | "">("");
  const [now, setNow] = useState(Date.now());
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>("");
  const weekly = getActiveWeeklyPoll();
  const [dailyPolls, setDailyPolls] = useState(getActiveDailyMealPolls());
  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [geoDialog, setGeoDialog] = useState<{
    open: boolean;
    title: string;
    desc?: string;
  }>({ open: false, title: "", desc: "" });

  useEffect(() => {
    const current = getCurrentStudentId();
    if (current) setSelectedId(current);
    const i = setInterval(() => {
      setNow(Date.now());
      setDailyPolls(getActiveDailyMealPolls());
    }, 1500);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    setStudents(listStudents());
  }, [now]);

  const selected = useMemo(
    () => (selectedId ? getStudentPublic(selectedId) : undefined),
    [selectedId, now],
  );
  const active = getActiveAttendanceSession();

  async function scanWithCamera() {
    try {
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => setTimeout(r, 500));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No ctx");
      ctx.drawImage(video, 0, 0);
      const bitmap = await createImageBitmap(canvas);
      const codes = await detector.detect(bitmap as any);
      stream.getTracks().forEach((t) => t.stop());
      if (codes && codes[0]?.rawValue) setToken(String(codes[0].rawValue));
      else alert("Could not read QR. Try manual entry.");
    } catch {
      alert("Camera scan not supported. Enter code manually.");
    }
  }

  async function mark() {
    if (!selected) {
      setStatus("Select your profile first.");
      return;
    }
    if (!token) {
      setStatus("Enter or scan QR token.");
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      markAttendanceWithToken(token, selected.id, point);
      setStatus("✔ Attendance Marked for Today.");
    } catch (e: any) {
      const msg: string = e?.message || "Could not mark attendance.";
      setStatus(msg);
      let title = "Attendance error";
      if (/denied|permission/i.test(msg)) title = "Location permission denied";
      if (/geofence/i.test(msg)) title = "Outside geofence";
      setGeoDialog({ open: true, title, desc: msg });
    }
  }

  const defaultTab = selectedId ? "profile" : "login";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start gap-2 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="login" className="rounded-full">
              Login
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full">
              Profile
            </TabsTrigger>
            <TabsTrigger value="id" className="rounded-full">
              ID Card
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-full">
              Attendance
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-full">
              Weekly Menu
            </TabsTrigger>
            <TabsTrigger value="meals" className="rounded-full">
              Today's Meals
            </TabsTrigger>
            <TabsTrigger value="complaints" className="rounded-full">
              Complaints
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-full">
              Events
            </TabsTrigger>
            <TabsTrigger value="rooms" className="rounded-full">
              Rooms
            </TabsTrigger>
            <TabsTrigger value="parcels" className="rounded-full">
              Parcels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Login</CardTitle>
                <CardDescription>
                  Sign in with your roll number and password provided by the
                  warden.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Roll number</Label>
                  <Input
                    placeholder="e.g. 22CSE123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const s = authenticateStudent(username, password);
                      if (s) {
                        setSelectedId(s.id);
                        setUsername("");
                        setPassword("");
                      } else {
                        alert("Invalid credentials");
                      }
                    }}
                  >
                    Login
                  </Button>
                  {selectedId ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        logoutStudent();
                        setSelectedId("");
                      }}
                    >
                      Logout
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Section</CardTitle>
                <CardDescription>
                  View your stored information. Contact warden for any changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Select
                    value={selectedId}
                    onValueChange={(v) => setSelectedId(v as StudentId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.details.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selected ? (
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{selected.details.name}</div>
                    <div className="text-muted-foreground">
                      Roll: {selected.username || "-"}
                    </div>
                    {selected.details.profilePhotoDataUrl ? (
                      <img
                        src={selected.details.profilePhotoDataUrl}
                        alt="Profile"
                        className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Select your profile to view details
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="id" className="mt-6">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle>Digital Student ID Card</CardTitle>
                  <CardDescription>
                    Show this at gates and facilities when needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentIDCard
                    data={{
                      id: selected.id,
                      name: selected.details.name,
                      contact: selected.details.studentContact,
                      photoDataUrl: selected.details.profilePhotoDataUrl,
                      hostelName: "BGSIT Girls Hostel",
                      username: selected.username,
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="text-sm text-muted-foreground">
                Login or select your profile to view your ID.
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>
                  {active
                    ? `QR valid until ${new Date(active.expiresAt).toLocaleTimeString()}`
                    : "Waiting for warden to start session."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    placeholder="Paste scanned QR token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={scanWithCamera}
                  >
                    Use Camera
                  </Button>
                </div>
                <Button onClick={mark} disabled={!active}>
                  Mark Attendance
                </Button>
                {status ? (
                  <div className="text-sm text-muted-foreground">{status}</div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Menu Poll</CardTitle>
                <CardDescription>
                  {weekly
                    ? "Vote for each meal this week."
                    : "No active weekly poll right now."}
                </CardDescription>
              </CardHeader>
              {weekly ? (
                <CardContent>
                  <Tabs defaultValue={WEEK_DAYS[0]}>
                    <TabsList className="flex flex-wrap gap-1">
                      {WEEK_DAYS.map((d) => (
                        <TabsTrigger key={d} value={d}>
                          {d}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {WEEK_DAYS.map((d) => (
                      <TabsContent
                        key={d}
                        value={d}
                        className="mt-4 grid gap-4 sm:grid-cols-3"
                      >
                        {MEALS3.map((m) => (
                          <div key={m} className="rounded-md border p-3">
                            <div className="mb-2 text-sm font-medium">{m}</div>
                            <RadioGroup
                              onValueChange={(opt) => {
                                if (selected)
                                  voteWeekly(
                                    d as any,
                                    m as any,
                                    opt,
                                    selected.id,
                                  );
                              }}
                            >
                              {weekly.options[d][m].map((opt) => (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <RadioGroupItem value={opt} />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </RadioGroup>
                          </div>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="meals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Meals</CardTitle>
                <CardDescription>Eating / Not Eating</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailyPolls.length ? (
                  dailyPolls.map((p) => (
                    <div key={p.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>
                          {p.meal} {p.menuText ? `• ${p.menuText}` : ""}
                        </span>
                        <span className="text-muted-foreground">
                          Cutoff {new Date(p.cutoffAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (selected)
                              respondDailyMeal(selected.id, p.id, "eating");
                          }}
                        >
                          Eating
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (selected)
                              respondDailyMeal(selected.id, p.id, "not");
                          }}
                        >
                          Not Eating
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No active meal polls yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="mt-6">
            <StudentRoomsPanel
              studentId={selectedId}
              onUpdated={() => setNow(Date.now())}
            />
          </TabsContent>

          <TabsContent value="parcels" className="mt-6">
            <StudentParcelsPanel studentId={selectedId} />
          </TabsContent>

          <TabsContent value="complaints" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Anonymous Complaints</CardTitle>
                <CardDescription>
                  Submit without your name. Upvote issues you also face.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement;
                    const t = (
                      form.elements.namedItem(
                        "complaintText",
                      ) as HTMLTextAreaElement
                    ).value.trim();
                    const c = (
                      form.elements.namedItem(
                        "complaintCategory",
                      ) as HTMLSelectElement
                    ).value as any;
                    if (!t) return;
                    createComplaint(t, c);
                    form.reset && form.reset();
                    setNow(Date.now());
                  }}
                >
                  <div>
                    <Label>Complaint Text</Label>
                    <Textarea
                      name="complaintText"
                      placeholder="Describe the issue"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      name="complaintCategory"
                      className="w-full rounded-md border bg-background px-2 py-2"
                    >
                      {COMPLAINT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Submit</Button>
                </form>

                <div className="pt-2">
                  <div className="mb-2 text-sm font-medium">Complaint Feed</div>
                  <ComplaintFeed />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Events</CardTitle>
                <CardDescription>
                  Browse and register for upcoming events. Comment to ask
                  questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EventFeed selectedId={selectedId as any} />
              </CardContent>
            </Card>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Propose an Event</CardTitle>
                <CardDescription>
                  Submit for warden approval. Approved events appear in the
                  feed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventProposalForm onSubmitted={() => setNow(Date.now())} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={geoDialog.open}
          onOpenChange={(o) => setGeoDialog((s) => ({ ...s, open: o }))}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {geoDialog.title || "Location required"}
              </AlertDialogTitle>
              {geoDialog.desc ? (
                <AlertDialogDescription>
                  {geoDialog.desc}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() =>
                  setGeoDialog({ open: false, title: "", desc: "" })
                }
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
