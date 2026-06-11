/* ============================================================
   BOBA STAND! — game data
   ============================================================ */

// --- Flavors -------------------------------------------------
// uniq: 1 (everyone knows it) … 10 (extremely weird)
// tag: classic | fruity | floral | dessert | weird
// syrup: cost of a 10-serving bottle (null = no syrup needed)
// milk: does the recipe use milk?
const FLAVORS = {
  classic:    { name: "Classic Milk Tea",  tag: "classic", uniq: 1,  syrup: null, milk: true,  fill: "#d9a36b", desc: "The timeless one. Safe & cozy." },
  brownsugar: { name: "Brown Sugar",       tag: "classic", uniq: 3,  syrup: null, milk: true,  fill: "#a96a32", desc: "Tiger stripes! Uses extra sugar.", extraSugar: 1 },
  strawberry: { name: "Strawberry",        tag: "fruity",  uniq: 3,  syrup: 6,    milk: true,  fill: "#ff9eb6", desc: "Pink, sweet, crowd-pleasing." },
  mango:      { name: "Mango Fruit Tea",   tag: "fruity",  uniq: 4,  syrup: 6,    milk: false, fill: "#ffc63f", desc: "Sunshine in a cup. No milk." },
  matcha:     { name: "Matcha",            tag: "floral",  uniq: 4,  syrup: 7,    milk: true,  fill: "#9fd07e", desc: "Earthy green goodness." },
  cottoncandy:{ name: "Cotton Candy",      tag: "dessert", uniq: 5,  syrup: 7,    milk: true,  fill: "#ffc1e3", desc: "Tastes like the fair came to town." },
  taro:       { name: "Taro",              tag: "dessert", uniq: 5,  syrup: 7,    milk: true,  fill: "#c5a3e8", desc: "Purple, nutty, fan favourite." },
  honeydew:   { name: "Honeydew",          tag: "fruity",  uniq: 6,  syrup: 7,    milk: true,  fill: "#bfe8a4", desc: "Melon magic. Pleasantly unusual." },
  bdaycake:   { name: "Birthday Cake",     tag: "dessert", uniq: 6,  syrup: 8,    milk: true,  fill: "#fff0b3", desc: "Sprinkles included. Party time!" },
  lavender:   { name: "Lavender Honey",    tag: "floral",  uniq: 7,  syrup: 8,    milk: true,  fill: "#cdb4f0", desc: "Fancy! Trendsetters adore it." },
  mintchip:   { name: "Mint Chip",         tag: "dessert", uniq: 7,  syrup: 8,    milk: true,  fill: "#aef0d0", desc: "Like ice cream you can sip." },
  chilimango: { name: "Chili Mango",       tag: "weird",   uniq: 8,  syrup: 8,    milk: false, fill: "#ffb03a", desc: "Sweet heat. Risky… or genius?" },
  maplebacon: { name: "Maple Bacon",       tag: "weird",   uniq: 9,  syrup: 9,    milk: true,  fill: "#e8b079", desc: "Breakfast?! In a boba?!" },
  pickle:     { name: "Dill Pickle",       tag: "weird",   uniq: 10, syrup: 9,    milk: false, fill: "#b9d77a", desc: "Why. WHY. (…it might go viral)" },
  garlic:     { name: "Garlic Butter",     tag: "weird",   uniq: 10, syrup: 9,    milk: true,  fill: "#f3e6b0", desc: "Banned in 3 lunchrooms." },
};

const TAG_NAMES = {
  classic: "Classic Cozy", fruity: "Fruity Fresh", floral: "Flower Power",
  dessert: "Dessert Mode", weird: "Weird & Wild",
};

// --- Shop staples (each pack = 10 servings) ------------------
const STAPLES = {
  starch: { name: "Tapioca Starch", ico: "🥡", cost: 6, desc: "1 pack cooks into a batch of 10 pearls" },
  tea:    { name: "Tea Leaves",     ico: "🍃", cost: 4, desc: "Brews 10 cups of tea" },
  milk:   { name: "Milk Jug",       ico: "🥛", cost: 5, desc: "Enough for 10 milky drinks" },
  sugar:  { name: "Sugar Bag",      ico: "🟤", cost: 3, desc: "For syrup-soaking pearls & classic tea" },
  cups:   { name: "Cups + Straws",  ico: "🥤", cost: 3, desc: "10 cups with fat straws" },
};

// --- Locations (her real neighbourhood!) ---------------------
// traffic: [weekday, weekend] average passers-by
const LOCATIONS = {
  cottonwood: { name: "Cottonwood Park", x: 320, y: 255, traffic: [18, 30],
    prefs: ["fruity", "dessert"], blurb: "Playground crowd. Busy on sunny weekends." },
  cafecorner: { name: "Crabapple Café Corner", x: 472, y: 198, traffic: [24, 18],
    prefs: ["classic"], blurb: "Commuters & café regulars. Strong on weekdays." },
  depot:      { name: "Depot Rd Crossing", x: 624, y: 72, traffic: [15, 20],
    prefs: ["classic", "weird"], blurb: "Train watchers stop by all week." },
  mcdonald:   { name: "McDonald Place Park", x: 648, y: 420, traffic: [12, 20],
    prefs: ["dessert"], blurb: "Quiet park. Families wander in on weekends." },
  farmstand:  { name: "Two Sisters Farm Gate", x: 452, y: 470, traffic: [9, 34],
    prefs: ["fruity"], blurb: "Weekend market crowd LOVES fresh flavours." },
  brownpark:  { name: "Brown Memorial Park", x: 96, y: 150, traffic: [13, 18],
    prefs: ["floral"], blurb: "Garden strollers with fancy taste." },
  camp:       { name: "Summer Camp Yard", x: 268, y: 392, traffic: [26, 9],
    prefs: ["weird", "dessert"], blurb: "Camp kids! Wild taste, weekdays only." },
  eagleview:  { name: "Eagleview Cul-de-sac", x: 575, y: 510, traffic: [9, 12],
    prefs: ["classic"], blurb: "Sleepy street, but neighbours stay loyal.", loyal: true },
};

// --- Weather -------------------------------------------------
const WEATHER = {
  sunny:    { name: "Sunny",    ico: "☀️", mult: 1.0  },
  heatwave: { name: "Heatwave", ico: "🥵", mult: 1.45 },
  cloudy:   { name: "Cloudy",   ico: "⛅", mult: 0.85 },
  rainy:    { name: "Rainy",    ico: "🌧️", mult: 0.55 },
};
const WEATHER_ODDS = [["sunny", .45], ["cloudy", .25], ["heatwave", .15], ["rainy", .15]];

// --- Random neighbourhood events ----------------------------
const EVENTS = [
  { name: "Soccer Tournament", ico: "⚽", locs: ["cottonwood", "mcdonald"], mult: 2.2,
    blurb: "teams + thirsty parents all day" },
  { name: "Farmers Market", ico: "🥕", locs: ["farmstand"], mult: 2.5,
    blurb: "stalls, music, and a big crowd" },
  { name: "Vintage Train Day", ico: "🚂", locs: ["depot"], mult: 2.0,
    blurb: "trainspotters from all over town" },
  { name: "Street-wide Garage Sale", ico: "🪑", locs: ["eagleview", "camp"], mult: 1.9,
    blurb: "bargain hunters everywhere" },
  { name: "Concert in the Park", ico: "🎸", locs: ["brownpark"], mult: 2.2,
    blurb: "local band + picnic blankets" },
  { name: "Fun Run Finish Line", ico: "🏃", locs: ["cafecorner"], mult: 2.0,
    blurb: "very sweaty, very thirsty runners" },
];

// --- Hireable kids ------------------------------------------
// charm: how well they sell (1-10) · skill: boba craft (1-10)
const STAFF_POOL = [
  { id: "pip",  name: "Pip",   charm: 5, skill: 5, wage: 14, hair: "#e8743c", shirt: "#4db890", blurb: "Reliable. Brings own snacks." },
  { id: "maya", name: "Maya",  charm: 8, skill: 4, wage: 18, hair: "#3b2c26", shirt: "#ff8fb1", blurb: "Could sell mittens in July." },
  { id: "leo",  name: "Leo",   charm: 4, skill: 8, wage: 18, hair: "#f5d442", shirt: "#6ba7e8", blurb: "Pearl perfectionist. Few words." },
  { id: "sana", name: "Sana",  charm: 9, skill: 7, wage: 26, hair: "#5a3a8a", shirt: "#ffd93d", blurb: "A legend. Worth every dollar." },
  { id: "theo", name: "Theo",  charm: 3, skill: 3, wage: 8,  hair: "#8a5a2c", shirt: "#b9d77a", blurb: "Enthusiastic. Spills sometimes." },
  { id: "june", name: "June",  charm: 6, skill: 6, wage: 17, hair: "#d96fa8", shirt: "#aef0d0", blurb: "Hums while she shakes the tea." },
];

// --- Badges --------------------------------------------------
const BADGES = [
  { id: "firstpour", ico: "🧋", name: "First Pour",    desc: "Sell your very first cup" },
  { id: "sweet100",  ico: "💰", name: "Sweet $100",    desc: "Earn $100+ in one day" },
  { id: "pearlperf", ico: "✨", name: "Pearl Perfect", desc: "Cook a batch at 95+ quality" },
  { id: "legend",    ico: "⭐", name: "Local Legend",  desc: "Reach a 4.5 star reputation" },
  { id: "boss",      ico: "🤝", name: "Boba Boss",     desc: "Hire your first crew member" },
  { id: "tycoon",    ico: "🏪", name: "Boba Tycoon",   desc: "Own a second stand" },
  { id: "viral",     ico: "📱", name: "Gone Viral",    desc: "Have a weird flavour go viral" },
  { id: "explorer",  ico: "🗺️", name: "Explorer",      desc: "Sell at every spot in town" },
  { id: "weekone",   ico: "📅", name: "Week One",      desc: "Run the stand for 7 days" },
  { id: "moneybags", ico: "👑", name: "Moneybags",     desc: "Save up $1000" },
];

// --- Flavour lines customers shout --------------------------
const LINES = {
  buy: ["One {f}, please!", "Ooh, {f}! Yes!!", "{f}? Dream come true!", "I walked here JUST for {f}!", "Extra pearls in my {f}!"],
  pricey: ["Hmm… too pricey for me.", "My allowance says no…", "I only have pocket lint."],
  taste: ["Not feeling those flavours…", "Hmm, nothing for me today.", "Do you have plain water?"],
  soldout: ["Aww, sold out?!", "Nooo I came all this way!", "Out already?! Tragic."],
  line: ["This line is HUGE.", "No time to wait, sorry!", "I'll come back later!"],
};

// --- Professor Oolong tips ----------------------------------
const TIPS = {
  shop: "Every cup needs a PEARL, a CUP, and TEA. Milky flavours need MILK, and fancy flavours need their SYRUP. Stock up, but don't overbuy!",
  cook: "Pearls must be cooked fresh every morning — leftover pearls go hard overnight! Stop the marker in the green star zone. Three perfect stops = legendary boba.",
  menu: "Unique flavours earn buzz, but SUPER weird ones scare most folks away… most days. Match flavours to the crowd — camp kids love weird stuff!",
  map:  "Pop up in the same spot every day and folks get bored. Vanish for too long and they forget you! Rotate between a few favourite spots.",
  sell: "Here they come! Charmful crew = more sales. If the line gets too long, customers give up — hire help to serve faster.",
  report: "Profit = sales minus wages. Check tomorrow's forecast and news before you plan. Rainy days are rough — heatwaves are GOLD.",
};

// ============================================================
// Pixel sprite grids (box-shadow pixel art)
// ============================================================

// Boba cup: O outline, F fill (replaced per flavour), P pearl,
// S straw, H highlight, L lid
const CUP_GRID = [
  "....SS....",
  "....SS....",
  "...OSSO...",
  "..OLLLLO..",
  ".OLLLLLLO.",
  ".OFFHFFFO.",
  ".OFFHFFFO.",
  ".OFFFFFFO.",
  ".OFFFFFFO.",
  ".OPFPFPFO.",
  ".OFPFPFPO.",
  "..OPPPPO..",
  "...OOOO...",
];
const CUP_COLORS = { O: "#4a3528", F: "#d9a36b", P: "#3b2417", S: "#ff8fb1", H: "#fff6e9", L: "#fffdf5" };

// Professor Oolong: a wise old boba cup with specs + moustache
const PROF_GRID = [
  ".....SS.....",
  ".....SS.....",
  "....OSSO....",
  "...OLLLLO...",
  "..OLLLLLLO..",
  ".OFFFFFFFFO.",
  ".OGGFFFGGFO.",
  ".OGWGFFGWGO.",
  ".OGGFFFGGFO.",
  ".OFFMMMMFFO.",
  ".OFMFFFFMFO.",
  ".OFFFFFFFFO.",
  ".OPFPFFPFPO.",
  ".OFPFPPFPFO.",
  "..OPPPPPPO..",
  "...OOOOOO...",
];
const PROF_COLORS = { O: "#4a3528", F: "#d9a36b", P: "#3b2417", S: "#b89ae0", L: "#fffdf5", G: "#3b2c26", W: "#fff6e9", M: "#fffdf5" };

// Little customer / kid sprite. H hair, S skin, E eye, T shirt, L legs, F feet
const KID_GRID = [
  "..HHHH..",
  ".HHHHHH.",
  ".HSSSSH.",
  ".HSESEH.",
  "..SSSS..",
  ".TTTTTT.",
  "TTTTTTTT",
  "T.TTTT.T",
  "..TTTT..",
  "..L..L..",
  "..L..L..",
  ".FF..FF.",
];
const SKIN_TONES = ["#ffd9b3", "#f0b98c", "#c98e5a", "#9c6b3f", "#7a4f2a"];
const HAIR_TONES = ["#3b2c26", "#f5d442", "#e8743c", "#8a5a2c", "#d96fa8", "#5a3a8a", "#607d8b", "#b03030"];
const SHIRT_TONES = ["#ff8fb1", "#4db890", "#6ba7e8", "#ffd93d", "#b9d77a", "#c5a3e8", "#ff9e6b", "#aef0d0"];

// The stand! drawn as inline SVG (s = scale factor)
function standSVG(s = 1.6, label = "BOBA") {
  const w = 130 * s, h = 110 * s;
  return `<svg width="${w}" height="${h}" viewBox="0 0 130 110" style="image-rendering:pixelated">
    <!-- legs -->
    <rect x="14" y="62" width="8" height="44" fill="#8a5a2c" stroke="#4a3528" stroke-width="3"/>
    <rect x="108" y="62" width="8" height="44" fill="#8a5a2c" stroke="#4a3528" stroke-width="3"/>
    <!-- counter -->
    <rect x="6" y="58" width="118" height="26" fill="#c68b59" stroke="#4a3528" stroke-width="4" rx="3"/>
    <rect x="6" y="58" width="118" height="9" fill="#a96a32"/>
    <!-- awning poles -->
    <rect x="10" y="14" width="5" height="48" fill="#4a3528"/>
    <rect x="115" y="14" width="5" height="48" fill="#4a3528"/>
    <!-- awning -->
    <g stroke="#4a3528" stroke-width="3">
      <rect x="2"  y="6" width="126" height="16" fill="#ff8fb1" rx="3"/>
    </g>
    <g>
      <rect x="2"  y="6" width="18" height="16" fill="#fff6e9"/>
      <rect x="38" y="6" width="18" height="16" fill="#fff6e9"/>
      <rect x="74" y="6" width="18" height="16" fill="#fff6e9"/>
      <rect x="110" y="6" width="18" height="16" fill="#fff6e9"/>
      <rect x="2" y="6" width="126" height="16" fill="none" stroke="#4a3528" stroke-width="3" rx="3"/>
    </g>
    <g stroke="#4a3528" stroke-width="2">
      <path d="M4 22 l8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 7-8" fill="#ff8fb1"/>
    </g>
    <!-- sign -->
    <rect x="38" y="32" width="54" height="20" fill="#fffdf5" stroke="#4a3528" stroke-width="3" rx="4"/>
    <text x="65" y="47" text-anchor="middle" font-family="'Pixelify Sans',cursive" font-weight="700" font-size="13" fill="#e0608c">${label}</text>
    <!-- cups on counter -->
    <rect x="22" y="46" width="9" height="12" fill="#c5a3e8" stroke="#4a3528" stroke-width="2"/>
    <rect x="98" y="46" width="9" height="12" fill="#ffc63f" stroke="#4a3528" stroke-width="2"/>
  </svg>`;
}
