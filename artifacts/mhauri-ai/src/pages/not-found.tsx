import { Link } from "wouter";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-[#1a1a1b]">
      <div className="text-center px-6 max-w-sm">
        <Sprout className="w-12 h-12 mx-auto mb-4 text-[#22c55e] opacity-60" />
        <h1 className="text-[#E7E9EA] text-xl font-bold mb-2">Page unavailable</h1>
        <p className="text-[#71767B] text-sm mb-6">We couldn't find what you're looking for.</p>
        <Link href="/">
          <button className="px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white text-sm font-bold transition-colors">
            Return Home
          </button>
        </Link>
      </div>
    </div>
  );
}
