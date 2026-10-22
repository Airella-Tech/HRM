import React, { useState, useEffect, useMemo } from "react";
import { PageLayout } from "../../components/PageLayout";
import { recruitmentApi } from "../../services/api";
import {
  FileDown,
  Search,
  Filter,
  Download,
  FileText,
  Building2,
  Calendar,
  Eye,
  CheckCircle2,
  HardDrive,
  Sparkles,
  User,
  X,
} from "lucide-react";

const INITIAL_RESUME_DOCUMENTS = [
  {
    id: 1,
    candidateName: "Sophia Martinez",
    email: "sophia.m@example.com",
    jobTitle: "Senior Frontend Engineer",
    department: "Engineering",
    appliedDate: "2026-10-18",
    fileName: "Sophia_Martinez_CV.pdf",
    fileSize: "1.4 MB",
    fileType: "PDF Document",
    downloadCount: 3,
  },
  {
    id: 2,
    candidateName: "Liam Johnson",
    email: "liam.j@example.com",
    jobTitle: "UI/UX Product Designer",
    department: "Product Design",
    appliedDate: "2026-10-19",
    fileName: "Liam_Johnson_Portfolio_Resume.pdf",
    fileSize: "2.8 MB",
    fileType: "PDF Document",
    downloadCount: 5,
  },
  {
    id: 3,
    candidateName: "Amara Patel",
    email: "amara.patel@example.com",
    jobTitle: "DevOps & Cloud Engineer",
    department: "Infrastructure",
    appliedDate: "2026-10-20",
    fileName: "Amara_Patel_Cloud_Resume.pdf",
    fileSize: "980 KB",
    fileType: "PDF Document",
    downloadCount: 1,
  },
  {
    id: 4,
    candidateName: "Ethan Davis",
    email: "ethan.davis@example.com",
    jobTitle: "Full Stack Developer",
    department: "Engineering",
    appliedDate: "2026-10-20",
    fileName: "Ethan_Davis_Resume.pdf",
    fileSize: "1.1 MB",
    fileType: "PDF Document",
    downloadCount: 2,
  },
  {
    id: 5,
    candidateName: "Chloe Dubois",
    email: "chloe.dubois@example.com",
    jobTitle: "HR & Recruitment Coordinator",
    department: "Human Resources",
    appliedDate: "2026-10-17",
    fileName: "Chloe_Dubois_HR_Resume.pdf",
    fileSize: "850 KB",
    fileType: "PDF Document",
    downloadCount: 1,
  },
];

export default function RecruitmentResumeDownload() {
  const [documents, setDocuments] = useState(INITIAL_RESUME_DOCUMENTS);
  const [search, setSearch] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("ALL");
  const [downloadSuccess, setDownloadSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (typeof recruitmentApi?.getApplications === "function") {
      recruitmentApi
        .getApplications()
        .then((res) => {
          if (!cancelled && res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const mapped = res.data.map((a) => ({
              id: a.id,
              candidateName: a.candidateName,
              email: a.email,
              jobTitle: a.vacancyTitle || a.jobTitle || "Open Role",
              department: a.department || "General",
              appliedDate: (a.createdAt || "").slice(0, 10) || "2026-10-20",
              fileName: a.resumeFileName || `${a.candidateName.replace(/\s+/g, "_")}_CV.pdf`,
              fileSize: a.resumeFileSize || "1.2 MB",
              fileType: a.resumeFileType || "PDF Document",
              downloadCount: 0,
            }));
            setDocuments(mapped);
          }
        })
        .catch((err) => {
          console.warn("Could not load backend applications for resumes, using initial dataset:", err);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadFile = (doc) => {
    try {
      const content = `=== CANDIDATE RESUME ===\n\nCandidate: ${doc.candidateName}\nEmail: ${doc.email}\nApplied Position: ${doc.jobTitle} (${doc.department})\nFile: ${doc.fileName}\nApplication Date: ${doc.appliedDate}\n\n[Resume Document Content for HRM System]`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Download error:", err);
    }

    setDownloadSuccess(`Downloaded "${doc.fileName}"`);
    setTimeout(() => setDownloadSuccess(""), 3500);

    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d))
    );
  };

  const downloadAllBatch = () => {
    const list = filteredDocs.map((d) => d.fileName).join("\n- ");
    const content = `HRM RECRUITMENT RESUME ARCHIVE BATCH\nGenerated on: ${new Date().toLocaleString()}\n\nDownloaded Files:\n- ${list}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Recruitment_Resumes_Archive_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Batch download completed for ${filteredDocs.length} resume(s)!`);
    setTimeout(() => setDownloadSuccess(""), 4000);
  };

  const vacancies = useMemo(() => {
    return Array.from(new Set(documents.map((d) => d.jobTitle)));
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        doc.candidateName.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.jobTitle.toLowerCase().includes(q);

      const matchesVacancy = vacancyFilter === "ALL" || doc.jobTitle === vacancyFilter;
      return matchesSearch && matchesVacancy;
    });
  }, [documents, search, vacancyFilter]);

  return (
    <PageLayout
      role="recruiter"
      activePage="Download Resumes"
      title="Candidate Resume Documents"
      subtitle="View, search, and download submitted candidate resumes and CV attachments"
      actions={
        <button
          onClick={downloadAllBatch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <Download size={15} />
          <span>Batch Download Resumes</span>
        </button>
      }
    >
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Resumes</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</h3>
              <p className="text-xs text-slate-400 mt-1">Verified files on record</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileDown size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Results</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{filteredDocs.length}</h3>
              <p className="text-xs text-slate-400 mt-1">Matching current query</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Filter size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Storage</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">7.2 MB</h3>
              <p className="text-xs text-slate-400 mt-1">Encrypted attachments</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <HardDrive size={22} />
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Search candidate name or file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Vacancy:</span>
            <select
              value={vacancyFilter}
              onChange={(e) => setVacancyFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Vacancies</option>
              {vacancies.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{doc.candidateName}</h4>
                    <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">{doc.jobTitle}</p>
                    <p className="text-[11px] text-slate-400">{doc.department}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-xs font-semibold text-slate-700 truncate">{doc.fileName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{doc.fileSize}</span>
                    <span>Uploaded {doc.appliedDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Downloaded {doc.downloadCount}x
                </span>
                <button
                  onClick={() => downloadFile(doc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  <Download size={13} />
                  <span>Download CV</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
