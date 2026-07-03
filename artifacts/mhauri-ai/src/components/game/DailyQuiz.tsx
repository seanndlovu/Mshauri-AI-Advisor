import { useState, useEffect, useRef } from "react";
import { X, Trophy, Zap, CheckCircle, XCircle } from "lucide-react";

interface Question {
  q: string;
  options: string[];
  a: number;
}

const QUIZ_BANK: Question[] = [
  { q: "What is Zimbabwe's most important staple food crop?", options: ["Wheat", "Maize", "Rice", "Sorghum"], a: 1 },
  { q: "Which pest causes the most damage to maize in Zimbabwe?", options: ["Aphids", "Bollworm", "Fall Armyworm", "Stalk Borer"], a: 2 },
  { q: "Which cash crop is Zimbabwe famous for globally?", options: ["Coffee", "Tobacco", "Cotton", "Tea"], a: 1 },
  { q: "What does NPK stand for in fertilizer?", options: ["Natural Plant Kingdom", "Nitrogen-Phosphorus-Potassium", "Nitrogen-Protein-Kelp", "Net Plant Kilogram"], a: 1 },
  { q: "What soil pH range is ideal for most Zimbabwe crops?", options: ["4.0–5.0", "5.5–6.5", "7.0–8.0", "8.5–9.5"], a: 1 },
  { q: "What does 'conservation agriculture' primarily do?", options: ["Expands farmland", "Reduces chemical use only", "Improves soil health and retains moisture", "Increases mechanization"], a: 2 },
  { q: "When do most Zimbabwean farmers plant maize?", options: ["March–May", "June–August", "October–December", "January only"], a: 2 },
  { q: "What is 'Dimba farming' in Zimbabwe?", options: ["Farming on hillsides", "Wetland farming in dry season", "Indoor greenhouse farming", "Organic certification"], a: 1 },
  { q: "What does IPM stand for in crop protection?", options: ["International Plant Medicine", "Integrated Pest Management", "Intensive Planting Method", "Irrigation Pipe Management"], a: 1 },
  { q: "What animal provides most draught power for smallholder farmers?", options: ["Donkey", "Ox", "Horse", "Tractor"], a: 1 },
  { q: "Urea fertilizer primarily provides which nutrient?", options: ["Phosphorus", "Potassium", "Nitrogen", "Calcium"], a: 2 },
  { q: "What is the main purpose of contour ridges in farming?", options: ["Mark property boundaries", "Prevent soil erosion and retain water", "Create planting rows", "Drain excess water"], a: 1 },
  { q: "Maize smut disease replaces grain with:", options: ["Yellow powder", "Black powdery masses", "White spots", "Brown lumps"], a: 1 },
  { q: "Which province is Zimbabwe's primary tobacco-growing region?", options: ["Mashonaland Central", "Matabeleland South", "Manicaland", "Midlands"], a: 0 },
  { q: "What does 'agroforestry' mean?", options: ["Cutting trees for farmland", "Growing trees alongside crops and livestock", "Farming in forests", "Tree nursery management"], a: 1 },
  { q: "What is the recommended in-row spacing for maize?", options: ["10 cm", "25–30 cm", "60 cm", "1 metre"], a: 1 },
  { q: "Which mineral deficiency is treated with lime application?", options: ["Nitrogen", "Phosphorus", "Calcium", "Iron"], a: 2 },
  { q: "What does 'side dressing' mean in maize farming?", options: ["Growing maize beside other crops", "Applying fertilizer alongside growing plants", "Planting on slopes", "Irrigation technique"], a: 1 },
  { q: "What is the primary cause of post-harvest maize losses in Zimbabwe?", options: ["Flooding", "Weevils and moulds in storage", "Transport damage", "Market price drops"], a: 1 },
  { q: "Which body certifies seeds in Zimbabwe?", options: ["AREX", "ZESA", "SEED CO", "TIMB"], a: 0 },
];

const LEVELS = [
  { min: 0,     title: "Seed Farmer"         },
  { min: 500,   title: "Smallholder"          },
  { min: 1500,  title: "Field Farmer"         },
  { min: 3000,  title: "Crop Specialist"      },
  { min: 5500,  title: "Agronomy Expert"      },
  { min: 9000,  title: "Senior Grower"        },
  { min: 14000, title: "Field Expert"         },
  { min: 20000, title: "Master Farmer"        },
  { min: 28000, title: "Agricultural Advisor" },
  { min: 38000, title: "Mshauri Champion"     },
];

function getLevelTitle(xp: number) {
  let t = LEVELS[0].title;
  for (const l of LEVELS) { if (xp >= l.min) t = l.title; }
  return t;
}

interface LocalStats { xp: number; streak: number; lastPlayedDate: string; }

function loadStats(): LocalStats {
  try { return JSON.parse(localStorage.getItem("mshauri_game") || "{}"); } catch { return { xp: 0, streak: 0, lastPlayedDate: "" }; }
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSession() {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
    setQuestions(shuffled);
    setQi(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setTimeLeft(TIMER_SECS);
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
    setAnswered(true);
    setSelected(-1);
  }

  function handleAnswer(idx: number) {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    setAnswered(true);
    const correct = idx === questions[qi].a;
    if (correct) setScore(s => s + 1);
  }

  function handleNext() {
    if (qi + 1 >= questions.length) {
      finishSession();
    } else {
      setQi(q => q + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIMER_SECS);
    }
  }

  function finishSession() {
    const xpEarned = score * XP_PER_CORRECT;
    const today = new Date().toISOString().split("T")[0];
    const prev = loadStats();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split("T")[0];
    const alreadyToday = prev.lastPlayedDate === today;
    const newXp = alreadyToday ? prev.xp : prev.xp + xpEarned;
    const newStreak = alreadyToday ? prev.streak : prev.lastPlayedDate === yd ? prev.streak + 1 : 1;
    saveStats({ xp: newXp, streak: newStreak, lastPlayedDate: today });
    fetch("/api/game/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xpEarned }),
    }).catch(() => {});
    onXpEarned?.(alreadyToday ? 0 : xpEarned);
    setDone(true);
  }

  if (!open) return null;

  const q = questions[qi];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#16181C] border border-[#2F3336] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3336]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22c55e]" />
            <span className="text-[#E7E9EA] font-bold text-[14px]">Daily Agri Quiz</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#272729] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#71767B]" />
          </button>
        </div>

        {!done && q && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#71767B] text-[12px]">Question {qi + 1} of {questions.length}</span>
              <span className={`text-[13px] font-bold tabular-nums ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-[#22c55e]"}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-[#2F3336] rounded-full h-1 mb-4">
              <div
                className="bg-[#22c55e] h-1 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / TIMER_SECS) * 100}%` }}
              />
            </div>

            <p className="text-[#E7E9EA] font-semibold text-[15px] leading-snug mb-5">{q.q}</p>

            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.a;
                const isSelected = i === selected;
                let cls = "border border-[#2F3336] bg-[#1a1d21] text-[#E7E9EA] hover:border-[#22c55e]/40 hover:bg-[#22c55e]/5";
                if (answered) {
                  if (isCorrect) cls = "border border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]";
                  else if (isSelected) cls = "border border-red-500 bg-red-500/10 text-red-400";
                  else cls = "border border-[#2F3336] bg-[#1a1d21] text-[#71767B] opacity-60";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left rounded-xl px-4 py-3 text-[13px] font-medium transition-all flex items-center gap-3 ${cls}`}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                      {answered && isCorrect ? <CheckCircle className="w-4 h-4" /> : answered && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {answered && (
              <button
                onClick={handleNext}
                className="w-full mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-full text-[13px] transition-colors"
              >
                {qi + 1 >= questions.length ? "See Results" : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {done && (
          <div className="p-6 text-center">
            <Trophy className="w-12 h-12 text-[#c8a84b] mx-auto mb-3" />
            <h3 className="text-[#E7E9EA] font-black text-[20px] mb-1">
              {score >= 4 ? "Excellent!" : score >= 3 ? "Well done!" : score >= 2 ? "Good try!" : "Keep learning!"}
            </h3>
            <p className="text-[#71767B] text-[13px] mb-4">
              You scored {score}/{questions.length} correct
            </p>
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl px-4 py-3 mb-4 inline-block">
              <div className="text-[#22c55e] font-black text-[22px]">+{score * XP_PER_CORRECT} XP</div>
              <div className="text-[#22c55e]/70 text-[11px] font-semibold">
                {getLevelTitle(loadStats().xp)} · {loadStats().xp.toLocaleString()} total XP
              </div>
            </div>
            <p className="text-[#71767B] text-[12px] mb-4">Come back tomorrow to continue your streak!</p>
            <button
              onClick={onClose}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-2.5 rounded-full text-[13px] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
