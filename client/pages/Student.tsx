import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents, getStudentPublic, StudentId, getActiveAttendanceSession, markAttendanceWithToken, // Mess
  getActiveWeeklyPoll, WEEK_DAYS, MEALS3, voteWeekly, getActiveDailyMealPolls, respondDailyMeal, MEAL_SLOTS, skippedMealsCount } from "@/lib/studentStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Student() {
  const [students, setStudents] = useState(listStudents());
  const [selectedId, setSelectedId] = useState<StudentId | "">("");
  const [now, setNow] = useState(Date.now());
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<string>("");
  const weekly = getActiveWeeklyPoll();
  const [dailyPolls, setDailyPolls] = useState(getActiveDailyMealPolls());

  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
      setDailyPolls(getActiveDailyMealPolls());
    }, 1500);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    setStudents(listStudents());
  }, [now]);

  const selected = useMemo(() => (selectedId ? getStudentPublic(selectedId) : undefined), [selectedId, now]);
  const active = getActiveAttendanceSession();

  async function scanWithCamera() {
    // Progressive enhancement using BarcodeDetector API
    try {
      // @ts-ignore
      const Supported = window.BarcodeDetector && (await window.BarcodeDetector.getSupportedFormats?.());
      // @ts-ignore
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      markAttendanceWithToken(token, selected.id, point);
      setStatus("✔ Attendance Marked for Today.");
    } catch (e: any) {
      setStatus(e?.message || "Could not mark attendance.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Section</CardTitle>
            <CardDescription>View your stored information. Contact warden for any changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select value={selectedId} onValueChange={(v) => setSelectedId(v as StudentId)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select your profile" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.details.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected ? (
              <div className="space-y-2 text-sm">
                <div className="font-medium">{selected.details.name}</div>
                <div className="text-muted-foreground">@{selected.username || "no-username"}</div>
                {selected.details.profilePhotoDataUrl ? (
                  <img src={selected.details.profilePhotoDataUrl} alt="Profile" className="mt-2 h-24 w-24 rounded-md object-cover ring-1 ring-border" />
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select your profile to view details</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>{active ? `QR valid until ${new Date(active.expiresAt).toLocaleTimeString()}` : "Waiting for warden to start session."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input className="flex-1 rounded-md border px-3 py-2 text-sm" placeholder="Paste scanned QR token" value={token} onChange={(e) => setToken(e.target.value)} />
              <Button type="button" variant="secondary" onClick={scanWithCamera}>Use Camera</Button>
            </div>
            <Button onClick={mark} disabled={!active}>Mark Attendance</Button>
            {status ? (<div className="text-sm text-muted-foreground">{status}</div>) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
