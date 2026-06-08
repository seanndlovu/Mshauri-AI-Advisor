export function VariantA() {
  const conversations = [
    {
      id: 1,
      title: "My maize leaves are turning yellow at the tips — what's wrong?",
      preview: "Yellowing at the tips of maize leaves usually indicates nitrogen deficiency or water stress. Check your soil moisture first, then consider applying urea fertilizer at 50kg/ha...",
      tag: "Crop Disease",
      lang: "English",
      time: "2 hours ago",
      replies: 1,
      votes: 12,
    },
    {
      id: 2,
      title: "Tomato prices in Harare this week?",
      preview: "Current market prices: Tomatoes (grade A) — $0.45/kg at Mbare Musika. Prices are 15% above last week due to reduced supply from Mazowe farms...",
      tag: "Market Prices",
      lang: "English",
      time: "4 hours ago",
      replies: 1,
      votes: 8,
    },
    {
      id: 3,
      title: "Ndeipi mhando yemvura yakakwana kumesa mbesa?",
      preview: "Mbesa dzinoda mvura ye 400–600mm mugore. Kumbidzisa kumesa kunoitwa pakati paMay naSeptember kuZimbabwe...",
      tag: "Planting Guide",
      lang: "Shona",
      time: "Yesterday",
      replies: 1,
      votes: 5,
    },
    {
      id: 4,
      title: "Best cover crops for improving clay soil in Mashonaland?",
      preview: "Lablab and mucuna are excellent cover crops for heavy clay soils. They fix nitrogen and improve drainage over 2–3 seasons...",
      tag: "Soil Health",
      lang: "English",
      time: "2 days ago",
      replies: 1,
      votes: 19,
    },
    {
      id: 5,
      title: "Broadcast alert received: Fall Armyworm outbreak in Midlands",
      preview: "⚠️ Alert from Maricho Media: Fall Armyworm (FAW) has been detected in Gweru district. Recommended action: apply chlorpyrifos 48EC at 1L/ha...",
      tag: "Alert",
      lang: "English",
      time: "3 days ago",
      replies: 0,
      votes: 31,
    },
  ];

  const navItems = [
    { icon: "🌱", label: "Ask Mshauri", active: false, href: "#" },
    { icon: "📚", label: "Knowledge Base", active: false, href: "#" },
    { icon: "💰", label: "Market Prices", active: false, href: "#" },
    { icon: "📢", label: "Broadcasts", active: false, href: "#" },
    { icon: "📊", label: "Analytics", active: false, href: "#" },
    { icon: "👤", label: "Farmers", active: false, href: "#" },
  ];

  const tagColors: Record<string, string> = {
    "Crop Disease": "bg-red-100 text-red-700",
    "Market Prices": "bg-emerald-100 text-emerald-700",
    "Planting Guide": "bg-sky-100 text-sky-700",
    "Soil Health": "bg-amber-100 text-amber-700",
    "Alert": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="flex h-screen bg-[#DAE0E6] font-sans text-sm overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-[#EDEFF1] flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#EDEFF1] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">M</div>
          <div>
            <div className="font-bold text-[#1c1c1c] text-base leading-none">Mshauri</div>
            <div className="text-[10px] text-[#878A8C] leading-none mt-0.5">AI Agricultural Assistant</div>
          </div>
        </div>

        {/* Ask CTA */}
        <div className="px-3 pt-4 pb-2">
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-full text-sm transition-colors">
            + Ask a Question
          </button>
        </div>

        {/* Nav */}
        <nav className="px-2 py-2 flex-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1c1c1c] hover:bg-[#F6F7F8] font-medium transition-colors cursor-pointer ${item.active ? "bg-[#F6F7F8] font-bold" : ""}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[13px]">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#EDEFF1]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs">F</div>
            <div>
              <div className="text-xs font-semibold text-[#1c1c1c]">Farmer Profile</div>
              <div className="text-[10px] text-[#878A8C]">+263 77 328 0244</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Feed */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-[#EDEFF1] px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <div className="flex-1 bg-[#F6F7F8] border border-[#EDEFF1] rounded-full px-4 py-2 flex items-center gap-2 max-w-xl">
            <svg className="w-4 h-4 text-[#878A8C]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span className="text-[#878A8C] text-sm">Ask about crops, pests, soil, prices…</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full hover:bg-emerald-700 transition-colors">Ask</button>
            <button className="border border-emerald-600 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors">Log In</button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* Sort bar */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] px-4 py-2.5 flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs border-b-2 border-emerald-600 pb-0.5">
              🔥 Hot
            </button>
            <button className="flex items-center gap-1.5 text-[#878A8C] font-bold text-xs hover:text-[#1c1c1c] transition-colors">
              ✨ New
            </button>
            <button className="flex items-center gap-1.5 text-[#878A8C] font-bold text-xs hover:text-[#1c1c1c] transition-colors">
              📈 Top
            </button>
            <div className="ml-auto flex items-center gap-1.5 text-[#878A8C] text-xs">
              <span>Language:</span>
              <button className="bg-[#F6F7F8] border border-[#EDEFF1] rounded px-2 py-0.5 text-[#1c1c1c] font-medium">All ▾</button>
            </div>
          </div>

          {/* Feed cards */}
          {conversations.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-[#EDEFF1] hover:border-[#818384] transition-colors group cursor-pointer overflow-hidden">
              {/* Vote + content layout */}
              <div className="flex">
                {/* Vote column */}
                <div className="w-10 bg-[#F8F9FA] flex flex-col items-center py-3 gap-1 flex-shrink-0">
                  <button className="text-[#878A8C] hover:text-emerald-600 transition-colors p-0.5 rounded">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <span className="text-xs font-bold text-[#1c1c1c]">{c.votes}</span>
                  <button className="text-[#878A8C] hover:text-red-400 transition-colors p-0.5 rounded">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 px-3 py-3 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagColors[c.tag] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.tag}
                    </span>
                    <span className="text-[10px] text-[#878A8C]">•</span>
                    <span className="text-[10px] text-[#878A8C]">{c.lang}</span>
                    <span className="text-[10px] text-[#878A8C]">•</span>
                    <span className="text-[10px] text-[#878A8C]">{c.time}</span>
                  </div>
                  <h3 className="font-semibold text-[#1c1c1c] text-[13px] leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-[11px] text-[#878A8C] leading-relaxed line-clamp-2">
                    {c.preview}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5">
                    <button className="flex items-center gap-1 text-[#878A8C] hover:text-[#1c1c1c] text-[11px] font-medium transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {c.replies} reply
                    </button>
                    <button className="flex items-center gap-1 text-[#878A8C] hover:text-[#1c1c1c] text-[11px] font-medium transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share
                    </button>
                    <button className="flex items-center gap-1 text-[#878A8C] hover:text-[#1c1c1c] text-[11px] font-medium transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="w-72 flex-shrink-0 hidden xl:block overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* About card */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] overflow-hidden">
            <div className="bg-emerald-600 h-12" />
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 -mt-4 mb-3">
                <div className="w-12 h-12 bg-emerald-700 rounded-full border-4 border-white flex items-center justify-center text-white font-bold text-lg">M</div>
              </div>
              <h2 className="font-bold text-[#1c1c1c] text-sm mb-1">About Mshauri</h2>
              <p className="text-[11px] text-[#878A8C] leading-relaxed mb-3">
                AI-powered agricultural assistant for Zimbabwean farmers. Ask in English, Shona or Ndebele.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center">
                  <div className="font-bold text-[#1c1c1c] text-sm">1,204</div>
                  <div className="text-[10px] text-[#878A8C]">Farmers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[#1c1c1c] text-sm">Online</div>
                  <div className="text-[10px] text-[#878A8C]">24/7</div>
                </div>
              </div>
              <button className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded-full hover:bg-emerald-700 transition-colors">
                Ask a Question
              </button>
            </div>
          </div>

          {/* Market snapshot */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] p-4">
            <h3 className="font-bold text-[#1c1c1c] text-xs mb-3 uppercase tracking-wide">Market Snapshot</h3>
            <div className="space-y-2">
              {[
                { crop: "Maize", price: "$0.28/kg", change: "+3%", up: true },
                { crop: "Tomatoes", price: "$0.45/kg", change: "+15%", up: true },
                { crop: "Soya Beans", price: "$0.62/kg", change: "-2%", up: false },
                { crop: "Groundnuts", price: "$1.10/kg", change: "0%", up: null },
              ].map((item) => (
                <div key={item.crop} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#1c1c1c]">{item.crop}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#1c1c1c]">{item.price}</span>
                    <span className={`text-[10px] font-semibold ${item.up === true ? "text-emerald-600" : item.up === false ? "text-red-500" : "text-[#878A8C]"}`}>{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg border border-[#EDEFF1] p-4">
            <h3 className="font-bold text-[#1c1c1c] text-xs mb-3 uppercase tracking-wide">Browse by Topic</h3>
            <div className="flex flex-wrap gap-1.5">
              {["Crop Disease", "Soil Health", "Planting Guide", "Pest Control", "Market Prices", "Irrigation", "Livestock", "Alerts"].map(t => (
                <button key={t} className="bg-[#F6F7F8] hover:bg-[#EDEFF1] border border-[#EDEFF1] rounded-full px-2.5 py-1 text-[11px] text-[#1c1c1c] transition-colors">{t}</button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
