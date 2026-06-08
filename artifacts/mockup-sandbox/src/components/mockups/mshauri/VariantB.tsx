export function VariantB() {
  const conversations = [
    {
      id: 1,
      title: "My maize leaves are turning yellow at the tips",
      answer: "Likely nitrogen deficiency or water stress. Apply urea at 50kg/ha and check irrigation.",
      tag: "Crop Health",
      time: "2h ago",
      lang: "EN",
    },
    {
      id: 2,
      title: "Tomato prices in Harare this week?",
      answer: "Mbare Musika: $0.45/kg (Grade A). Up 15% from last week.",
      tag: "Market",
      time: "4h ago",
      lang: "EN",
    },
    {
      id: 3,
      title: "Ndeipi mhanda yemvura yakakwana kumesa mbesa?",
      answer: "Mbesa dzinoda mvura ye 400–600mm mugore.",
      tag: "Planting",
      time: "Yesterday",
      lang: "SN",
    },
    {
      id: 4,
      title: "Best cover crops for clay soil in Mashonaland?",
      answer: "Lablab and mucuna fix nitrogen and improve drainage over 2–3 seasons.",
      tag: "Soil",
      time: "2d ago",
      lang: "EN",
    },
    {
      id: 5,
      title: "Fall Armyworm alert: Midlands province",
      answer: "Apply chlorpyrifos 48EC at 1L/ha. Early morning application preferred.",
      tag: "Alert",
      time: "3d ago",
      lang: "EN",
    },
    {
      id: 6,
      title: "How do I treat banana Fusarium wilt?",
      answer: "Remove affected plants immediately. Use Trichoderma-based biocontrol on healthy crops.",
      tag: "Crop Health",
      time: "3d ago",
      lang: "EN",
    },
  ];

  const stats = [
    { label: "Farmers", value: "1,204" },
    { label: "Questions", value: "8,491" },
    { label: "Languages", value: "3" },
  ];

  const tagColors: Record<string, string> = {
    "Crop Health": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Market": "bg-blue-50 text-blue-700 border-blue-200",
    "Planting": "bg-sky-50 text-sky-700 border-sky-200",
    "Soil": "bg-amber-50 text-amber-700 border-amber-200",
    "Alert": "bg-red-50 text-red-600 border-red-200",
    "Livestock": "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-sm">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-0 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center text-white font-bold text-sm">M</div>
              <span className="font-bold text-[#1c1c1c] text-base tracking-tight">Mshauri</span>
            </div>
            {/* Top nav */}
            <nav className="hidden md:flex items-center gap-1">
              {["Feed", "Knowledge Base", "Market Prices", "Broadcasts"].map((item, i) => (
                <a key={item} href="#" className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${i === 0 ? "bg-emerald-50 text-emerald-700" : "text-[#5f6368] hover:bg-gray-100 hover:text-[#1c1c1c]"}`}>
                  {item}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#F6F7F8] border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 w-52">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-[12px] text-gray-400">Search…</span>
            </div>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg transition-colors">Ask</button>
            <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs cursor-pointer">F</div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Ask box */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0 mt-0.5">F</div>
              <div className="flex-1">
                <div className="bg-[#F8F9FA] border border-gray-200 rounded-lg px-4 py-3 text-[13px] text-gray-400 cursor-text hover:border-emerald-300 transition-colors">
                  Ask about your crops, soil, pests, or prices… (English, Shona, Ndebele)
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <button className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 transition-colors">
                    📷 Add Photo
                  </button>
                  <button className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-600 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 transition-colors">
                    🎤 Voice Note
                  </button>
                  <button className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold px-4 py-1.5 rounded-lg transition-colors">
                    Ask Mshauri →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sort & Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {["Recent", "Popular", "Alerts"].map((s, i) => (
                <button key={s} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${i === 0 ? "bg-[#1c1c1c] text-white" : "text-gray-500 hover:bg-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span>Filter:</span>
              {["All", "EN", "SN", "ND"].map((l, i) => (
                <button key={l} className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${i === 0 ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation cards */}
          <div className="space-y-2">
            {conversations.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer p-4 group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-gray-400 text-xs font-bold mt-0.5">?</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${tagColors[c.tag] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {c.tag}
                      </span>
                      <span className="text-[10px] text-gray-400">{c.time}</span>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{c.lang}</span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-[#1c1c1c] leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
                      {c.title}
                    </h3>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-emerald-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold mt-0.5">M</div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {c.answer}
                      </p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-3">Community Stats</h3>
            <div className="space-y-2">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600">{s.label}</span>
                  <span className="text-[13px] font-bold text-[#1c1c1c]">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] text-gray-500">Available via WhatsApp 24/7</span>
              </div>
            </div>
          </div>

          {/* Market Prices */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-wider">Market Prices</h3>
              <a href="#" className="text-[10px] text-emerald-600 font-medium hover:underline">View all</a>
            </div>
            <div className="space-y-2.5">
              {[
                { crop: "Maize", price: "$0.28/kg", change: "+3%", up: true },
                { crop: "Tomatoes", price: "$0.45/kg", change: "+15%", up: true },
                { crop: "Soya Beans", price: "$0.62/kg", change: "-2%", up: false },
                { crop: "Groundnuts", price: "$1.10/kg", change: "0%", up: null },
              ].map((item) => (
                <div key={item.crop} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#1c1c1c]">{item.crop}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#1c1c1c]">{item.price}</span>
                    <span className={`text-[10px] font-semibold w-8 text-right ${item.up === true ? "text-emerald-600" : item.up === false ? "text-red-500" : "text-gray-400"}`}>{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-3">Topics</h3>
            <div className="flex flex-wrap gap-1.5">
              {["Crop Health", "Soil", "Planting", "Market", "Irrigation", "Livestock", "Alert", "Weather"].map(t => (
                <button key={t} className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${tagColors[t] ?? "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="bg-emerald-600 rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-bold text-sm mb-1">Use on WhatsApp</h3>
            <p className="text-[11px] text-emerald-100 mb-3 leading-relaxed">Chat with Mshauri directly in WhatsApp. Works offline-friendly.</p>
            <button className="bg-white text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-lg w-full hover:bg-emerald-50 transition-colors">
              Chat on WhatsApp →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
