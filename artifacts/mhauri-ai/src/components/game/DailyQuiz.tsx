import { useState, useEffect, useRef } from "react";
import { X, Trophy, Zap, CheckCircle, XCircle, Flame } from "lucide-react";

interface Question {
  q: string;
  options: string[];
  a: number;
  explanation: string;
}

const QUIZ_BANK: Question[] = [
  {
    q: "What is Zimbabwe's most important staple food crop?",
    options: ["Wheat", "Maize", "Rice", "Sorghum"], a: 1,
    explanation: "Maize is the staple food for over 90% of Zimbabweans and is the base of sadza, the national dish. Zimbabwe targets production of 1.8–2.2 million tonnes annually to achieve food security.",
  },
  {
    q: "Which pest causes the most widespread damage to maize in Zimbabwe?",
    options: ["Aphids", "Bollworm", "Fall Armyworm", "Stalk Borer"], a: 2,
    explanation: "Fall Armyworm (Spodoptera frugiperda) was first detected in Zimbabwe in 2016 and rapidly became the number-one pest threat, capable of destroying entire maize fields if not controlled early with scouting and targeted insecticides.",
  },
  {
    q: "Which cash crop is Zimbabwe globally famous for?",
    options: ["Coffee", "Tobacco", "Cotton", "Tea"], a: 1,
    explanation: "Zimbabwe is among the world's top producers of flue-cured tobacco, which has historically been the country's largest export earner. The Tobacco Industry Marketing Board (TIMB) regulates all tobacco sales.",
  },
  {
    q: "What does NPK stand for in fertilizer?",
    options: ["Natural Plant Kingdom", "Nitrogen-Phosphorus-Potassium", "Nitrogen-Protein-Kelp", "Net Plant Kilogram"], a: 1,
    explanation: "NPK stands for Nitrogen (N), Phosphorus (P), and Potassium (K) — the three primary macronutrients plants need. Compound D (7:14:7 NPK) is widely used for basal dressing in Zimbabwe's maize farming.",
  },
  {
    q: "What soil pH range is ideal for most Zimbabwe crops?",
    options: ["4.0–5.0", "5.5–6.5", "7.0–8.0", "8.5–9.5"], a: 1,
    explanation: "A pH of 5.5–6.5 is optimal for most crops in Zimbabwe. Many soils in the country are naturally acidic (pH 4.5–5.5), so lime application is recommended to raise pH and improve nutrient availability.",
  },
  {
    q: "What does 'conservation agriculture' primarily achieve?",
    options: ["Expands farmland", "Reduces chemical use only", "Improves soil health and retains moisture", "Increases mechanization"], a: 2,
    explanation: "Conservation Agriculture (CA) has three principles: minimum soil disturbance (no-till or minimum tillage), permanent soil cover (mulch or cover crops), and crop rotations. CA improves soil health, reduces erosion, and retains moisture — crucial in Zimbabwe's variable rainfall.",
  },
  {
    q: "When do most Zimbabwean farmers plant maize?",
    options: ["March–May", "June–August", "October–December", "January only"], a: 2,
    explanation: "Zimbabwe's main rainy season runs from October to March. Most maize planting happens in October–December with the onset of rains. Early planting by 15 November is recommended to maximize yield potential.",
  },
  {
    q: "What is 'Dimba farming' in Zimbabwe?",
    options: ["Farming on hillsides", "Wetland/streambank farming in the dry season", "Indoor greenhouse farming", "Organic certification"], a: 1,
    explanation: "Dimba farming refers to cultivating plots along riverbanks and wetland areas during the dry season (April–September) using residual soil moisture. It enables year-round vegetable and grain production when rains have stopped.",
  },
  {
    q: "What does IPM stand for in crop protection?",
    options: ["International Plant Medicine", "Integrated Pest Management", "Intensive Planting Method", "Irrigation Pipe Management"], a: 1,
    explanation: "Integrated Pest Management (IPM) combines biological control, cultural practices, resistant varieties, and judicious pesticide use. It reduces reliance on chemicals, protects beneficial insects like bees, and lowers production costs.",
  },
  {
    q: "What animal provides most draught power for smallholder farmers in Zimbabwe?",
    options: ["Donkey", "Ox", "Horse", "Tractor"], a: 1,
    explanation: "Oxen (trained cattle) are the primary source of draught power for over 60% of Zimbabwe's smallholder farmers. They are used for ploughing, planting, and transportation. The decline in cattle numbers has been a major challenge for food security.",
  },
  {
    q: "Urea fertilizer primarily provides which plant nutrient?",
    options: ["Phosphorus", "Potassium", "Nitrogen", "Calcium"], a: 2,
    explanation: "Urea (46-0-0) contains 46% Nitrogen and is widely used as a top-dressing fertilizer in Zimbabwe, applied about 4–6 weeks after maize emergence. Nitrogen drives leafy growth and is critical for grain filling.",
  },
  {
    q: "What is the main purpose of contour ridges in Zimbabwean farming?",
    options: ["Mark property boundaries", "Prevent soil erosion and retain water", "Create planting rows", "Drain excess water"], a: 1,
    explanation: "Contour ridges (constructed along contour lines across a slope) slow runoff, reduce soil erosion, and help water infiltrate the soil. AGRITEX promotes contour farming on slopes greater than 2% gradient across Zimbabwe.",
  },
  {
    q: "Maize smut disease replaces grain kernels with:",
    options: ["Yellow powder", "Black powdery masses (galls)", "White spots", "Brown hard lumps"], a: 1,
    explanation: "Common smut (Ustilago maydis) causes abnormal growth of grey-white galls that burst to release black powdery teliospores. Affected cobs lose all grain value. Crop rotation and resistant varieties are the main controls.",
  },
  {
    q: "Which province is Zimbabwe's primary tobacco-growing region?",
    options: ["Mashonaland Central", "Matabeleland South", "Manicaland", "Midlands"], a: 0,
    explanation: "Mashonaland Central (along with Mashonaland East and West) is Zimbabwe's tobacco heartland. The sandy loam soils and rainfall pattern in these provinces are ideal for flue-cured Virginia tobacco production.",
  },
  {
    q: "What does 'agroforestry' mean in farming practice?",
    options: ["Cutting trees for farmland", "Integrating trees with crops and/or livestock", "Farming inside forests", "Tree nursery management"], a: 1,
    explanation: "Agroforestry deliberately combines trees with crops and/or livestock on the same land. In Zimbabwe, the Faidherbia albida tree (winter thorn) is famous for fertilizer trees — it fixes nitrogen and drops leaves during the rainy season, allowing sunlight through.",
  },
  {
    q: "What is the recommended in-row spacing for maize in Zimbabwe?",
    options: ["10 cm", "25–30 cm", "60 cm", "1 metre"], a: 1,
    explanation: "The recommended plant spacing for maize in Zimbabwe is 90 cm between rows and 25–30 cm between plants in the row, giving about 37,000–44,000 plants per hectare. Proper spacing reduces competition for nutrients, water, and light.",
  },
  {
    q: "Which mineral deficiency is corrected by lime application?",
    options: ["Nitrogen deficiency", "Phosphorus deficiency", "Calcium deficiency and soil acidity", "Iron deficiency"], a: 2,
    explanation: "Agricultural lime (calcium carbonate or dolomitic lime) raises soil pH and corrects calcium (and magnesium for dolomite) deficiency. At low pH, aluminium and manganese toxicity block root development. AGRITEX recommends 1–2 tonnes of lime/ha for acidic soils.",
  },
  {
    q: "What does 'side dressing' mean in maize farming?",
    options: ["Growing maize beside other crops", "Applying top-dressing fertilizer alongside growing plants", "Planting on hillside slopes", "An irrigation technique"], a: 1,
    explanation: "Side dressing means placing fertilizer (usually urea or AN) in a band 5–10 cm beside the plant stem at the 4–6 leaf stage (V4–V6). This delivers nitrogen when the crop needs it most for vegetative growth without burning the roots.",
  },
  {
    q: "What is the primary cause of post-harvest maize losses in Zimbabwe?",
    options: ["Flooding during storage", "Weevils and moulds in storage", "Transport damage", "Market price drops"], a: 1,
    explanation: "Post-harvest losses of 20–40% are common in Zimbabwe, mainly caused by grain weevils (Sitophilus zeamais) and moulds (Aspergillus, Fusarium) in improperly stored grain. Hermetic storage bags and PICS bags are promoted as low-cost solutions.",
  },
  {
    q: "Which body certifies and regulates seeds in Zimbabwe?",
    options: ["AREX (Agricultural Research Extension Services)", "ZESA", "Seed Co", "TIMB"], a: 0,
    explanation: "AREX (now part of the Ministry of Lands, Agriculture, Fisheries, Water and Rural Development) regulates seed certification, field inspection, and testing in Zimbabwe under the Seeds Act. Seed Co is a private seed company, not the regulator.",
  },
];

const LEVELS = [
  { min: 0,     title: "Seed Farmer"          },
  { min: 500,   title: "Smallholder"           },
  { min: 1500,  title: "Field Farmer"          },
  { min: 3000,  title: "Crop Specialist"       },
  { min: 5500,  title: "Agronomy Expert"       },
  { min: 9000,  title: "Senior Grower"         },
  { min: 14000, title: "Field Expert"          },
  { min: 20000, title: "Master Farmer"         },
  { min: 28000, title: "Agricultural Advisor"  },
  { min: 38000, title: "Mshauri Champion"      },
];

function getLevelTitle(xp: number) {
  let t = LEVELS[0].title;
  for (const l of LEVELS) { if (xp >= l.min) t = l.title; }
  return t;
}

interface LocalStats { xp: number; streak: number; lastPlayedDate: string; }

function loadStats(): LocalStats {
  try { return { xp: 0, streak: 0, lastPlayedDate: "", ...JSON.parse(localStorage.getItem("mshauri_game") || "{}") }; }
  catch { return { xp: 0, streak: 0, lastPlayedDate: "" }; }
}

function saveStats(s: LocalStats) {
  try { localStorage.setItem("mshauri_game", JSON.stringify(s)); } catch {}
}

const TIMER_SECS = 15;
const QUESTIONS_PER_SESSION = 5;
const XP_PER_CORRECT = 50;

interface Props { open: boolean; onClose: () => void; onXpEarned?: (xp: number) => void; }

export function DailyQuiz({ open, onClose, onXpEarned }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [answerAnim, setAnswerAnim] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSession() {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
    setQuestions(shuffled);
    setQi(0); setSelected(null); setAnswered(false);
    setScore(0); setDone(false); setTimeLeft(TIMER_SECS); setAnswerAnim(null);
  }

  useEffect(() => {
    if (open) startSession();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!open || done || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open, qi, answered, done]);

  function handleTimeout() {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(true); setSelected(-1); setAnswerAnim("wrong");
  }

  function handleAnswer(idx: number) {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    setAnswered(true);
    const correct = idx === questions[qi].a;
    if (correct) { setScore(s => s + 1); setAnswerAnim("correct"); }
    else { setAnswerAnim("wrong"); }
  }

  function handleNext() {
    if (qi + 1 >= questions.length) finishSession();
    else { setQi(q => q + 1); setSelected(null); setAnswered(false); setTimeLeft(TIMER_SECS); setAnswerAnim(null); }
  }

  function finishSession() {
    const xpEarned = score * XP_PER_CORRECT;
    const today = new Date().toISOString().split("T")[0];
    const prev = loadStats();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split("T")[0];
    const alreadyToday = prev.lastPlayedDate === today;
    const newXp = alreadyToday ? prev.xp : prev.xp + xpEarned;
    const newStreak = alreadyToday ? prev.streak : prev.lastPlayedDate === yd ? prev.streak + 1 : 1;
    saveStats({ xp: newXp, streak: newStreak, lastPlayedDate: today });
    fetch("/api/game/complete", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xpEarned }),
    }).catch(() => {});
    onXpEarned?.(alreadyToday ? 0 : xpEarned);
    setDone(true);
  }

  if (!open) return null;
  const q = questions[qi];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0f1e0f] border border-[#1a3020] rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
           style={{ boxShadow: "0 0 40px rgba(34,197,94,0.15)" }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a3020]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[#e8f5e9] font-bold text-[14px]">Daily Agri Quiz</span>
          </div>
          {!done && q && (
            <span className="text-[12px] text-[#7aad80] font-medium">
              {qi + 1} / {questions.length}
            </span>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#1a3020] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#7aad80]" />
          </button>
        </div>

        {!done && q && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex gap-1">
                {Array.from({ length: questions.length }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                    i < qi ? "bg-[#22c55e] w-6" : i === qi ? "bg-[#22c55e] w-8" : "bg-[#1a3020] w-6"
                  }`} />
                ))}
              </div>
              <span className={`text-[14px] font-black tabular-nums transition-colors ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-[#22c55e]"}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-[#1a3020] rounded-full h-1 mb-5">
              <div
                className={`h-1 rounded-full transition-all duration-1000 ${timeLeft <= 5 ? "bg-red-400" : "bg-[#22c55e]"}`}
                style={{ width: `${(timeLeft / TIMER_SECS) * 100}%` }}
              />
            </div>

            <p className="text-[#e8f5e9] font-bold text-[15px] leading-snug mb-5 min-h-[48px]">{q.q}</p>

            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.a;
                const isSelected = i === selected;
                let cls = "border border-[#1a3020] bg-[#0d180d] text-[#e8f5e9] hover:border-[#22c55e]/50 hover:bg-[#22c55e]/5";
                let extraAnim = "";
                if (answered) {
                  if (isCorrect) { cls = "border border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"; if (isSelected) extraAnim = "animate-bounce-in"; }
                  else if (isSelected) { cls = "border border-red-500 bg-red-500/10 text-red-400"; extraAnim = "animate-shake"; }
                  else cls = "border border-[#1a3020] bg-[#0d180d] text-[#4a7050] opacity-50";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left rounded-xl px-4 py-3 text-[13px] font-medium transition-all flex items-center gap-3 ${cls} ${extraAnim}`}
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                      {answered && isCorrect
                        ? <CheckCircle className="w-4 h-4" />
                        : answered && isSelected && !isCorrect
                        ? <XCircle className="w-4 h-4" />
                        : String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={`mt-4 rounded-xl p-3.5 text-[12px] leading-relaxed animate-slide-up ${
                selected === q.a
                  ? "bg-[#22c55e]/10 border border-[#22c55e]/30"
                  : "bg-[#1a1010] border border-red-500/20"
              }`}>
                <p className={`font-bold mb-1 ${selected === q.a ? "text-[#22c55e]" : "text-red-400"}`}>
                  {selected === q.a
                    ? "✅ Correct!"
                    : `❌ Correct answer: ${q.options[q.a]}`}
                </p>
                <p className="text-[#7aad80]">{q.explanation}</p>
              </div>
            )}

            {answered && (
              <button
                onClick={handleNext}
                className="w-full mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-full text-[13px] transition-all animate-slide-up hover:scale-[1.02] active:scale-95"
              >
                {qi + 1 >= questions.length ? "🏆 See Results" : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {done && (
          <div className="p-6 text-center animate-slide-up">
            <div className="text-[48px] mb-2 animate-bounce-in">
              {score >= 4 ? "🏆" : score >= 3 ? "🌟" : score >= 2 ? "🌱" : "📚"}
            </div>
            <h3 className="text-[#e8f5e9] font-black text-[20px] mb-1">
              {score >= 4 ? "Excellent!" : score >= 3 ? "Well done!" : score >= 2 ? "Good try!" : "Keep learning!"}
            </h3>
            <p className="text-[#7aad80] text-[13px] mb-5">
              You scored <span className="text-[#e8f5e9] font-bold">{score}/{questions.length}</span> correct
            </p>

            <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-2xl px-5 py-4 mb-4 animate-bounce-in">
              <div className="text-[#22c55e] font-black text-[28px] leading-none">+{score * XP_PER_CORRECT} XP</div>
              <div className="text-[#7aad80] text-[11px] font-semibold mt-1">
                {getLevelTitle(loadStats().xp)} · {loadStats().xp.toLocaleString()} total XP
              </div>
              {loadStats().streak > 1 && (
                <div className="flex items-center justify-center gap-1 text-orange-400 text-[12px] font-bold mt-2">
                  <Flame className="w-4 h-4" /> {loadStats().streak} day streak!
                </div>
              )}
            </div>

            <p className="text-[#4a7050] text-[11px] mb-4">Come back tomorrow to keep your streak going! 🌱</p>

            <button
              onClick={onClose}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3 rounded-full text-[13px] transition-all hover:scale-[1.02] active:scale-95"
            >
              Done 🎉
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
