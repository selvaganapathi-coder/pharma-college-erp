"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ReportsPage() {
  const { state } = useApp();
  const att = [
    { name: "Present", value: state.attendance.filter((a) => a.status === "present").length },
    { name: "Late", value: state.attendance.filter((a) => a.status === "late").length },
    { name: "Absent", value: state.attendance.filter((a) => a.status === "absent").length },
  ];
  const fees = [
    { name: "Paid", value: state.fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0) },
    { name: "Due", value: state.fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0) },
  ];
  const bySection = state.sections.map((sec) => {
    const ids = state.students.filter((s) => s.sectionId === sec.id).map((s) => s.id);
    const rows = state.attendance.filter((a) => ids.includes(a.studentId));
    const pct = rows.length ? Math.round((rows.filter((r) => r.status === "present").length / rows.length) * 100) : 0;
    return { name: sec.name, pct };
  });
  const examAvg = state.exams.map((ex) => {
    const marks = state.marks.filter((m) => m.examId === ex.id);
    const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m.marks, 0) / marks.length) : 0;
    return { name: ex.name, avg };
  });

  function csv() {
    const lines = ["type,name,value", ...bySection.map((r) => `attendance,${r.name},${r.pct}`), ...fees.map((r) => `fees,${r.name},${r.value}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gp-pharmacy-report.csv";
    a.click();
  }

  return (
    <Guard module="reports">
      <PageHeader
        title="Reports"
        note="Live charts from attendance, fees, and exams. Download a CSV for the office."
        action={
          <Button onClick={csv}>
            Download CSV
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Students" value={`${state.students.filter((s) => !s.deletedAt).length}`} />
        <StatCard title="Attendance rows" value={`${state.attendance.length}`} />
        <StatCard title="Fee records" value={`${state.fees.filter((f) => !f.deletedAt).length}`} />
        <StatCard title="Exams" value={`${state.exams.length}`} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance mix</CardTitle>
          </CardHeader>
          <CardContent className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={att} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                  {att.map((_, i) => (
                    <Cell key={i} fill={["#b42318", "#e2b100", "#7f1d1d"][i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee collection (₹)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fees}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#b42318" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance by section</CardTitle>
          </CardHeader>
          <CardContent className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pct" fill="#b42318" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average exam marks</CardTitle>
          </CardHeader>
          <CardContent className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examAvg}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg" fill="#b42318" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Guard>
  );
}
