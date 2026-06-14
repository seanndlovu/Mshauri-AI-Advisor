import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const communities = [
  { slug: "maize", name: "Maize Farming", description: "Zimbabwe's staple crop — planting, diseases, prices, yield tips", member_count: 1240 },
  { slug: "livestock", name: "Livestock & Cattle", description: "Cattle, goats, and sheep farming across Zimbabwe", member_count: 890 },
  { slug: "vegetables", name: "Vegetables & Horticulture", description: "Commercial and smallholder vegetable production", member_count: 760 },
  { slug: "poultry", name: "Poultry Farming", description: "Broilers, layers, and free-range chicken production", member_count: 620 },
  { slug: "tobacco", name: "Tobacco", description: "Tobacco farming, curing, and auction floors", member_count: 430 },
  { slug: "pests", name: "Pests & Diseases", description: "Identify and control crop pests and diseases", member_count: 980 },
  { slug: "irrigation", name: "Irrigation & Water", description: "Small-scale and commercial irrigation systems", member_count: 340 },
  { slug: "agribusiness", name: "Agribusiness", description: "Markets, finance, inputs, and entrepreneurship", member_count: 570 },
  { slug: "climate", name: "Weather & Climate", description: "Forecasts, seasonal outlooks, and climate-smart farming", member_count: 820 },
  { slug: "soils", name: "Soils & Fertilisers", description: "Soil health, testing, and fertiliser recommendations", member_count: 490 },
];

const demoUsers = [
  { email: "tendai@demo.zw", password: "demo1234", name: "Tendai Moyo", location: "Harare", role: "farmer" },
  { email: "chipo@demo.zw", password: "demo1234", name: "Chipo Ndlovu", location: "Bulawayo", role: "extension_officer" },
  { email: "farai@demo.zw", password: "demo1234", name: "Farai Mutasa", location: "Mutare", role: "agribusiness" },
  { email: "rutendo@demo.zw", password: "demo1234", name: "Rutendo Zimba", location: "Gweru", role: "farmer" },
  { email: "tafadzwa@demo.zw", password: "demo1234", name: "Tafadzwa Chirwa", location: "Masvingo", role: "researcher" },
];

interface PostSeed {
  communitySlug: string;
  type: string;
  location: string;
  title: string;
  content: string;
  authorIdx: number;
  upvotes?: number;
}

const postSeeds: PostSeed[] = [
  { communitySlug: "maize", type: "disease_report", location: "Mashonaland East", authorIdx: 0, upvotes: 47,
    title: "Maize streak virus spreading rapidly — Murehwa area",
    content: "I've noticed yellow streaks on maize leaves across 5 plots in Murehwa. Kernels not forming properly. Already lost 30% of my crop. Extension officer confirmed it's maize streak virus spread by leafhoppers." },
  { communitySlug: "maize", type: "question", location: "Mashonaland West", authorIdx: 3, upvotes: 23,
    title: "Best fertiliser schedule for hybrid maize in Chinhoyi area?",
    content: "Planting Pioneer 30G19 on 5 hectares this season. Soil test shows low nitrogen and moderate phosphorus. What fertiliser programme should I follow? Heard about the 2+1 method but unsure about timing." },
  { communitySlug: "maize", type: "market_price", location: "Harare", authorIdx: 2, upvotes: 35,
    title: "GMB maize price update — $380/tonne",
    content: "GMB just announced $380 per tonne for grade A maize. Farmers in Mashonaland Central say this barely covers input costs. Anyone selling to private buyers for better rates?" },
  { communitySlug: "maize", type: "success_story", location: "Midlands", authorIdx: 1, upvotes: 82,
    title: "10 tonnes/ha yield using conservation farming — here's how",
    content: "After switching to conservation farming 3 years ago my yield went from 4t/ha to 10t/ha on the same land. No tillage, mulch retention, and planting basins made the difference." },
  { communitySlug: "maize", type: "weather", location: "Manicaland", authorIdx: 4, upvotes: 64,
    title: "El Niño watch: delayed rains expected this season",
    content: "ZIMMET has issued a seasonal forecast indicating 60% probability of below-normal rainfall for October–December. Consider drought-tolerant varieties like SC403 or DT hybrid." },
  { communitySlug: "maize", type: "question", location: "Mashonaland Central", authorIdx: 0, upvotes: 18,
    title: "Intercropping maize with cowpeas — good or bad idea?",
    content: "Heard cowpea intercropping can improve soil nitrogen and give extra income. Has anyone tried this with hybrid maize? Worried it will compete for water and reduce my main crop yield." },
  { communitySlug: "livestock", type: "disease_report", location: "Matabeleland South", authorIdx: 3, upvotes: 91,
    title: "Lumpy skin disease confirmed in Gwanda district — urgent",
    content: "Veterinary officials confirmed LSD in Gwanda. 23 cattle affected across 4 farms. Symptoms: raised lumps on skin, high fever, reduced milk. Please vaccinate your herds immediately." },
  { communitySlug: "livestock", type: "question", location: "Midlands", authorIdx: 0, upvotes: 29,
    title: "Which dip to use for tick control — resistance is a problem",
    content: "Been using Supona for 3 years and it no longer seems effective. Vet said ticks may be resistant. What alternatives are farmers using? I have 47 head of cattle and dip weekly." },
  { communitySlug: "livestock", type: "market_price", location: "Harare", authorIdx: 2, upvotes: 44,
    title: "Cattle prices at Harare Agricultural Show — $2.80/kg live",
    content: "Grade A beef cattle selling at $2.80/kg live weight at the show grounds today. Feedlot buyers from SA present. Culls going for $1.80/kg. Demand seems strong heading into winter." },
  { communitySlug: "livestock", type: "success_story", location: "Masvingo", authorIdx: 1, upvotes: 73,
    title: "From 10 to 200 cattle in 8 years — my breeding strategy",
    content: "Started with 10 Brahman crosses in 2016. Through strategic breeding with Angus bull, AI on top cows, and strict culling I now run 200 cattle. Happy to share the full programme." },
  { communitySlug: "livestock", type: "question", location: "Matabeleland North", authorIdx: 4, upvotes: 21,
    title: "Feed supplementation for cattle during dry season?",
    content: "Struggling to maintain body condition from August to October. Grazing is very poor. Comparing molasses urea blocks vs cottonseed cake vs hay — what works best value per kg?" },
  { communitySlug: "vegetables", type: "question", location: "Harare", authorIdx: 0, upvotes: 38,
    title: "Tomato blight destroying my crop — what to spray?",
    content: "My Roma tomatoes have dark brown spots on leaves spreading quickly. Started on lower leaves 2 weeks ago, now everywhere. Tried mancozeb but not working. Help!" },
  { communitySlug: "vegetables", type: "market_price", location: "Bulawayo", authorIdx: 2, upvotes: 56,
    title: "Onion prices crashed at Mbare — 10kg for $2",
    content: "South African imports flooding the market, onion prices at Mbare Musika dropped to $2 per 10kg box. Below production cost for most growers. We need coordinated supply management." },
  { communitySlug: "vegetables", type: "success_story", location: "Mutare", authorIdx: 4, upvotes: 88,
    title: "Year-round baby vegetables for export — how I set it up",
    content: "I supply baby carrots, fine beans, and sugar snap peas to a Harare exporter shipping to UK supermarkets weekly. Took 2 years to get GlobalG.A.P. certified but I now earn 3x more than selling locally." },
  { communitySlug: "vegetables", type: "opportunity", location: "Harare", authorIdx: 2, upvotes: 62,
    title: "OK Zimbabwe needs 2 tonnes of butternut per week — suppliers wanted",
    content: "OK Zimbabwe procurement looking for certified fresh produce suppliers for Harare and Bulawayo stores. Minimum 2 tonnes/week. Must be invoiced, quality graded, and consistently supplied." },
  { communitySlug: "poultry", type: "disease_report", location: "Harare", authorIdx: 1, upvotes: 77,
    title: "Newcastle disease outbreak in Ruwa — report suspicious deaths",
    content: "Several Ruwa area farmers reporting sudden deaths — birds showing twisted necks, diarrhoea, breathing difficulty. DVS confirmed Newcastle disease. Depopulation happening at one farm." },
  { communitySlug: "poultry", type: "question", location: "Gweru", authorIdx: 3, upvotes: 31,
    title: "Best broiler FCR at current feed prices?",
    content: "With Irvines starter at $1.80/kg, what FCR are people achieving? I'm getting 1.8 on good batches but averaging 2.1. Are there cheaper ration alternatives for good growth to 2kg in 35 days?" },
  { communitySlug: "poultry", type: "market_price", location: "Harare", authorIdx: 2, upvotes: 42,
    title: "Live broiler prices week 24 — $5.20/kg at Mbare",
    content: "Live broilers selling at $5.20/kg at Mbare this week, up from $4.90 last week. Just before school holidays so demand picking up. Consider holding extra days if you can manage feed costs." },
  { communitySlug: "pests", type: "disease_report", location: "Mashonaland Central", authorIdx: 4, upvotes: 95,
    title: "Fall armyworm pressure very high — Bindura and Shamva warning",
    content: "FAO field monitoring shows fall armyworm at economically damaging levels in Bindura and Shamva. Prioritise scouting next 14 days. Emamectin benzoate still effective at 0.4L/ha." },
  { communitySlug: "pests", type: "question", location: "Manicaland", authorIdx: 0, upvotes: 27,
    title: "Stalk borer vs fall armyworm — how to tell them apart?",
    content: "I see larvae in my maize whorls but not sure if it's stalk borer or fall armyworm. The treatment is different so I need to be sure before spraying. Any photos or ID tips?" },
  { communitySlug: "pests", type: "success_story", location: "Masvingo", authorIdx: 1, upvotes: 66,
    title: "Push-pull technology eliminated 80% of my stalk borer damage",
    content: "After ICIPE training on push-pull (Napier grass borders + Desmodium intercrop), stalk borer damage dropped from 40% to under 8% in one season. No insecticide needed at all." },
  { communitySlug: "agribusiness", type: "opportunity", location: "Harare", authorIdx: 2, upvotes: 53,
    title: "WFP grain tender — 500 tonnes maize needed for school feeding",
    content: "WFP Zimbabwe procuring 500 MT of white maize for school feeding in Manicaland and Mashonaland East. Deadline 30 July. Minimum: Grade B, moisture <13.5%. Email: procurement@zw.wfp.org" },
  { communitySlug: "agribusiness", type: "question", location: "Harare", authorIdx: 3, upvotes: 19,
    title: "Where to get affordable crop insurance in Zimbabwe?",
    content: "After losing most of my tobacco to hail last season, looking for crop insurance. Old Mutual Agriculture and Zimre both have products but can't compare them easily. Anyone used either?" },
  { communitySlug: "agribusiness", type: "success_story", location: "Bulawayo", authorIdx: 4, upvotes: 71,
    title: "Started a value-add business — dried moringa & chili powder",
    content: "Couldn't get fair prices for fresh produce so invested in a solar dryer and small packaging machine. Now selling dried moringa leaf powder and chili flakes to supermarkets. Margins are 5x better." },
  { communitySlug: "climate", type: "weather", location: "Zimbabwe", authorIdx: 4, upvotes: 84,
    title: "ENSO neutral — near-normal rains expected October 2024",
    content: "Latest ZIMMET/WMO bulletin: ENSO transitioning to neutral, favouring near-normal to above-normal rainfall for 2024/25 season. Plant maize on time in October. La Niña possible by December." },
  { communitySlug: "climate", type: "question", location: "Matabeleland North", authorIdx: 3, upvotes: 22,
    title: "Climate-smart varieties for sub-450mm rainfall areas?",
    content: "With rainfall below 450mm/year in my area, which varieties and practices actually work? Tried SC403 but still struggle in bad years. Any NGO programmes or research stations I can learn from?" },
  { communitySlug: "soils", type: "question", location: "Mashonaland West", authorIdx: 0, upvotes: 36,
    title: "Soil pH 4.8 — how much lime per hectare to reach pH 6.0?",
    content: "Got pH 4.8 with low calcium and magnesium from the government lab. They recommended liming but didn't say how much. Is calcitic or dolomitic lime better for maize in clay soils?" },
  { communitySlug: "soils", type: "success_story", location: "Midlands", authorIdx: 1, upvotes: 79,
    title: "3 years of compost: yields up 60%, input costs down 40%",
    content: "Invested in a compost facility using crop residues, cattle manure, and kitchen waste. After three seasons applying 10t/ha, soil organic matter rose from 0.8% to 2.3% and yields followed." },
  { communitySlug: "irrigation", type: "question", location: "Masvingo", authorIdx: 3, upvotes: 24,
    title: "Solar pump for 2-hectare vegetable plot — what size?",
    content: "Borehole 35m deep, want to irrigate 2 hectares of vegetables. Looking at solar pumps to avoid diesel costs. What panel wattage and pump flow rate do I need? Budget around $3000." },
  { communitySlug: "irrigation", type: "opportunity", location: "Zimbabwe", authorIdx: 2, upvotes: 58,
    title: "AFZ drip irrigation subsidy — 70% off for registered smallholders",
    content: "Agritex Zimbabwe offering 70% subsidy on drip irrigation kits for registered smallholder farmers under 5 hectares. Apply at your local Agritex office by end of August." },
  { communitySlug: "tobacco", type: "market_price", location: "Harare", authorIdx: 2, upvotes: 48,
    title: "Tobacco auction floors week 20 — average $3.85/kg",
    content: "Bale Shoko: $3.85/kg average. Beira Auction: $3.60/kg. Chinese buyers paying premium on top grades. R grade averaging $4.10. 22,000 bales sold this week, up 15% year-on-year." },
  { communitySlug: "tobacco", type: "question", location: "Mashonaland West", authorIdx: 0, upvotes: 16,
    title: "Sucker control timing for flue-cured tobacco after topping?",
    content: "Tobacco topped — need to apply sucker control. When is the optimal timing for maleic hydrazide application? I've seen recommendations ranging from immediate to 3–4 days post-topping." },
];

const commentTexts = [
  "Great information, thanks for sharing! I've seen the same in my area.",
  "This happened on my farm last year — took 3 weeks to recover completely.",
  "Interesting. What variety were you growing when this occurred?",
  "Our extension officer recommended the same treatment. Worked well for us.",
  "Market situation is even worse in Mutare — $1.50 less per unit.",
  "I contacted DVS about this — they are aware and actively monitoring.",
  "Excellent results! Did you use any soil amendments alongside this?",
  "Can you share the contact for the buyer you mentioned? Very interested.",
  "Warning: the product mentioned is being counterfeited — buy from registered agro-dealers only.",
  "Will try this method on my 2-hectare plot this season and report back.",
  "Which district are you in? Would like to visit and learn from your setup.",
  "We submitted this issue to our MP — no response yet unfortunately.",
];

async function run(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function seed() {
  console.log("🌱 Seeding Mshauri community data...\n");

  // Communities
  console.log("  Inserting communities...");
  const communityIds = new Map<string, number>();
  for (const c of communities) {
    const r = await run(
      `INSERT INTO communities (slug, name, description, member_count)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [c.slug, c.name, c.description, c.member_count]
    );
    communityIds.set(c.slug, r.rows[0].id);
  }
  console.log(`  ✓ ${communityIds.size} communities`);

  // Demo users
  console.log("  Inserting demo users...");
  const userIds: number[] = [];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    const r = await run(
      `INSERT INTO users (email, password_hash, name, location, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [u.email, hash, u.name, u.location, u.role]
    );
    userIds.push(r.rows[0].id);
  }
  console.log(`  ✓ ${userIds.length} demo users`);

  // Posts
  console.log(`  Inserting ${postSeeds.length} posts...`);
  const postIds: number[] = [];
  const communityPostCounts = new Map<number, number>();

  for (const p of postSeeds) {
    const communityId = communityIds.get(p.communitySlug);
    if (!communityId) continue;
    const userId = userIds[p.authorIdx % userIds.length];
    const userName = demoUsers[p.authorIdx % demoUsers.length].name;
    const daysAgo = Math.floor(Math.random() * 25);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);

    const r = await run(
      `INSERT INTO posts (community_id, user_id, type, title, content, location, author_name, upvotes, downvotes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [communityId, userId, p.type, p.title, p.content, p.location, userName,
        p.upvotes ?? Math.floor(Math.random() * 60) + 5, Math.floor(Math.random() * 4),
        createdAt, createdAt]
    );
    postIds.push(r.rows[0].id);
    communityPostCounts.set(communityId, (communityPostCounts.get(communityId) ?? 0) + 1);
  }

  // Update post counts
  for (const [communityId, count] of communityPostCounts) {
    await run(`UPDATE communities SET post_count = $1 WHERE id = $2`, [count, communityId]);
  }
  console.log(`  ✓ ${postIds.length} posts`);

  // Comments
  console.log("  Adding comments...");
  let commentCount = 0;
  for (const postId of postIds.slice(0, 22)) {
    const n = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < n; i++) {
      const uid = userIds[Math.floor(Math.random() * userIds.length)];
      const uname = demoUsers.find((_, idx) => userIds[idx] === uid)?.name ?? "Anonymous";
      const content = commentTexts[Math.floor(Math.random() * commentTexts.length)];
      await run(
        `INSERT INTO comments (post_id, user_id, content, author_name, upvotes)
         VALUES ($1,$2,$3,$4,$5)`,
        [postId, uid, content, uname, Math.floor(Math.random() * 8)]
      );
      commentCount++;
    }
    await run(`UPDATE posts SET comment_count = $1 WHERE id = $2`, [n, postId]);
  }
  console.log(`  ✓ ${commentCount} comments`);

  console.log("\n✅ Seed complete!");
  console.log("   Login → tendai@demo.zw / demo1234");

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
