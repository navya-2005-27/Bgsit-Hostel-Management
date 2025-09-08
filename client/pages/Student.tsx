import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents, getStudentPublic, StudentId } from "@/lib/studentStore";

export default function Student() {
  const [students, setStudents] = useState(listStudents());
  const [selectedId, setSelectedId] = useState<StudentId | "">("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    setStudents(listStudents());
  }, [now]);

  const selected = useMemo(() => (selectedId ? getStudentPublic(selectedId) : undefined), [selectedId, now]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white dark:to-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
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
              <div className="text-sm text-muted-foreground">Select your profile to view details</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
