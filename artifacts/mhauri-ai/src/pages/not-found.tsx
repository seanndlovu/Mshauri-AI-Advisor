import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-background ms-theme-transition">
      <div className="text-center px-6 max-w-sm">
        <img src="/mshauri-logo.png?v=2" alt="Mshauri" className="w-16 h-16 object-contain mx-auto mb-4 opacity-70" />
        <h1 className="text-foreground text-xl font-bold mb-2">Page unavailable</h1>
        <p className="text-muted-foreground text-sm mb-6">We couldn't find what you're looking for.</p>
        <Link href="/">
          <button className="px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] rounded-full text-white text-sm font-bold transition-colors">
            Return Home
          </button>
        </Link>
      </div>
    </div>
  );
}
