import { useState, useEffect } from "react";
import { CloudRain, Wind, Droplets, Thermometer, Sun, CloudSnow, Cloud, Zap, Eye, RefreshCw } from "lucide-react";

/* ─── Zimbabwe cities ────────────────────────────────── */
const CITIES = [
  { name: "Harare",    lat: -17.8277, lng: 31.0534, province: "Mashonaland East" },
  { name: "Bulawayo",  lat: -20.1325, lng: 28.6265, province: "Matabeleland" },
  { name: "Mutare",    lat: -18.9707, lng: 32.6709, province: "Manicaland" },
  { name: "Gweru",     lat: -19.4522, lng: 29.8137, province: "Midlands" },
  { name: "Masvingo",  lat: -20.0744, lng: 30.8328, province: "Masvingo" },
  { name: "Marondera", lat: -18.1867, lng: 31.5514, province: "Mashonaland East" },
  { name: "Bindura",   lat: -17.3024, lng: 31.3311, province: "Mashonaland Central" },
  { name: "Chinhoyi",  lat: -17.3613, lng: 30.1999, province: "Mashonaland West" },
];

/* ─── WMO weather code helpers ───────────────────────── */
function wmoLabel(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}
function WmoIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <Cloud className={className} />;
  if (code <= 55) return <CloudRain className={className} />;
  if (code <= 77) return <CloudSnow className={className} />;
  if (code <= 82) return <CloudRain className={className} />;
  if (code >= 95) return <Zap className={className} />;
  return <Cloud className={className} />;
}
function wmoColor(code: number): string {
  if (code === 0) return "text-yellow-400";
  if (code <= 3) return "text-blue-300";
  if (code <= 55) return "text-blue-400";
  if (code >= 95) return "text-purple-400";
  return "text-[#d7dadc]";
}

/* ─── Growing condition assessment ───────────────────── */
function growingCondition(maxTemp: number, rain7d: number): { label: string; color: string; desc: string } {
  if (maxTemp > 38) return { label: "Heat Stress", color: "text-red-400", desc: "Too hot — crops need irrigation and shade" };
  if (rain7d > 80) return { label: "Waterlogging Risk", color: "text-blue-400", desc: "Heavy rain — watch drainage and fungal disease" };
  if (rain7d < 5 && maxTemp > 30) return { label: "Drought Stress", color: "text-orange-400", desc: "Dry & hot — irrigation critical" };
  if (maxTemp >= 20 && maxTemp <= 32 && rain7d >= 15) return { label: "Excellent", color: "text-green-400", desc: "Ideal growing conditions" };
  return { label: "Fair", color: "text-yellow-400", desc: "Monitor moisture levels" };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── Main Weather page ───────────────────────────────── */
export default function Weather() {
  const [cityIdx, setCityIdx] = useState(0);
  const city = CITIES[cityIdx];

  const [current, setCurrent] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function fetchWeather(lat: number, lng: number) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: "temperature_2m,apparent_temperature,relative_humidity_2m,rain,wind_speed_10m,weather_code",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,weather_code",
        timezone: "Africa/Harare",
        forecast_days: "7",
      });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      const data = await res.json();
      setCurrent(data.current);
      setDaily(data.daily);
      setLastFetched(new Date());
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWeather(city.lat, city.lng); }, [cityIdx]);

  const rain7d = daily?.precipitation_sum?.reduce((a: number, b: number) => a + b, 0) ?? 0;
  const maxTemp = daily?.temperature_2m_max?.[0] ?? 25;
  const condition = growingCondition(maxTemp, rain7d);

  return (
    <div className="h-full overflow-y-auto bg-[#1a1a1b]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[#d7dadc] font-black text-[22px]">Zimbabwe Weather</h1>
          </div>
          <button
            onClick={() => fetchWeather(city.lat, city.lng)}
            disabled={loading}
            className="flex items-center gap-1.5 text-[#22c55e] text-[11px] font-bold border border-[#22c55e]/30 px-3 py-1.5 rounded-full hover:bg-[#22c55e]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* City selector */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {CITIES.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setCityIdx(i)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                i === cityIdx
                  ? "bg-[#22c55e] text-white"
                  : "bg-[#1e2025] border border-[#343536] text-[#818384] hover:text-[#d7dadc] hover:border-[#818384]/50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading && !current ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-[#22c55e] animate-spin" />
            <p className="text-[#818384]">Fetching weather for {city.name}…</p>
          </div>
        ) : current ? (
          <>
            {/* Current conditions card */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[#d7dadc] font-black text-[13px] uppercase tracking-wider">{city.name}</div>
                  <div className="text-[#818384] text-[11px]">{city.province}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#4a5568]">
                    {lastFetched ? `Updated ${lastFetched.toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-5">
                <WmoIcon code={current.weather_code} className={`w-16 h-16 shrink-0 ${wmoColor(current.weather_code)}`} />
                <div>
                  <div className="text-[#d7dadc] font-black text-[52px] leading-none">{Math.round(current.temperature_2m)}°</div>
                  <div className="text-[#818384] text-[13px]">{wmoLabel(current.weather_code)}</div>
                  <div className="text-[#818384] text-[11px]">Feels like {Math.round(current.apparent_temperature)}°C</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricTile icon={<Droplets className="w-4 h-4 text-blue-400" />} label="Humidity" value={`${current.relative_humidity_2m}%`} />
                <MetricTile icon={<Wind className="w-4 h-4 text-[#818384]" />} label="Wind" value={`${Math.round(current.wind_speed_10m)} km/h`} />
                <MetricTile icon={<CloudRain className="w-4 h-4 text-blue-400" />} label="Rain" value={`${current.rain} mm`} />
                <MetricTile icon={<Thermometer className="w-4 h-4 text-orange-400" />} label="7-Day Rain" value={`${rain7d.toFixed(1)} mm`} />
              </div>
            </div>

            {/* Growing conditions */}
            <div className={`bg-[#1e2025] border border-[#343536] rounded-xl p-4 mb-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#818384] text-[10px] font-bold uppercase tracking-wider mb-1">Growing Conditions</div>
                  <div className={`font-black text-[18px] ${condition.color}`}>{condition.label}</div>
                  <div className="text-[#818384] text-[12px] mt-0.5">{condition.desc}</div>
                </div>
                <Eye className={`w-10 h-10 ${condition.color} opacity-30`} />
              </div>
            </div>

            {/* 7-day forecast */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4 mb-4">
              <h3 className="text-[#d7dadc] font-bold text-[12px] uppercase tracking-wider mb-3">7-Day Forecast</h3>
              <div className="flex flex-col gap-2">
                {daily?.time?.map((date: string, i: number) => {
                  const d = new Date(date);
                  const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[d.getDay()];
                  const code = daily.weather_code[i];
                  const hi = Math.round(daily.temperature_2m_max[i]);
                  const lo = Math.round(daily.temperature_2m_min[i]);
                  const rain = daily.precipitation_sum[i].toFixed(1);
                  const et0 = daily.et0_fao_evapotranspiration[i].toFixed(1);
                  return (
                    <div key={date} className={`flex items-center gap-3 py-2 ${i < daily.time.length - 1 ? "border-b border-[#2d2e30]" : ""}`}>
                      <span className="w-16 text-[12px] text-[#d7dadc] font-semibold shrink-0">{dayLabel}</span>
                      <WmoIcon code={code} className={`w-5 h-5 shrink-0 ${wmoColor(code)}`} />
                      <span className="flex-1 text-[11px] text-[#818384]">{wmoLabel(code)}</span>
                      <span className="text-blue-400 text-[11px] font-semibold w-14 text-right">{rain} mm 🌧</span>
                      <div className="flex items-center gap-1 w-20 text-right justify-end">
                        <span className="text-[#d7dadc] font-bold text-[12px]">{hi}°</span>
                        <span className="text-[#4a5568] text-[12px]">/</span>
                        <span className="text-[#818384] text-[12px]">{lo}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agricultural indices */}
            <div className="bg-[#1e2025] border border-[#343536] rounded-xl p-4">
              <h3 className="text-[#d7dadc] font-bold text-[12px] uppercase tracking-wider mb-3">Food Systems Indices</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#272729] rounded-lg p-3">
                  <div className="text-[#818384] text-[10px] font-bold uppercase tracking-wider mb-1">Evapotranspiration (ET₀)</div>
                  <div className="text-[#d7dadc] font-black text-[20px]">{daily?.et0_fao_evapotranspiration?.[0]?.toFixed(1)} mm/day</div>
                  <div className="text-[#818384] text-[11px] mt-0.5">How much water crops need today</div>
                </div>
                <div className="bg-[#272729] rounded-lg p-3">
                  <div className="text-[#818384] text-[10px] font-bold uppercase tracking-wider mb-1">7-Day Total Rainfall</div>
                  <div className={`font-black text-[20px] ${rain7d > 50 ? "text-blue-400" : rain7d < 10 ? "text-orange-400" : "text-green-400"}`}>{rain7d.toFixed(1)} mm</div>
                  <div className="text-[#818384] text-[11px] mt-0.5">{rain7d < 10 ? "Low — consider irrigation" : rain7d > 60 ? "High — monitor drainage" : "Adequate for most crops"}</div>
                </div>
                <div className="bg-[#272729] rounded-lg p-3">
                  <div className="text-[#818384] text-[10px] font-bold uppercase tracking-wider mb-1">Temperature Range</div>
                  <div className="text-[#d7dadc] font-black text-[20px]">{Math.round(daily?.temperature_2m_min?.[0])}° – {Math.round(daily?.temperature_2m_max?.[0])}°C</div>
                  <div className="text-[#818384] text-[11px] mt-0.5">Today's low / high</div>
                </div>
                <div className="bg-[#272729] rounded-lg p-3">
                  <div className="text-[#818384] text-[10px] font-bold uppercase tracking-wider mb-1">Weekly Rain Total</div>
                  <div className="flex flex-col gap-1 mt-1">
                    {daily?.precipitation_sum?.map((r: number, i: number) => {
                      const d = new Date(daily.time[i]);
                      const label = i === 0 ? "Today" : DAYS[d.getDay()];
                      const pct = Math.min(100, (r / 20) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[#4a5568] text-[10px] w-8 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-[#343536] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[#818384] text-[10px] w-10 text-right">{r.toFixed(1)}mm</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-[#818384]">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Could not load weather data. Check your connection and retry.</p>
            <button onClick={() => fetchWeather(city.lat, city.lng)} className="mt-3 text-[#22c55e] font-bold hover:underline">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-[#272729] rounded-lg px-3 py-2.5">
      {icon}
      <div>
        <div className="text-[#4a5568] text-[9px] uppercase tracking-wide font-bold">{label}</div>
        <div className="text-[#d7dadc] text-[13px] font-bold">{value}</div>
      </div>
    </div>
  );
}
