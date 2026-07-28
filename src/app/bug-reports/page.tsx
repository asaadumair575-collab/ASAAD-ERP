import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import BugReportActions from "./BugReportActions";

export default async function BugReportsPage() {
  const me = await getSessionUser();
  if (!me?.isAdmin) redirect("/");

  const reports = await prisma.bugReport.findMany({
    include: { reportedBy: { select: { displayName: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });

  const open = reports.filter((r) => r.status === "OPEN");
  const rest = reports.filter((r) => r.status !== "OPEN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bug Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Issues reported by employees — {open.length} open
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-14 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No bug reports yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...open, ...rest].map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm space-y-2 ${
                r.status === "OPEN" ? "border-red-200" :
                r.status === "RESOLVED" ? "border-green-200" :
                "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                  {r.page && (
                    <p className="text-xs text-gray-400 font-mono">{r.page}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === "OPEN" ? "bg-red-100 text-red-600" :
                    r.status === "RESOLVED" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {r.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.description}</p>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <span>
                  By {r.reportedBy ? (r.reportedBy.displayName ?? r.reportedBy.username) : "unknown"}
                  {" · "}
                  {new Date(r.createdAt).toLocaleString("en-PK")}
                </span>
              </div>

              {r.adminNote && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                  <span className="font-medium">Admin note: </span>{r.adminNote}
                </div>
              )}

              <BugReportActions id={r.id} status={r.status} adminNote={r.adminNote ?? ""} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
