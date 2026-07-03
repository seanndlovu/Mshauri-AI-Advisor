import { useRef } from "react";
import { ChevronLeft, ChevronRight, BookOpen, FileText, PlayCircle } from "lucide-react";

interface LearningItem {
  id: string;
  tag: string;
  icon: "magazine" | "pdf" | "video";
  title: string;
  color: string;
  href: string;
  coverGradient: string;
}

const ITEMS: LearningItem[] = [
  {
    id: "mag-13",
    tag: "Magazine",
    icon: "magazine",
    title: "Maricho Magazine Issue 13",
    color: "text-[#22c55e]",
    href: "https://www.wpdm.com/package_download/wpdmdl=1309/",
    coverGradient: "from-[#22c55e]/30 to-[#16a34a]/10",
  },
  {
    id: "mag-12",
    tag: "Magazine",
    icon: "magazine",
    title: "Maricho Magazine Issue 12",
    color: "text-[#22c55e]",
    href: "https://www.wpdm.com/package_download/wpdmdl=1305/",
    coverGradient: "from-[#22c55e]/20 to-[#0f766e]/10",
  },
  {
    id: "ca-pdf",
    tag: "Free PDF",
    icon: "pdf",
    title: "Conservation Agriculture Manual",
    color: "text-blue-400",
    href: "https://marichomedia.com",
    coverGradient: "from-blue-500/20 to-blue-900/10",
  },
  {
    id: "faw-pdf",
    tag: "Pest Guide",
    icon: "pdf",
    title: "Fall Armyworm Identification & Control",
    color: "text-orange-400",
    href: "https://marichomedia.com",
    coverGradient: "from-orange-500/20 to-orange-900/10",
  },
  {
    id: "clim-pdf",
    tag: "Climate",
    icon: "pdf",
    title: "Climate Smart Agriculture for Zimbabwe",
    color: "text-cyan-400",
    href: "https://marichomedia.com",
    coverGradient: "from-cyan-500/20 to-cyan-900/10",
  },
  {
    id: "mag-11",
    tag: "Magazine",
    icon: "magazine",
    title: "Maricho Magazine Issue 11",
    color: "text-[#22c55e]",
    href: "https://www.wpdm.com/package_download/wpdmdl=1282/",
    coverGradient: "from-purple-500/20 to-purple-900/10",
  },
  {
    id: "policy-zim",
    tag: "Policy",
    icon: "pdf",
    title: "Zimbabwe Agricultural Policy Review",
    color: "text-amber-400",
    href: "https://marichomedia.com",
    coverGradient: "from-amber-500/20 to-amber-900/10",
  },
];

const ICON_MAP = {
  magazine: BookOpen,
  pdf: FileText,
  video: PlayCircle,
};

export function ContinueLearning() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#E7E9EA] font-bold text-[15px]">Continue Learning</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center hover:bg-[#272729] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#71767B]" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center hover:bg-[#272729] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#71767B]" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {ITEMS.map(item => {
          const Icon = ICON_MAP[item.icon];
          return (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 w-[160px] rounded-xl border border-[#2F3336] bg-[#16181C] hover:border-[#22c55e]/30 overflow-hidden transition-all group cursor-pointer"
            >
              <div className={`h-[90px] bg-gradient-to-br ${item.coverGradient} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="p-2.5">
                <span className={`text-[10px] font-bold uppercase tracking-wide ${item.color}`}>{item.tag}</span>
                <p className="text-[#E7E9EA] text-[12px] font-semibold leading-snug mt-0.5 line-clamp-2 group-hover:text-white transition-colors">
                  {item.title}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
