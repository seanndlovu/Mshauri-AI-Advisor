import { useState } from "react";
import { BookOpen, Download, X, FileText, ChevronRight } from "lucide-react";

interface Magazine {
  edition: string;
  wpdmdl: number;
  size: string;
  label?: string;
}

interface PolicyDoc {
  title: string;
  wpdmdl: number;
  size: string;
  category: string;
}

const MAGAZINES: Magazine[] = [
  { edition: "May 2026",       wpdmdl: 4626, size: "9.7 MB" },
  { edition: "April 2026",     wpdmdl: 4597, size: "3.8 MB", label: "Latest" },
  { edition: "March 2026",     wpdmdl: 4544, size: "4.2 MB" },
  { edition: "February 2026",  wpdmdl: 4496, size: "7.1 MB" },
  { edition: "January 2026",   wpdmdl: 4425, size: "7.2 MB" },
  { edition: "December 2025",  wpdmdl: 4382, size: "8.9 MB" },
  { edition: "November 2025",  wpdmdl: 4320, size: "8.6 MB" },
  { edition: "October 2025",   wpdmdl: 4246, size: "10.6 MB" },
  { edition: "September 2025", wpdmdl: 4161, size: "8.8 MB" },
  { edition: "September 2024", wpdmdl: 4072, size: "28.9 MB" },
  { edition: "July 2024",      wpdmdl: 3800, size: "9.5 MB" },
];

const POLICY_DOCS: PolicyDoc[] = [
  { title: "SARCOF-29 Southern Africa Regional Climate Outlook", wpdmdl: 3906, size: "1.4 MB", category: "Climate" },
  { title: "Mid-Year 2024 Budget Speech", wpdmdl: 3774, size: "786 KB", category: "Finance" },
  { title: "Zimbabwe Livelihoods Assessment Committee Report", wpdmdl: 3766, size: "2.3 MB", category: "Agriculture" },
  { title: "AMR Quadripartite Toolkit for Media Engagement", wpdmdl: 3729, size: "724 KB", category: "Health" },
  { title: "Climate Change Management Bill Principles", wpdmdl: 3576, size: "1.0 MB", category: "Policy" },
];

const COVER_GRADIENTS = [
  "from-[#14532d] via-[#166534] to-[#15803d]",
  "from-[#064e3b] via-[#065f46] to-[#047857]",
  "from-[#1b4332] via-[#2d6a4f] to-[#40916c]",
  "from-[#0f4c2a] via-[#1a6b3c] to-[#22c55e]",
  "from-[#052e16] via-[#14532d] to-[#166534]",
  "from-[#0a3a1f] via-[#155e2f] to-[#1d8348]",
];

function pdfUrl(wpdmdl: number) {
  return `https://marichomedia.com/?wpdmdl=${wpdmdl}`;
}

function viewerUrl(wpdmdl: number) {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl(wpdmdl))}&embedded=true`;
}

function downloadPageUrl(wpdmdl: number) {
  return pdfUrl(wpdmdl);
}

interface ReaderModalProps {
  title: string;
  wpdmdl: number;
  onClose: () => void;
}

function ReaderModal({ title, wpdmdl, onClose }: ReaderModalProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2F3336] shrink-0 bg-[#16181C]">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close reader"
        >
          <X className="w-5 h-5 text-[#E7E9EA]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#E7E9EA] text-sm font-semibold truncate">Maricho Magazine</p>
          <p className="text-[#71767B] text-[11px] truncate">{title}</p>
        </div>
        <a
          href={downloadPageUrl(wpdmdl)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#22c55e]/40 text-[#22c55e] text-[12px] font-semibold hover:bg-[#22c55e]/10 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>

      {/* Reader area */}
      <div className="relative flex-1 bg-[#1a1a1b]">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#71767B]">
            <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
            <p className="text-sm">Loading magazine…</p>
          </div>
        )}
        <iframe
          src={viewerUrl(wpdmdl)}
          className="w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          title={title}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

export default function MarichoNewsroom() {
  const [reader, setReader] = useState<{ title: string; wpdmdl: number } | null>(null);

  return (
    <div className="pb-8">
      {/* Magazine rack header */}
      <div className="mb-4">
        <h2 className="text-[#E7E9EA] font-bold text-base mb-0.5">Maricho Magazine</h2>
        <p className="text-[#71767B] text-[12px]">Zimbabwe's agriculture &amp; food systems publication</p>
      </div>

      {/* Horizontal scrolling magazine rack */}
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
        {MAGAZINES.map((mag, i) => {
          const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length];
          const [month, year] = mag.edition.split(" ");
          return (
            <div
              key={mag.wpdmdl}
              className="shrink-0 w-36 snap-start"
            >
              {/* Cover */}
              <div
                className={`relative w-36 h-52 rounded-xl bg-gradient-to-b ${gradient} flex flex-col items-center justify-between p-3 shadow-lg cursor-pointer group hover:scale-[1.03] transition-transform`}
                onClick={() => setReader({ title: mag.edition, wpdmdl: mag.wpdmdl })}
              >
                {mag.label && (
                  <span className="absolute top-2 right-2 bg-[#22c55e] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {mag.label}
                  </span>
                )}
                <img
                  src="/mshauri-logo.png?v=2"
                  alt="Maricho"
                  className="w-16 h-16 object-contain opacity-90 mt-1 drop-shadow"
                />
                <div className="text-center w-full">
                  <p className="text-white/90 text-[10px] font-semibold uppercase tracking-wider">Maricho</p>
                  <p className="text-white text-[13px] font-black leading-tight">{month}</p>
                  <p className="text-white/70 text-[11px] font-bold">{year}</p>
                  <div className="mt-2 w-full h-px bg-white/20" />
                  <p className="text-white/50 text-[9px] mt-1">{mag.size}</p>
                </div>
                {/* Read overlay */}
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#22c55e] text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Read
                  </span>
                </div>
              </div>
              {/* Under-card actions */}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => setReader({ title: mag.edition, wpdmdl: mag.wpdmdl })}
                  className="flex-1 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e] text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-3 h-3" /> Read
                </button>
                <a
                  href={downloadPageUrl(mag.wpdmdl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 border border-[#2F3336] hover:border-[#4a5568] text-[#71767B] hover:text-[#d7dadc] text-[10px] font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <Download className="w-3 h-3" /> Save
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Policy & Reports section */}
      <div className="mt-8">
        <div className="mb-3">
          <h2 className="text-[#E7E9EA] font-bold text-base mb-0.5">Policy &amp; Reports</h2>
          <p className="text-[#71767B] text-[12px]">Official documents, climate outlooks and research</p>
        </div>
        <div className="flex flex-col gap-2">
          {POLICY_DOCS.map(doc => (
            <div
              key={doc.wpdmdl}
              className="bg-[#16181C] border border-[#2F3336] hover:border-[#4a5568] rounded-2xl px-4 py-3 flex items-center gap-3 transition-all group cursor-pointer"
              onClick={() => setReader({ title: doc.title, wpdmdl: doc.wpdmdl })}
            >
              <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#E7E9EA] text-[13px] font-semibold leading-snug line-clamp-2 group-hover:text-white transition-colors">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full font-medium">
                    {doc.category}
                  </span>
                  <span className="text-[#71767B] text-[10px]">{doc.size}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71767B] group-hover:text-[#22c55e] transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Reader modal */}
      {reader && (
        <ReaderModal
          title={reader.title}
          wpdmdl={reader.wpdmdl}
          onClose={() => setReader(null)}
        />
      )}
    </div>
  );
}
