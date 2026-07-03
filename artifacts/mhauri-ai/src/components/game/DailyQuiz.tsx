import { useState, useEffect, useRef, useCallback } from "react";
import { X, Trophy, Zap, Flame } from "lucide-react";

/* ── Floating emoji particle system ─────────────────────────────────── */
interface Particle { id: number; emoji: string; x: number; }

const CORRECT_EMOJIS  = ["🌟","✨","🎉","💚","🌿","🏆","⚡","🌱"];
const WRONG_EMOJIS    = ["😬","💧","📚","🤔","💡"];
const DONE_EMOJIS     = ["🎊","🏆","🌟","✨","🎉","🌾","🌽","💚"];

function FloatingParticles({ particles }: { particles: Particle[] }) {
  return (
    <>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x, top: "50%",
          fontSize: 28,
          pointerEvents: "none",
          zIndex: 400,
          animation: "floatUp 1.2s ease-out forwards",
          userSelect: "none",
        }}>
          {p.emoji}
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          60%  { transform: translateY(-120px) scale(1.2); opacity: 0.9; }
          100% { transform: translateY(-220px) scale(0.6); opacity: 0; }
        }
      `}</style>
    </>
  );
}

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
    explanation: "🌽 Maize is the staple food for over 90% of Zimbabweans and is the base of sadza, the national dish. Zimbabwe targets 1.8–2.2 million tonnes annually for food security.",
  },
  {
    q: "Which pest causes the most widespread damage to maize in Zimbabwe?",
    options: ["Aphids", "Bollworm", "Fall Armyworm", "Stalk Borer"], a: 2,
    explanation: "🐛 Fall Armyworm (Spodoptera frugiperda) arrived in Zimbabwe in 2016 and became the #1 pest threat — capable of destroying entire maize fields if not controlled early.",
  },
  {
    q: "Which cash crop is Zimbabwe globally famous for?",
    options: ["Coffee", "Tobacco", "Cotton", "Tea"], a: 1,
    explanation: "🍃 Zimbabwe is among the world's top producers of flue-cured tobacco, historically the country's largest export earner. The TIMB regulates all tobacco sales.",
  },
  {
    q: "What does NPK stand for in fertilizer?",
    options: ["Natural Plant Kingdom", "Nitrogen-Phosphorus-Potassium", "Nitrogen-Protein-Kelp", "Net Plant Kilogram"], a: 1,
    explanation: "🧪 NPK = Nitrogen (N), Phosphorus (P), Potassium (K) — the three primary macronutrients. Compound D (7:14:7 NPK) is widely used for basal dressing in Zimbabwe's maize farming.",
  },
  {
    q: "What soil pH range is ideal for most Zimbabwe crops?",
    options: ["4.0–5.0", "5.5–6.5", "7.0–8.0", "8.5–9.5"], a: 1,
    explanation: "⚗️ A pH of 5.5–6.5 is optimal. Many Zimbabwean soils are naturally acidic (pH 4.5–5.5), so lime application is recommended to raise pH and unlock nutrients.",
  },
  {
    q: "What does 'conservation agriculture' primarily achieve?",
    options: ["Expands farmland", "Reduces chemical use only", "Improves soil health and retains moisture", "Increases mechanization"], a: 2,
    explanation: "🌿 CA has three principles: minimum soil disturbance (no-till), permanent soil cover (mulch/cover crops), and crop rotations. Critical in Zimbabwe's variable rainfall.",
  },
  {
    q: "When do most Zimbabwean farmers plant maize?",
    options: ["March–May", "June–August", "October–December", "January only"], a: 2,
    explanation: "🌧️ Zimbabwe's main rainy season runs October–March. Early planting by 15 November is recommended to maximise yield. Missing planting rains means a lost season.",
  },
  {
    q: "What is 'Dimba farming' in Zimbabwe?",
    options: ["Farming on hillsides", "Wetland/streambank farming in dry season", "Indoor greenhouse farming", "Organic certification"], a: 1,
    explanation: "💧 Dimba farming = cultivating riverbank/wetland plots in the dry season (April–September) using residual soil moisture, enabling year-round vegetable production.",
  },
  {
    q: "What does IPM stand for in crop protection?",
    options: ["International Plant Medicine", "Integrated Pest Management", "Intensive Planting Method", "Irrigation Pipe Management"], a: 1,
    explanation: "🛡️ Integrated Pest Management combines biological control, cultural practices, resistant varieties, and judicious pesticide use — protecting both crops and beneficial insects.",
  },
  {
    q: "What animal provides most draught power for smallholder farmers in Zimbabwe?",
    options: ["Donkey", "Ox", "Horse", "Tractor"], a: 1,
    explanation: "🐄 Oxen are the primary draught power source for over 60% of Zimbabwe's smallholder farmers — used for ploughing, planting, and transportation.",
  },
  {
    q: "Urea fertilizer primarily provides which plant nutrient?",
    options: ["Phosphorus", "Potassium", "Nitrogen", "Calcium"], a: 2,
    explanation: "🌱 Urea (46-0-0) contains 46% Nitrogen — applied as top-dressing 4–6 weeks after maize emergence. Nitrogen drives leafy growth and grain filling.",
  },
  {
    q: "What is the main purpose of contour ridges in Zimbabwean farming?",
    options: ["Mark property boundaries", "Prevent soil erosion and retain water", "Create planting rows", "Drain excess water"], a: 1,
    explanation: "⛰️ Contour ridges slow runoff, reduce soil erosion, and help water infiltrate the soil. AGRITEX promotes contour farming on slopes greater than 2% gradient.",
  },
  {
    q: "Maize smut disease replaces grain kernels with:",
    options: ["Yellow powder", "Black powdery masses (galls)", "White spots", "Brown hard lumps"], a: 1,
    explanation: "🍄 Common smut (Ustilago maydis) causes grey-white galls that burst releasing black spores. Crop rotation and resistant varieties are the main controls.",
  },
  {
    q: "Which province is Zimbabwe's primary tobacco-growing region?",
    options: ["Mashonaland Central", "Matabeleland South", "Manicaland", "Midlands"], a: 0,
    explanation: "📍 Mashonaland Central (along with Mashonaland East & West) is the tobacco heartland. Sandy loam soils and rainfall pattern are ideal for flue-cured Virginia tobacco.",
  },
  {
    q: "What does 'agroforestry' mean in farming practice?",
    options: ["Cutting trees for farmland", "Integrating trees with crops and/or livestock", "Farming inside forests", "Tree nursery management"], a: 1,
    explanation: "🌳 Agroforestry combines trees with crops and/or livestock. The Faidherbia albida (winter thorn) fixes nitrogen and drops leaves during rainy season — a natural fertilizer tree.",
  },
  {
    q: "What is the recommended in-row spacing for maize in Zimbabwe?",
    options: ["10 cm", "25–30 cm", "60 cm", "1 metre"], a: 1,
    explanation: "📏 Recommended spacing: 90 cm between rows × 25–30 cm between plants = ~37,000–44,000 plants/ha. Proper spacing reduces competition for nutrients, water, and light.",
  },
  {
    q: "Which mineral deficiency is corrected by lime application?",
    options: ["Nitrogen deficiency", "Phosphorus deficiency", "Calcium deficiency and soil acidity", "Iron deficiency"], a: 2,
    explanation: "🪨 Agricultural lime raises soil pH and corrects calcium deficiency. At low pH, aluminium and manganese toxicity block root development. AGRITEX recommends 1–2 t/ha on acidic soils.",
  },
  {
    q: "What does 'side dressing' mean in maize farming?",
    options: ["Growing maize beside other crops", "Applying fertilizer alongside growing plants", "Planting on hillside slopes", "An irrigation technique"], a: 1,
    explanation: "🌽 Side dressing = placing fertilizer (urea or AN) 5–10 cm beside the plant at the 4–6 leaf stage (V4–V6). Delivers nitrogen exactly when the crop needs it most.",
  },
  {
    q: "What is the primary cause of post-harvest maize losses in Zimbabwe?",
    options: ["Flooding during storage", "Weevils and moulds in storage", "Transport damage", "Market price drops"], a: 1,
    explanation: "🐞 Post-harvest losses of 20–40% are common, mainly from grain weevils (Sitophilus zeamais) and moulds. Hermetic storage bags and PICS bags are promoted as low-cost solutions.",
  },
  {
    q: "Which body certifies and regulates seeds in Zimbabwe?",
    options: ["AREX (Agricultural Research Extension Services)", "ZESA", "Seed Co", "TIMB"], a: 0,
    explanation: "📜 AREX regulates seed certification, field inspection, and testing under Zimbabwe's Seeds Act. Seed Co is a private seed company — not the regulator.",
  },
];

const LEVELS = [
  { min: 0,     name: "Seed Farmer",          emoji: "🌱" },
  { min: 500,   name: "Smallholder",           emoji: "🌿" },
  { min: 1500,  name: "Field Farmer",          emoji: "🌽" },
  { min: 3000,  name: "Crop Specialist",       emoji: "🧑‍🌾" },
  { min: 5500,  name: "Agronomy Expert",       emoji: "📊" },
  { min: 9000,  name: "Senior Grower",         emoji: "🌳" },
  { min: 14000, name: "Field Expert",          emoji: "🏅" },
  { min: 20000, name: "Master Farmer",         emoji: "🏆" },
  { min: 28000, name: "Agricultural Advisor",  emoji: "🎓" },
  { min: 38000, name: "Mshauri Champion",      emoji: "👑" },
];

function getLevel(xp: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) lvl = l; }
  return lvl;
}

interface LocalStats { xp: number; streak: number; lastPlayedDate: string; }
function loadStats(): LocalStats {
  try { return { xp: 0, streak: 0, lastPlayedDate: "", ...JSON.parse(localStorage.getItem("mshauri_game") ?? "{}") }; }
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
  const [finalStats, setFinalStats] = useState<LocalStats | null>(null);
  const [xpEarnedDisplay, setXpEarnedDisplay] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const burst = useCallback((emojis: string[], count = 6) => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: ++particleIdRef.current,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * (window.innerWidth - 80) + 40,
    }));
    setParticles(p => [...p, ...newParticles]);
    setTimeout(() => {
      setParticles(p => p.filter(x => !newParticles.find(n => n.id === x.id)));
    }, 1400);
  }, []);

  function startSession() {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
    setQuestions(shuffled);
    setQi(0); setSelected(null); setAnswered(false);
    setScore(0); setDone(false); setTimeLeft(TIMER_SECS); setFinalStats(null);
  }

  useEffect(() => { if (open) startSession(); }, [open]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!open || done || answered || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setAnswered(true); setSelected(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open, qi, answered, done, questions.length]);

  function handleAnswer(idx: number) {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[qi].a) {
      setScore(s => s + 1);
      burst(CORRECT_EMOJIS, 7);
    } else {
      burst(WRONG_EMOJIS, 4);
    }
  }

  function handleNext() {
    if (qi + 1 >= questions.length) {
      finishSession(score);
    } else {
      setQi(q => q + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIMER_SECS);
    }
  }

  function finishSession(finalScore: number) {
    burst(finalScore >= 4 ? DONE_EMOJIS : CORRECT_EMOJIS, finalScore >= 4 ? 12 : 6);
    const xpGained = finalScore * XP_PER_CORRECT;
    const today = new Date().toISOString().split("T")[0];
    const prev = loadStats();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split("T")[0];
    const alreadyToday = prev.lastPlayedDate === today;
    const newXp = alreadyToday ? prev.xp : prev.xp + xpGained;
    const newStreak = alreadyToday ? prev.streak
      : prev.lastPlayedDate === yd ? prev.streak + 1 : 1;
    const updated: LocalStats = { xp: newXp, streak: newStreak, lastPlayedDate: today };
    saveStats(updated);
    setFinalStats(updated);
    setXpEarnedDisplay(alreadyToday ? 0 : xpGained);
    onXpEarned?.(alreadyToday ? 0 : xpGained);
    fetch("/api/game/complete", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ xpEarned: xpGained }),
    }).catch(() => {});
    setDone(true);
  }

  if (!open) return null;

  const q = questions[qi] ?? null;

  // Render particles outside the modal so they float over everything
  const particleLayer = <FloatingParticles particles={particles} />;

  function optionStyle(i: number): React.CSSProperties {
    if (!answered) {
      return { background: "rgba(255,255,255,0.04)", border: "1.5px solid #1a3020", color: "#e8f5e9" };
    }
    const isCorrect = i === q?.a;
    const isSelected = i === selected;
    if (isCorrect) return { background: "rgba(34,197,94,0.14)", border: "1.5px solid #22c55e", color: "#22c55e" };
    if (isSelected) return { background: "rgba(239,68,68,0.12)", border: "1.5px solid #ef4444", color: "#ef4444" };
    return { background: "rgba(255,255,255,0.02)", border: "1.5px solid #1a3020", color: "#4a7050", opacity: 0.55 };
  }

  const lvl = finalStats ? getLevel(finalStats.xp) : null;

  return (
    <>
    {particleLayer}
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
               padding: 16, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      className="animate-fade-in"
    >
      <div
        style={{ width: "100%", maxWidth: 440, background: "#0a1a0a", border: "1.5px solid #1a3020", borderRadius: 20,
                 boxShadow: "0 0 50px rgba(34,197,94,0.18)", overflow: "hidden" }}
        className="animate-slide-up"
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px", borderBottom: "1px solid #1a3020" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap style={{ width: 16, height: 16, color: "#22c55e" }} />
            <span style={{ color: "#e8f5e9", fontWeight: 700, fontSize: 14 }}>Daily Agri Quiz</span>
          </div>
          {!done && <span style={{ color: "#7aad80", fontSize: 13, fontWeight: 600 }}>{qi + 1} / {QUESTIONS_PER_SESSION}</span>}
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #1a3020",
                     background: "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                     cursor: "pointer", color: "#7aad80" }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Question */}
        {!done && q && (
          <div style={{ padding: 20 }}>
            {/* Progress dots + timer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {Array.from({ length: QUESTIONS_PER_SESSION }).map((_, i) => (
                  <div key={i} style={{
                    height: 4, borderRadius: 2,
                    width: i < qi ? 24 : i === qi ? 32 : 20,
                    background: i <= qi ? "#22c55e" : "#1a3020",
                    transition: "all 0.3s"
                  }} />
                ))}
              </div>
              <span style={{ color: timeLeft <= 5 ? "#f87171" : "#22c55e", fontWeight: 800, fontSize: 15, minWidth: 30, textAlign: "right" }}>
                {timeLeft}s
              </span>
            </div>
            {/* Timer bar */}
            <div style={{ width: "100%", height: 4, background: "#1a3020", borderRadius: 2, marginBottom: 20 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: timeLeft <= 5 ? "#f87171" : "#22c55e",
                width: `${(timeLeft / TIMER_SECS) * 100}%`,
                transition: "width 1s linear, background 0.3s"
              }} />
            </div>

            {/* Question text */}
            <p style={{ color: "#e8f5e9", fontWeight: 700, fontSize: 16, lineHeight: 1.5, marginBottom: 20 }}>
              {q.q}
            </p>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => {
                const isCorrect = i === q.a;
                const isSelected = i === selected;
                const optStyle = optionStyle(i);
                const animClass = answered && isCorrect && isSelected ? "animate-bounce-in"
                                : answered && isSelected && !isCorrect ? "animate-shake" : "";
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={animClass}
                    style={{
                      ...optStyle,
                      width: "100%", textAlign: "left", borderRadius: 14, padding: "13px 16px",
                      fontSize: 14, fontWeight: 500, cursor: answered ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.2s", fontFamily: "inherit"
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: "50%",
                      border: `1.5px solid ${optStyle.color as string}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0, color: optStyle.color as string
                    }}>
                      {answered && isCorrect ? "✓" : answered && isSelected && !isCorrect ? "✗" : String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <div
                className="animate-slide-up"
                style={{
                  marginTop: 16, borderRadius: 14, padding: 14,
                  background: selected === q.a ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${selected === q.a ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.25)"}`
                }}
              >
                <p style={{
                  fontWeight: 700, fontSize: 13, marginBottom: 5,
                  color: selected === q.a ? "#22c55e" : "#f87171"
                }}>
                  {selected === q.a ? "✅ Correct!" : `❌ Correct: ${q.options[q.a]}`}
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "#a3c9a8" }}>
                  {q.explanation}
                </p>
              </div>
            )}

            {/* Next button */}
            {answered && (
              <button
                onClick={handleNext}
                className="animate-slide-up"
                style={{
                  width: "100%", marginTop: 16, padding: "13px 0",
                  background: "#22c55e", border: "none", borderRadius: 999,
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.2s"
                }}
                onMouseOver={e => (e.currentTarget.style.background = "#16a34a")}
                onMouseOut={e => (e.currentTarget.style.background = "#22c55e")}
              >
                {qi + 1 >= QUESTIONS_PER_SESSION ? "🏆 See Results" : "Next Question →"}
              </button>
            )}
          </div>
        )}

        {/* Done screen */}
        {done && finalStats && (
          <div className="animate-slide-up" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 8 }} className="animate-bounce-in">
              {score >= 4 ? "🏆" : score >= 3 ? "🌟" : score >= 2 ? "🌱" : "📚"}
            </div>
            <p style={{ color: "#e8f5e9", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
              {score >= 4 ? "Excellent!" : score >= 3 ? "Well done!" : score >= 2 ? "Good try!" : "Keep learning!"}
            </p>
            <p style={{ color: "#7aad80", fontSize: 14, marginBottom: 20 }}>
              {score} / {QUESTIONS_PER_SESSION} correct
            </p>

            <div
              className="animate-bounce-in"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                       borderRadius: 18, padding: "18px 24px", marginBottom: 16 }}
            >
              {xpEarnedDisplay > 0 ? (
                <p style={{ color: "#22c55e", fontWeight: 900, fontSize: 32, lineHeight: 1 }}>
                  +{xpEarnedDisplay} XP
                </p>
              ) : (
                <p style={{ color: "#7aad80", fontSize: 13 }}>Already played today — XP not counted again</p>
              )}
              <p style={{ color: "#7aad80", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                {lvl?.emoji} {lvl?.name} · {(finalStats.xp ?? 0).toLocaleString()} total XP
              </p>
              {finalStats.streak > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                              gap: 5, color: "#fb923c", fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                  <Flame style={{ width: 16, height: 16 }} />
                  {finalStats.streak} day streak! 🔥
                </div>
              )}
            </div>

            <p style={{ color: "#4a7050", fontSize: 12, marginBottom: 16 }}>
              Come back tomorrow to keep your streak! 🌱
            </p>

            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "14px 0", background: "#22c55e", border: "none",
                borderRadius: 999, color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit"
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#16a34a")}
              onMouseOut={e => (e.currentTarget.style.background = "#22c55e")}
            >
              Done 🎉
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
