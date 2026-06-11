/* ============================================================
   BOBA STAND! — game engine
   ============================================================ */
"use strict";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt$ = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const DAY_NAMES = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const dayName = (d) => DAY_NAMES[(d - 1) % 7];
const isWeekend = (d) => ((d - 1) % 7) < 2;

function weightedPick(pairs) { // [[item, weight], ...]
  let total = pairs.reduce((s, p) => s + p[1], 0);
  let r = Math.random() * total;
  for (const [item, w] of pairs) { r -= w; if (r <= 0) return item; }
  return pairs[pairs.length - 1][0];
}

// Box-shadow pixel art renderer
function pixSprite(grid, colors, scale = 4, extraStyle = "") {
  const w = grid[0].length * scale, h = grid.length * scale;
  const shadows = [];
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = colors[ch];
      if (c) shadows.push(`${x * scale}px ${y * scale}px 0 0 ${c}`);
    });
  });
  return `<div class="pixwrap" style="width:${w}px;height:${h}px;${extraStyle}">
    <div class="pix" style="width:${scale}px;height:${scale}px;box-shadow:${shadows.join(",")}"></div></div>`;
}
const cupSprite = (fill, scale = 4) => pixSprite(CUP_GRID, { ...CUP_COLORS, F: fill }, scale);
function kidSprite(scale = 4, fixed = {}) {
  const colors = {
    H: fixed.hair || pick(HAIR_TONES),
    S: fixed.skin || pick(SKIN_TONES),
    T: fixed.shirt || pick(SHIRT_TONES),
    E: "#3b2c26", L: "#4a6c9b", F: "#3b2c26",
  };
  return pixSprite(KID_GRID, colors, scale);
}

// ------------------------------------------------------------
// Sound (tiny chiptune bleeps via WebAudio)
// ------------------------------------------------------------
const Snd = {
  ctx: null, muted: localStorage.getItem("boba-muted") === "1",
  ac() {
    if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    return this.ctx;
  },
  tone(freq, dur = .08, type = "square", vol = .04, when = 0) {
    if (this.muted) return;
    const ctx = this.ac(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + when + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + .02);
  },
  blip() { this.tone(660, .06); },
  cha() { this.tone(880, .07); this.tone(1320, .12, "square", .04, .07); },
  bad() { this.tone(180, .18, "sawtooth", .03); },
  pop() { this.tone(520, .05, "triangle", .06); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .12, "square", .04, i * .09)); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, .14, "square", .045, i * .11)); },
};

// ------------------------------------------------------------
// Game state
// ------------------------------------------------------------
const SAVE_KEY = "boba-stand-save-v1";
let S = null;          // game state
let results = null;    // today's sim results (transient)

function freshState(name) {
  const locs = {};
  Object.keys(LOCATIONS).forEach(id => locs[id] = { fam: 0, consec: 0, visited: false });
  return {
    name, day: 1, money: 60, rep: 2.5,
    // starch is in packs (1 pack -> 10 pearls); everything else is in servings
    inv: { starch: 2, tea: 10, milk: 10, sugar: 10, cups: 20, syrups: { strawberry: 10 } },
    pearls: 0, quality: 0, cooked: false,
    menu: ["classic", "strawberry"], price: 5,
    locs, loc1: null, loc2: null, stand2staff: null,
    weather: "sunny", forecast: "sunny",
    event: null, eventTomorrow: null,
    trend: pick(["classic", "fruity", "dessert"]),
    hired: [], stands: 1,
    badges: [], tips: {},
    stats: { sold: 0, revenue: 0, bestDay: 0, viral: 0 },
  };
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
function load() { try { S = JSON.parse(localStorage.getItem(SAVE_KEY)); return !!S; } catch (e) { return false; } }

// ------------------------------------------------------------
// Derived values
// ------------------------------------------------------------
function rollWeather() { return weightedPick(WEATHER_ODDS.map(([w, p]) => [w, p])); }
function resolveWeather(forecast) {
  if (Math.random() < .8) return forecast;
  return rollWeather();
}
// syrups are stored straight as servings (each bottle pours 10)
function syrupServings(fid) { return S.inv.syrups[fid] || 0; }
function useSyrup(fid) {
  if (syrupServings(fid) < 1) return false;
  S.inv.syrups[fid]--;
  return true;
}

function canServe(fid) {
  const f = FLAVORS[fid];
  if (S.pearls < 1 || S.inv.cups < 1 || S.inv.tea < 1) return false;
  if (f.milk && S.inv.milk < 1) return false;
  if (f.syrup !== null && syrupServings(fid) < 1) return false;
  if (f.syrup === null && S.inv.sugar < 1 + (f.extraSugar || 0)) return false;
  return true;
}
function consume(fid) {
  const f = FLAVORS[fid];
  S.pearls--; S.inv.cups--; S.inv.tea--;
  if (f.milk) S.inv.milk--;
  if (f.syrup !== null) useSyrup(fid);
  else S.inv.sugar -= 1 + (f.extraSugar || 0);
}

// Flavour appeal: bell curve over uniqueness, peak ≈ 6
function flavorAppeal(fid, locId, viralFid) {
  const f = FLAVORS[fid];
  let a = 0.7 + 0.5 * Math.exp(-((f.uniq - 6) ** 2) / 8) + (10 - f.uniq) * 0.02;
  if (S.trend === f.tag) a *= 1.3;
  if (locId && LOCATIONS[locId].prefs.includes(f.tag)) a *= 1.25;
  if (viralFid === fid) a *= 3;
  return a;
}
function priceFactor(price) {
  const fair = 5.5;
  return price <= fair
    ? Math.min(1.12, 1 + (fair - price) * .05)
    : Math.max(.3, 1 - (price - fair) * .16);
}
function staleMult(consec) {
  return [1, 1, .92, .78, .62][Math.min(consec, 4)] ?? .5;
}
function locTrafficToday(locId) {
  const L = LOCATIONS[locId];
  const base = L.traffic[isWeekend(S.day) ? 1 : 0];
  const ls = S.locs[locId];
  const famMult = .7 + .5 * ls.fam;
  const evMult = (S.event && S.event.loc === locId) ? S.event.mult : 1;
  return base * WEATHER[S.weather].mult * famMult * staleMult(ls.consec + 1) * evMult;
}
function trafficHint(locId) {
  const t = locTrafficToday(locId);
  if (t >= 28) return ["🔥 Buzzing", "#e0608c"];
  if (t >= 18) return ["😀 Busy", "#4db890"];
  if (t >= 10) return ["🙂 Steady", "#c68b59"];
  return ["😴 Quiet", "#8a8a8a"];
}

// ------------------------------------------------------------
// UI plumbing
// ------------------------------------------------------------
function setScreen(html) { $("#screen").innerHTML = html; $("#screen").scrollTop = 0; }
function refreshHUD() {
  if (!S) return;
  $("#hud").classList.remove("hidden");
  $("#hud-day").textContent = `Day ${S.day} · ${dayName(S.day)}`;
  $("#hud-weather").textContent = `${WEATHER[S.weather].ico} ${WEATHER[S.weather].name}`;
  $("#hud-money").textContent = fmt$(S.money);
  $("#hud-rep").innerHTML = starsHTML(S.rep);
  $("#mute-btn").classList.toggle("off", Snd.muted);
}
function starsHTML(rep) {
  let out = "";
  for (let i = 1; i <= 5; i++) out += rep >= i - .25 ? "★" : (rep >= i - .75 ? "✬" : "☆");
  return `<span class="stars" style="font-size:16px">${out}</span> <span style="font-size:13px">${rep.toFixed(1)}</span>`;
}
function profSay(text, tipKey) {
  if (tipKey) {
    if (S.tips[tipKey]) return;
    S.tips[tipKey] = true;
  }
  $("#dialog-sprite").innerHTML = pixSprite(PROF_GRID, PROF_COLORS, 5);
  $("#dialog-text").textContent = text;
  $("#dialog").classList.remove("hidden");
  Snd.pop();
}
function modal(html) { $("#modal-card").innerHTML = html; $("#modal").classList.remove("hidden"); }

// ------------------------------------------------------------
// The global game object (inline onclick handlers live here)
// ------------------------------------------------------------
const G = {

  closeDialog() { $("#dialog").classList.add("hidden"); Snd.blip(); },
  closeModal() { $("#modal").classList.add("hidden"); Snd.blip(); },
  toggleMute() { Snd.muted = !Snd.muted; localStorage.setItem("boba-muted", Snd.muted ? "1" : "0"); refreshHUD(); Snd.blip(); },

  // ---------- title / intro ----------
  title() {
    $("#hud").classList.add("hidden");
    $("#dialog").classList.add("hidden");
    let clouds = "";
    for (let i = 0; i < 4; i++)
      clouds += `<div class="title-cloud" style="top:${30 + i * 52}px;width:${ri(60, 130)}px;animation-duration:${ri(26, 48)}s;animation-delay:-${ri(0, 30)}s"></div>`;
    setScreen(`<div class="title-screen">
      ${clouds}
      <div class="title-cup">${cupSprite("#d9a36b", 7)}</div>
      <div class="title-logo">BOBA<br>STAND!<span class="small">~ a bubble tea adventure ~</span></div>
      <div class="title-btns">
        <button class="btn btn-big btn-pink" onclick="G.newGame()">New Game</button>
        ${hasSave() ? `<button class="btn btn-big btn-mint" onclick="G.continueGame()">Continue</button>` : ""}
      </div>
      <div class="title-foot press-blink px">★ made with love for the best boba chef in Brackendale ★</div>
    </div>`);
  },

  newGame() {
    Snd.jingle();
    setScreen(`<div class="intro-screen">
      ${pixSprite(PROF_GRID, PROF_COLORS, 6)}
      <div class="panel" style="max-width:520px">
        <p style="font-size:21px;line-height:1.3">Ah, hello hello! I am <b class="px">PROFESSOR OOLONG</b>,
        Brackendale's foremost bubble-tea scholar.<br><br>
        This town is <i>thirsty</i>, young one — and YOU are going to fix that
        with the finest boba stand the neighbourhood has ever seen!<br><br>
        Now then… what is your name, chef?</p>
      </div>
      <input id="nameInput" maxlength="14" placeholder="Your name" onkeydown="if(event.key==='Enter')G.startGame()">
      <button class="btn btn-pink" onclick="G.startGame()">Let's go!</button>
    </div>`);
    setTimeout(() => $("#nameInput")?.focus(), 50);
  },

  startGame() {
    const name = ($("#nameInput").value || "Chef").trim() || "Chef";
    S = freshState(name);
    S.weather = rollWeather();        // today
    S.forecast = rollWeather();       // tomorrow (shown in the evening news)
    save();
    Snd.fanfare();
    this.morning();
    profSay(`Welcome to business, Chef ${S.name}! Here's $60 of seed money, two packs of pearls, and one bottle of strawberry syrup. First: stock up at the shop. ${TIPS.shop}`);
  },

  continueGame() {
    if (!load()) return this.title();
    Snd.jingle();
    this.morning();
  },

  // ---------- morning hub (shop / crew / HQ) ----------
  morning(tab = "shop") {
    refreshHUD();
    // gentle rescue if too broke to make a single cup
    const stuck = (S.pearls === 0 && S.inv.starch === 0) || S.inv.cups === 0 || S.inv.tea === 0 || S.inv.sugar < 2;
    if (S.money < 15 && stuck) {
      S.money += 30;
      profSay("Oh dear, the till is nearly empty! Luckily your grandma slipped you $30 and a wink. 'Every great chef has a rough day,' she says. Spend it wisely!");
      save();
    }
    const tabs = [["shop", "🛒 Shop"], ["crew", "🧢 Crew"], ["hq", "🏪 HQ"]];
    setScreen(`
      <h2 class="screen-title">☀️ Morning Prep <span class="sub">${dayName(S.day)}, Day ${S.day} — get ready before the crowds wake up</span></h2>
      ${this.newsBarHTML()}
      ${this.invBarHTML()}
      <div class="tabs" style="margin-top:10px">
        ${tabs.map(([id, lb]) => `<div class="tab ${tab === id ? "active" : ""}" onclick="G.morning('${id}')">${lb}</div>`).join("")}
      </div>
      <div class="tab-body">${tab === "shop" ? this.shopHTML() : tab === "crew" ? this.crewHTML() : this.hqHTML()}</div>
      <div class="footer-actions">
        <button class="btn btn-big btn-pink" onclick="G.toKitchen()">To the Kitchen! 🍳 ▸</button>
      </div>`);
  },

  newsBarHTML() {
    const bits = [];
    if (S.event) bits.push(`<span class="event-flash">${S.event.ico} TODAY: ${esc(S.event.name)} at ${esc(LOCATIONS[S.event.loc].name)}!</span>`);
    bits.push(`<span class="inv-pill">📢 Trend: <b>${TAG_NAMES[S.trend]}</b> flavours are in!</span>`);
    return `<div class="inv-bar">${bits.join("")}</div>`;
  },

  invBarHTML() {
    const i = S.inv;
    const pills = [
      ["🥡", "pearl packs", i.starch], ["🍃", "tea", i.tea], ["🥛", "milk", i.milk],
      ["🟤", "sugar", i.sugar], ["🥤", "cups", i.cups],
    ].map(([ico, nm, n]) => `<span class="inv-pill ${n <= (nm === "pearl packs" ? 0 : 5) ? "low" : ""}">${ico} <b>${n}</b> ${nm}</span>`).join("");
    const syr = Object.keys(S.inv.syrups).filter(f => syrupServings(f) > 0)
      .map(f => `<span class="inv-pill">🧴 <b>${syrupServings(f)}</b> ${esc(FLAVORS[f].name.split(" ")[0])}</span>`).join("");
    return `<div class="inv-bar">${pills}${syr}</div>`;
  },

  shopHTML() {
    const staples = Object.entries(STAPLES).map(([id, it]) => `
      <div class="shop-item">
        <div class="ico">${it.ico}</div>
        <div class="info"><div class="nm">${it.name} — ${fmt$(it.cost)}</div><div class="ds">${it.desc}</div></div>
        <div class="stock">x${S.inv[id]}</div>
        <button class="btn btn-small" ${S.money < it.cost ? "disabled" : ""} onclick="G.buy('${id}')">Buy</button>
      </div>`).join("");
    const syrups = Object.entries(FLAVORS).filter(([, f]) => f.syrup !== null).map(([fid, f]) => {
      const owned = fid in S.inv.syrups;
      return `<div class="shop-item flavor-locked">
        <div class="ico">${cupSprite(f.fill, 2)}</div>
        <div class="info">
          <div class="nm">${f.name} Syrup — ${fmt$(f.syrup)}</div>
          <div class="ds">${f.desc} <span class="uniq-dots" title="uniqueness">${"●".repeat(f.uniq)}${"○".repeat(10 - f.uniq)}</span></div>
        </div>
        <div class="stock">${syrupServings(fid)} left</div>
        <button class="btn btn-small ${owned ? "" : "btn-mint"}" ${S.money < f.syrup ? "disabled" : ""} onclick="G.buySyrup('${fid}')">${owned ? "Buy" : "Unlock"}</button>
      </div>`;
    }).join("");
    return `<div class="hint" style="margin-bottom:8px">Staples come in packs of 10 servings. Syrup bottles pour 10 cups and <b>unlock that flavour</b> forever. Uniqueness dots: more ● = more unusual.</div>
      <div class="shop-grid">${staples}</div>
      <h3 class="px" style="margin:14px 0 8px">🧴 Flavour Syrups</h3>
      <div class="shop-grid">${syrups}</div>`;
  },

  buy(id) {
    const it = STAPLES[id];
    if (S.money < it.cost) return Snd.bad();
    S.money -= it.cost; S.inv[id] += (id === "starch" ? 1 : 10);
    Snd.cha(); save(); this.morning("shop");
  },
  buySyrup(fid) {
    const f = FLAVORS[fid];
    if (S.money < f.syrup) return Snd.bad();
    const firstTime = !(fid in S.inv.syrups);
    S.money -= f.syrup;
    S.inv.syrups[fid] = (S.inv.syrups[fid] || 0) + 10;
    Snd.cha(); save(); this.morning("shop");
    if (firstTime && f.uniq >= 9) profSay(`${f.name}?! Bold. VERY bold. Most folks will run away screaming… but if it catches on, you'll be famous. High risk, high bubble!`);
  },

  crewHTML() {
    const cards = STAFF_POOL.map((k, i) => {
      const hired = S.hired.includes(k.id);
      return `<div class="crew-card ${hired ? "hired" : ""}">
        ${kidSprite(4, { hair: k.hair, shirt: k.shirt })}
        <div class="stats">
          <div class="nm">${k.name} ${hired ? "✅" : ""} <span style="font-family:var(--font-tt);font-weight:400;font-size:16px;color:var(--tea)">· ${esc(k.blurb)}</span></div>
          <div class="statbar">😊 charm <span class="bar"><i style="width:${k.charm * 10}%"></i></span>
             🧋 skill <span class="bar"><i class="sk" style="width:${k.skill * 10}%"></i></span>
             · ${fmt$(k.wage)}/day</div>
        </div>
        ${hired
          ? `<button class="btn btn-small btn-plain" onclick="G.fire('${k.id}')">Send home</button>`
          : `<button class="btn btn-small btn-mint" ${S.money < k.wage ? "disabled" : ""} onclick="G.hire('${k.id}')">Hire</button>`}
      </div>`;
    }).join("");
    return `<div class="hint" style="margin-bottom:8px">Crew get paid <b>each evening</b>. At your stand they add charm (more sales) and serving speed (longer lines OK). With a 2nd stand, one of them can run it solo!</div>${cards}`;
  },

  hire(id) {
    if (S.hired.includes(id)) return;
    S.hired.push(id); Snd.jingle(); save();
    this.morning("crew");
    const k = STAFF_POOL.find(s => s.id === id);
    profSay(`${k.name} joins the team! Remember — wages of ${fmt$(k.wage)} come out of the till every evening, rain or shine.`);
  },
  fire(id) {
    S.hired = S.hired.filter(h => h !== id);
    if (S.stand2staff === id) S.stand2staff = null;
    Snd.blip(); save(); this.morning("crew");
  },

  hqHTML() {
    const stand2 = S.stands >= 2
      ? `<div class="notice">🏪 You own <b>2 stands</b>! Assign a crew member to run Stand 2 on the map screen.</div>`
      : `<div class="shop-item">
          <div class="ico">🏪</div>
          <div class="info"><div class="nm">Second Stand — ${fmt$(250)}</div>
          <div class="ds">Cover two spots at once! Needs a hired kid to run it.</div></div>
          <button class="btn btn-small btn-mint" ${S.money < 250 ? "disabled" : ""} onclick="G.buyStand()">Buy</button>
        </div>`;
    const st = S.stats;
    return `${stand2}
      <h3 class="px" style="margin:14px 0 6px">📈 Lifetime stats</h3>
      <div class="panel">
        <div class="report-row"><span>Cups sold</span><b>${st.sold}</b></div>
        <div class="report-row"><span>Total earnings</span><b>${fmt$(st.revenue)}</b></div>
        <div class="report-row"><span>Best single day</span><b>${fmt$(st.bestDay)}</b></div>
        <div class="report-row"><span>Viral moments</span><b>${st.viral}</b></div>
        <div class="report-row"><span>Badges</span><b>${S.badges.length} / ${BADGES.length}</b></div>
      </div>
      <div style="margin-top:12px"><button class="btn btn-small btn-plain" onclick="G.confirmReset()">Start over (erase save)</button></div>`;
  },

  buyStand() {
    if (S.money < 250 || S.stands >= 2) return Snd.bad();
    S.money -= 250; S.stands = 2;
    Snd.fanfare(); save(); this.morning("hq");
    profSay("A BOBA EMPIRE RISES! Your second stand is ready. Pick a crew member to run it when you choose locations — their skill sets its boba quality, so choose wisely!");
  },

  confirmReset() {
    modal(`<h3 class="px">Erase save?</h3>
      <p style="margin:10px 0">All progress, badges and money will be lost. Really start over?</p>
      <div class="spread"><button class="btn btn-small btn-plain" onclick="G.closeModal()">Keep playing</button>
      <button class="btn btn-small" style="background:var(--danger)" onclick="G.doReset()">Erase it</button></div>`);
  },
  doReset() { localStorage.removeItem(SAVE_KEY); this.closeModal(); this.title(); },

  // ---------- kitchen: cook the pearls ----------
  cookPlan: 1,
  toKitchen() {
    Snd.blip(); refreshHUD();
    this.cookPlan = clamp(this.cookPlan, 1, Math.max(1, S.inv.starch));
    const maxPacks = S.inv.starch;
    const sugarNeed = this.cookPlan * 2;
    setScreen(`
      <h2 class="screen-title">🍳 The Kitchen <span class="sub">cook today's pearls — fresh batches only, chef!</span></h2>
      ${this.invBarHTML()}
      <div class="cook-screen" style="justify-content:center">
        <div class="bubble-pot"><span class="steam">♨︎</span>🍲<span class="steam" style="animation-delay:.5s">♨︎</span></div>
        ${S.cooked ? `
          <div class="panel center"><b class="px">Today's batch:</b> ${S.pearls} pearls at <b>${S.quality}%</b> quality ${S.quality >= 90 ? "✨" : ""}</div>
          <button class="btn btn-big btn-pink" onclick="G.toMenu()">Build the Menu ▸</button>
        ` : maxPacks === 0 ? `
          <div class="notice">No tapioca starch! ${S.pearls > 0 ? "" : "Without pearls you can't sell a single cup…"} Go back and buy some if you have the money.</div>
          <div class="spread" style="gap:14px">
            <button class="btn btn-plain" onclick="G.morning()">◂ Back to Shop</button>
            <button class="btn" onclick="G.toMenu()">Continue anyway ▸</button>
          </div>
        ` : `
          <div class="panel center" style="min-width:340px">
            <div class="px" style="font-size:16px;margin-bottom:6px">How many packs to cook?</div>
            <div class="spread" style="justify-content:center;gap:18px">
              <button class="btn btn-small btn-plain" onclick="G.adjPacks(-1)">−</button>
              <span class="px" style="font-size:26px">${this.cookPlan}</span>
              <button class="btn btn-small btn-plain" onclick="G.adjPacks(1)">+</button>
            </div>
            <div class="hint" style="margin-top:6px">= ${this.cookPlan * 10} pearls · uses ${sugarNeed} sugar for the syrup soak
            ${S.inv.sugar < sugarNeed ? `<br><b style="color:var(--danger)">Not enough sugar!</b>` : ""}</div>
          </div>
          <button class="btn btn-big btn-mint" ${S.inv.sugar < sugarNeed ? "disabled" : ""} onclick="G.beginCook()">Start Cooking! 🔥</button>
          <button class="btn btn-small btn-plain" onclick="G.morning()">◂ back to shop</button>
        `}
      </div>`);
    profSay(TIPS.cook, "cook");
  },
  adjPacks(d) { this.cookPlan = clamp(this.cookPlan + d, 1, Math.max(1, S.inv.starch)); Snd.blip(); this.toKitchen(); },

  // --- the timing minigame ---
  cook: null,
  beginCook() {
    const packs = this.cookPlan;
    // consume ingredients up front
    S.inv.starch -= packs;
    S.inv.sugar -= packs * 2;
    this.cook = {
      packs, stage: 0, scores: [], t: rnd(0, 6), dir: 1,
      speeds: [1.7, 2.3, 3.0],
      labels: ["BOIL the water! 🔥", "SIMMER the pearls! 🫧", "SOAK in brown-sugar syrup! 🍯"],
      sweet: [], running: true, raf: null, last: null,
    };
    for (let i = 0; i < 3; i++) this.cook.sweet.push(rnd(.3, .62));
    Snd.jingle();
    this.renderCookStage();
  },

  renderCookStage() {
    const c = this.cook;
    const sweetW = .17;
    const sw = c.sweet[c.stage];
    setScreen(`
      <h2 class="screen-title">🍳 Cooking — Step ${c.stage + 1} of 3</h2>
      <div class="cook-screen">
        <div class="cook-stage-label">${c.labels[c.stage]}</div>
        <div class="cook-scores">
          ${[0, 1, 2].map(i => `<span class="${i < c.scores.length ? "done" : ""}">${["Boil", "Simmer", "Soak"][i]}: ${i < c.scores.length ? c.scores[i] + "%" : "—"}</span>`).join("")}
        </div>
        <div class="pot-zone">
          <div class="bubble-pot">🍲</div>
          <div class="cook-bar-wrap" id="cookbar">
            <div class="cook-sweet" style="left:${sw * 100}%;width:${sweetW * 100}%"></div>
            <div class="cook-marker" id="cookmarker" style="left:0"></div>
          </div>
        </div>
        <button class="btn btn-big btn-pink" id="stopbtn" onclick="G.stopCook()">STOP! ✋</button>
        <div class="hint">Stop the marker inside the green star zone!</div>
      </div>`);
    c.last = performance.now();
    const tick = (now) => {
      if (!c.running) return;
      const dt = (now - c.last) / 1000; c.last = now;
      c.t += dt * c.speeds[c.stage];
      const pos = (Math.sin(c.t) + 1) / 2;
      const bar = $("#cookbar"), mk = $("#cookmarker");
      if (bar && mk) mk.style.left = `calc(${(pos * 100).toFixed(2)}% - ${(pos * 10).toFixed(1)}px)`;
      c.raf = requestAnimationFrame(tick);
    };
    c.raf = requestAnimationFrame(tick);
  },

  stopCook() {
    const c = this.cook;
    if (!c || !c.running) return;
    c.running = false; cancelAnimationFrame(c.raf);
    const pos = (Math.sin(c.t) + 1) / 2;
    const sweetW = .17, sw = c.sweet[c.stage];
    const center = sw + sweetW / 2;
    const dist = Math.abs(pos - center);
    let score;
    if (dist <= sweetW / 2) { score = Math.round(100 - (dist / (sweetW / 2)) * 10); Snd.cha(); }
    else { score = Math.round(Math.max(20, 86 - (dist - sweetW / 2) * 320)); Snd.bad(); }
    c.scores.push(score);
    const mk = $("#cookmarker"); if (mk) mk.style.background = score >= 86 ? "var(--mint-dk)" : "var(--danger)";
    const btn = $("#stopbtn"); if (btn) { btn.disabled = true; btn.textContent = score >= 90 ? "PERFECT! ✨" : score >= 70 ? "Nice! 👍" : "Oops… 💦"; }
    setTimeout(() => {
      c.stage++;
      if (c.stage < 3) { c.running = true; this.renderCookStage(); }
      else this.finishCook();
    }, 800);
  },

  finishCook() {
    const c = this.cook;
    const q = Math.round(c.scores.reduce((a, b) => a + b, 0) / 3);
    S.pearls += c.packs * 10;
    S.quality = q; S.cooked = true;
    this.cook = null;
    if (q >= 95 && !S.badges.includes("pearlperf")) {
      S.badges.push("pearlperf");
      setTimeout(() => profSay("LEGENDARY PEARLS! 95%+ quality — you've earned the Pearl Perfect badge. Old Oolong sheds a single tear of joy. 🥹"), 400);
    }
    save();
    const grade = q >= 95 ? "LEGENDARY ✨" : q >= 85 ? "Excellent!" : q >= 70 ? "Pretty good!" : q >= 50 ? "A bit chewy…" : "Uh oh. Gummy pearls.";
    Snd.fanfare();
    setScreen(`
      <h2 class="screen-title">🍳 Batch complete!</h2>
      <div class="cook-screen" style="justify-content:center">
        ${cupSprite("#a96a32", 6)}
        <div class="quality-flash">${q}% — ${grade}</div>
        <div class="panel center">${c ? "" : ""}You cooked <b>${S.pearls}</b> fresh pearls. Quality affects how much customers love every single cup today.</div>
        <button class="btn btn-big btn-pink" onclick="G.toMenu()">Build the Menu ▸</button>
      </div>`);
  },

  // ---------- menu builder ----------
  toMenu() {
    Snd.blip(); refreshHUD();
    const owned = Object.keys(FLAVORS).filter(fid => {
      const f = FLAVORS[fid];
      return f.syrup === null || syrupServings(fid) > 0;
    });
    S.menu = S.menu.filter(f => owned.includes(f));
    const cards = owned.map(fid => {
      const f = FLAVORS[fid];
      const on = S.menu.includes(fid);
      const trendMark = S.trend === f.tag ? " 📢" : "";
      return `<div class="flavor-card ${on ? "on" : ""}" onclick="G.toggleFlavor('${fid}')">
        <div class="check">✓</div>
        ${cupSprite(f.fill, 3)}
        <div class="nm">${f.name}${trendMark}</div>
        <div class="meta"><span class="uniq-dots">${"●".repeat(f.uniq)}${"○".repeat(10 - f.uniq)}</span></div>
        <div class="meta">${f.milk ? "🥛" : "🍵"} ${f.syrup !== null ? `· ${syrupServings(fid)} pours left` : "· staple"}</div>
      </div>`;
    }).join("");
    setScreen(`
      <h2 class="screen-title">📋 Today's Menu <span class="sub">pick up to 3 flavours & set your price</span></h2>
      <div class="columns" style="flex:1;min-height:0;overflow-y:auto">
        <div class="col" style="flex:2">
          <div class="panel"><div class="flavor-grid">${cards}</div></div>
        </div>
        <div class="col">
          <div class="panel">
            <div class="px" style="font-weight:700;margin-bottom:6px">💲 Price per cup</div>
            <div class="price-row">
              <input type="range" min="3" max="9" step="0.5" value="${S.price}" oninput="G.setPrice(this.value)">
              <div class="price-tag" id="pricetag">${fmt$(S.price)}</div>
            </div>
            <div class="hint" id="pricehint">${this.priceHint()}</div>
          </div>
          <div class="panel">
            <div class="px" style="font-weight:700;margin-bottom:4px">🧪 Menu check</div>
            <div id="menucheck">${this.menuCheckHTML()}</div>
          </div>
          ${S.pearls === 0 ? `<div class="notice">⚠️ No pearls cooked! You can't sell anything. <button class="btn btn-small" onclick="G.toKitchen()">back to kitchen</button></div>` : ""}
        </div>
      </div>
      <div class="footer-actions">
        <button class="btn btn-plain" onclick="G.toKitchen()">◂ Kitchen</button>
        <button class="btn btn-big btn-pink" ${S.menu.length === 0 ? "disabled" : ""} onclick="G.toMap()">Choose a Spot 🗺️ ▸</button>
      </div>`);
    profSay(TIPS.menu, "menu");
  },

  toggleFlavor(fid) {
    if (S.menu.includes(fid)) S.menu = S.menu.filter(f => f !== fid);
    else if (S.menu.length < 3) S.menu.push(fid);
    else return Snd.bad();
    Snd.blip(); save(); this.toMenu();
  },
  setPrice(v) {
    S.price = parseFloat(v);
    $("#pricetag").textContent = fmt$(S.price);
    $("#pricehint").innerHTML = this.priceHint();
  },
  priceHint() {
    if (S.price <= 4) return "Bargain! Everyone can afford it, but margins are thin.";
    if (S.price <= 6) return "Fair neighbourhood price. Solid choice.";
    if (S.price <= 7.5) return "Premium! Fine if your boba (and reputation) is great.";
    return "Whoa, fancy-city prices. Expect lots of walk-aways!";
  },
  menuCheckHTML() {
    if (S.menu.length === 0) return `<span class="hint">Pick at least one flavour!</span>`;
    return S.menu.map(fid => {
      const f = FLAVORS[fid];
      const u = f.uniq;
      const vibe = u <= 2 ? "safe & known" : u <= 5 ? "fun twist" : u <= 7 ? "buzz-worthy!" : "WILD CARD 🎲";
      const trend = S.trend === f.tag ? ` <b style="color:var(--pink-dk)">on trend!</b>` : "";
      return `<div style="font-size:17px;padding:2px 0">🧋 <b>${f.name}</b> — ${vibe}${trend}</div>`;
    }).join("");
  },

  // ---------- map / location ----------
  mapSel: null, mapSel2: null,
  toMap() {
    Snd.blip(); refreshHUD();
    this.mapSel = this.mapSel || S.loc1 || "cottonwood";
    if (S.stands >= 2) this.mapSel2 = this.mapSel2 || S.loc2 || null;
    this.renderMap();
    profSay(TIPS.map, "map");
  },

  renderMap() {
    const sel = this.mapSel, sel2 = this.mapSel2;
    setScreen(`
      <h2 class="screen-title">🗺️ Brackendale <span class="sub">where will you set up today?</span></h2>
      <div class="map-wrap">
        <div class="map-svg-holder">${this.mapSVG()}</div>
        <div class="map-side">
          ${this.locCardHTML(sel, 1)}
          ${S.stands >= 2 ? this.stand2HTML() : ""}
          <div class="footer-actions" style="padding:4px 0 0">
            <button class="btn btn-plain btn-small" onclick="G.toMenu()">◂ Menu</button>
            <button class="btn btn-pink" ${sel ? "" : "disabled"} onclick="G.confirmDay()">Open for Business! ▸</button>
          </div>
        </div>
      </div>`);
  },

  mapSVG() {
    const pins = Object.entries(LOCATIONS).map(([id, L]) => {
      const isSel = this.mapSel === id, isSel2 = this.mapSel2 === id;
      const [hint, hcol] = trafficHint(id);
      const ev = S.event && S.event.loc === id;
      return `<g class="loc-pin" onclick="G.pickLoc('${id}')">
        ${isSel || isSel2 ? `<circle cx="${L.x}" cy="${L.y}" r="22" fill="none" stroke="${isSel ? "#e0608c" : "#4db890"}" stroke-width="4" stroke-dasharray="6 4"><animateTransform attributeName="transform" type="rotate" from="0 ${L.x} ${L.y}" to="360 ${L.x} ${L.y}" dur="6s" repeatCount="indefinite"/></circle>` : ""}
        <circle class="ring" cx="${L.x}" cy="${L.y}" r="13" fill="${isSel ? "#e0608c" : isSel2 ? "#4db890" : "#fffdf5"}" stroke="#4a3528" stroke-width="3"/>
        <text x="${L.x}" y="${L.y + 5}" text-anchor="middle" font-size="13">${ev ? S.event.ico : "🧋"}</text>
        <text x="${L.x}" y="${L.y + 30}" text-anchor="middle" font-family="'Pixelify Sans',cursive" font-weight="700" font-size="11" fill="#3b2c26" stroke="#fff6e9" stroke-width="3" paint-order="stroke">${esc(L.name)}</text>
        <text x="${L.x}" y="${L.y - 20}" text-anchor="middle" font-family="'Pixelify Sans',cursive" font-size="10" font-weight="700" fill="${hcol}" stroke="#fff6e9" stroke-width="3" paint-order="stroke">${hint}</text>
      </g>`;
    }).join("");
    return `<svg viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="560" fill="#bfe6a0"/>
      <!-- texture dots -->
      <pattern id="gdots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="6" r="2" fill="#abd98c"/><circle cx="19" cy="19" r="2" fill="#abd98c"/>
      </pattern>
      <rect width="800" height="560" fill="url(#gdots)"/>
      <!-- creek -->
      <path d="M70,-10 C90,80 60,150 120,220 C190,300 330,290 420,360 C500,420 560,480 600,575"
        fill="none" stroke="#8fd4f0" stroke-width="20" stroke-linecap="round" opacity=".9"/>
      <path d="M70,-10 C90,80 60,150 120,220 C190,300 330,290 420,360 C500,420 560,480 600,575"
        fill="none" stroke="#bde3ff" stroke-width="10" stroke-linecap="round"/>
      <!-- parks -->
      <g>
        <rect x="285" y="215" width="95" height="75" rx="12" fill="#8fce72" stroke="#6fbf63" stroke-width="4"/>
        <text x="332" y="208" text-anchor="middle" font-size="16">🌳🌳</text>
        <rect x="55" y="105" width="85" height="70" rx="12" fill="#8fce72" stroke="#6fbf63" stroke-width="4"/>
        <text x="97" y="100" text-anchor="middle" font-size="16">🌳</text>
        <rect x="600" y="380" width="100" height="70" rx="12" fill="#8fce72" stroke="#6fbf63" stroke-width="4"/>
      </g>
      <!-- roads -->
      <g stroke="#fff2d8" stroke-linecap="round" fill="none">
        <path d="M0,52 H800" stroke-width="26"/>
        <path d="M398,0 L470,180 L560,380 L600,560" stroke-width="26"/>
        <path d="M252,52 L268,260 L268,560" stroke-width="20"/>
        <path d="M0,488 H720" stroke-width="22"/>
        <path d="M500,232 C600,205 690,260 730,340 C750,380 752,420 740,470" stroke-width="16"/>
        <path d="M268,330 H470" stroke-width="12"/>
        <path d="M268,392 H180" stroke-width="0"/>
      </g>
      <g stroke="#e0c9a0" stroke-linecap="round" fill="none" opacity=".8">
        <path d="M0,52 H800" stroke-width="3" stroke-dasharray="14 12"/>
        <path d="M398,0 L470,180 L560,380 L600,560" stroke-width="3" stroke-dasharray="14 12"/>
      </g>
      <!-- railway -->
      <g>
        <path d="M620,0 L800,230" stroke="#8a5a2c" stroke-width="8"/>
        <path d="M620,0 L800,230" stroke="#fff6e9" stroke-width="4" stroke-dasharray="8 10"/>
      </g>
      <!-- street labels -->
      <g font-family="'Pixelify Sans',cursive" font-size="13" font-weight="700" fill="#7a6a52">
        <text x="60" y="42">Depot Rd</text>
        <text x="690" y="42">Depot Rd</text>
        <text x="455" y="160" transform="rotate(68 455 160)" >Government Rd</text>
        <text x="230" y="200" transform="rotate(86 230 200)">Cottonwood Rd</text>
        <text x="80" y="478">Judd Rd</text>
        <text x="600" y="240" transform="rotate(8 600 240)">Dryden Rd</text>
        <text x="330" y="322">Zenith Rd</text>
        <text x="650" y="120" transform="rotate(52 650 120)">railway</text>
      </g>
      <!-- landmarks -->
      <g font-size="15">
        <text x="430" y="195">☕</text>
        <text x="430" y="465">🥕</text>
      </g>
      ${pins}
    </svg>`;
  },

  placing: 1,
  pickLoc(id) {
    if (S.stands >= 2 && this.placing === 2) {
      if (id === this.mapSel) return Snd.bad();      // stands can't share a spot
      this.mapSel2 = (this.mapSel2 === id) ? null : id;
    } else {
      if (id === this.mapSel2) this.mapSel2 = null;
      this.mapSel = id;
    }
    Snd.blip(); this.renderMap();
  },
  setPlacing(n) { this.placing = n; Snd.blip(); this.renderMap(); },

  locCardHTML(id, standNo) {
    if (!id) return `<div class="panel hint">Tap a 🧋 pin to choose a spot.</div>`;
    const L = LOCATIONS[id], ls = S.locs[id];
    const [hint, hcol] = trafficHint(id);
    const stale = ls.consec >= 2;
    const ev = S.event && S.event.loc === id;
    return `<div class="panel">
      <div class="px" style="font-weight:700;font-size:17px">📍 Stand ${standNo}: ${L.name}</div>
      <div class="hint" style="margin:4px 0 8px">${L.blurb}</div>
      ${ev ? `<div class="event-flash">${S.event.ico} ${S.event.name} here today!</div>` : ""}
      <div style="font-size:17px;margin-top:6px">Crowd today: <b style="color:${hcol}">${hint}</b></div>
      <div style="font-size:17px;margin:4px 0 2px">Locals know you: </div>
      <div class="meter"><i style="width:${Math.round(ls.fam * 100)}%"></i></div>
      ${stale ? `<div style="font-size:16px;color:var(--danger);margin-top:6px">⚠️ ${ls.consec} days in a row here — folks are getting bored!</div>` : ""}
      <div style="margin-top:6px">Crowd favourites: ${L.prefs.map(t => `<span class="tagchip">${TAG_NAMES[t]}</span>`).join("")}</div>
    </div>`;
  },

  stand2HTML() {
    const kids = S.hired;
    const opts = kids.map(id => {
      const k = STAFF_POOL.find(s => s.id === id);
      return `<option value="${id}" ${S.stand2staff === id ? "selected" : ""}>${k.name} (😊${k.charm} 🧋${k.skill})</option>`;
    }).join("");
    return `<div class="panel">
      <div class="px" style="font-weight:700;font-size:15px">🏪 Stand 2 ${this.mapSel2 ? "— " + esc(LOCATIONS[this.mapSel2].name) : ""}</div>
      ${kids.length === 0
        ? `<div class="hint">Hire a crew member to run Stand 2!</div>`
        : `<div class="spread" style="margin:6px 0">
             <button class="btn btn-small ${this.placing === 1 ? "btn-pink" : "btn-plain"}" onclick="G.setPlacing(1)">place Stand 1</button>
             <button class="btn btn-small ${this.placing === 2 ? "btn-mint" : "btn-plain"}" onclick="G.setPlacing(2)">place Stand 2</button>
           </div>
           <div class="hint" style="margin:4px 0">Who runs Stand 2?</div>
           <select style="font-family:var(--font-tt);font-size:18px;padding:4px;border:3px solid var(--pearl);border-radius:8px;background:var(--paper)"
             onchange="G.setStand2Staff(this.value)">
             <option value="">— nobody (closed) —</option>${opts}
           </select>
           ${this.mapSel2 ? this.locCardHTML(this.mapSel2, 2) : ""}`}
    </div>`;
  },
  setStand2Staff(id) { S.stand2staff = id || null; Snd.blip(); save(); this.renderMap(); },

  // ---------- run the day! ----------
  confirmDay() {
    if (!this.mapSel) return;
    S.loc1 = this.mapSel;
    S.loc2 = (S.stands >= 2 && this.mapSel2 && this.mapSel2 !== this.mapSel && S.stand2staff) ? this.mapSel2 : null;
    Snd.fanfare();
    results = simulateDay();
    this.playSell();
  },

  // ---------- sell animation ----------
  anim: null,
  playSell() {
    refreshHUD();
    const r = results.stand1;
    const sceneClass = S.weather === "rainy" ? "rainy" : S.weather === "heatwave" ? "heat" : "";
    setScreen(`
      <div class="sell-screen">
        <div class="sell-scene ${sceneClass}" id="scene">
          <div class="sell-loc-label">📍 ${esc(LOCATIONS[S.loc1].name)} ${S.event && S.event.loc === S.loc1 ? S.event.ico : ""}</div>
          <div class="sell-stand">${standSVG(1.5)}</div>
        </div>
        <div class="sell-hud">
          <span id="cnt-sold">🧋 0</span><span id="cnt-cash">💰 ${fmt$(0)}</span><span id="cnt-walk">😢 0</span>
          <span class="grow"></span>
          <button class="btn btn-small btn-plain" onclick="G.animSpeed(1)">▶</button>
          <button class="btn btn-small btn-plain" onclick="G.animSpeed(3)">▶▶</button>
          <button class="btn btn-small" onclick="G.skipAnim()">Skip ⏭</button>
        </div>
        <div class="sell-log" id="selllog"></div>
      </div>`);
    profSay(TIPS.sell, "sell");
    this.anim = { i: 0, speed: 1, sold: 0, cash: 0, walk: 0, done: false, timer: null };
    this.stepAnim();
  },

  animSpeed(s) { if (this.anim) this.anim.speed = s; Snd.blip(); },

  stepAnim() {
    const a = this.anim, evts = results.stand1.events;
    if (!a || a.done) return;
    if (a.i >= evts.length) return this.endAnim();
    const e = evts[a.i++];
    const scene = $("#scene");
    if (scene) {
      const kid = document.createElement("div");
      kid.className = "sell-customer";
      kid.style.left = "-60px";
      kid.innerHTML = kidSprite(4) +
        `<div class="sell-bubble ${e.ok ? "good" : "bad"}">${esc(e.line)}</div>`;
      scene.appendChild(kid);
      requestAnimationFrame(() => kid.style.left = `calc(50% + ${ri(-150, 130)}px)`);
      if (e.ok) {
        const coin = document.createElement("div");
        coin.className = "float-coin";
        coin.style.left = `calc(50% + ${ri(-40, 40)}px)`;
        coin.style.bottom = "140px";
        coin.textContent = "+" + fmt$(e.paid);
        scene.appendChild(coin);
        setTimeout(() => coin.remove(), 900);
      }
      setTimeout(() => { kid.style.left = e.ok ? "110%" : "-80px"; }, 900 / a.speed);
      setTimeout(() => kid.remove(), 2100 / a.speed);
    }
    if (e.ok) { a.sold++; a.cash += e.paid; Snd.cha(); }
    else { a.walk++; if (a.i % 3 === 0) Snd.bad(); }
    const log = $("#selllog");
    if (log) {
      log.insertAdjacentHTML("afterbegin",
        `<div class="${e.ok ? "good" : e.cls}">${e.ok ? "🧋" : "✗"} ${esc(e.logline)}</div>`);
    }
    $("#cnt-sold") && ($("#cnt-sold").textContent = `🧋 ${a.sold}`);
    $("#cnt-cash") && ($("#cnt-cash").textContent = `💰 ${fmt$(a.cash)}`);
    $("#cnt-walk") && ($("#cnt-walk").textContent = `😢 ${a.walk}`);
    a.timer = setTimeout(() => this.stepAnim(), 620 / a.speed);
  },

  skipAnim() { if (this.anim) { clearTimeout(this.anim.timer); this.endAnim(); } },
  endAnim() {
    if (!this.anim || this.anim.done) return;
    this.anim.done = true;
    clearTimeout(this.anim.timer);
    this.report();
  },

  // ---------- report ----------
  report() {
    applyResults();
    refreshHUD();
    const r = results;
    const wages = r.wages;
    const profit = r.revenue - wages;
    const badgesHTML = r.newBadges.map(b =>
      `<div class="badge-pop"><span style="font-size:26px">${b.ico}</span> Badge earned: ${b.name}!</div>`).join("");
    const newsHTML = this.tomorrowNewsHTML(r);
    setScreen(`
      <div class="report-screen">
        <h2 class="screen-title center">🌙 Day ${S.day} Report</h2>
        ${r.viralFid ? `<div class="badge-pop" style="background:var(--pink);border-color:var(--pink-dk)">📱 ${esc(FLAVORS[r.viralFid].name)} WENT VIRAL on KidTok!!</div>` : ""}
        ${badgesHTML}
        <div class="panel report-card">
          <div class="report-row"><span>Cups sold ${r.stand2 ? "(both stands)" : ""}</span><b>${r.cups}</b></div>
          <div class="report-row"><span>Sales</span><b class="pos">+${fmt$(r.revenue)}</b></div>
          ${wages > 0 ? `<div class="report-row"><span>Crew wages</span><b class="neg">−${fmt$(wages)}</b></div>` : ""}
          ${r.tossed > 0 ? `<div class="report-row"><span>Leftover pearls tossed 🗑️</span><b class="neg">${r.tossed}</b></div>` : ""}
          <div class="report-row total"><span>Day profit</span><b class="${profit >= 0 ? "pos" : "neg"}">${profit >= 0 ? "+" : "−"}${fmt$(Math.abs(profit))}</b></div>
        </div>
        ${r.stand2 ? `<div class="panel report-card" style="font-size:18px">🏪 <b>${esc(r.stand2.staffName)}</b> sold <b>${r.stand2.sold}</b> cups at ${esc(LOCATIONS[S.loc2].name)} (+${fmt$(r.stand2.revenue)})</div>` : ""}
        <div class="panel report-card">
          <div class="report-row"><span>Reputation</span>
            <span><span class="stars">${"★".repeat(Math.round(S.rep))}${"☆".repeat(5 - Math.round(S.rep))}</span>
            ${r.repDelta >= 0 ? `<b class="pos">▲</b>` : `<b class="neg">▼</b>`}</span></div>
          ${r.soldOut > 0 ? `<div class="hint">😬 ${r.soldOut} customers found you sold out — that stings the reputation.</div>` : ""}
          ${r.lineLost > 0 ? `<div class="hint">⏳ ${r.lineLost} gave up waiting in line. More crew = faster serving!</div>` : ""}
        </div>
        <div class="panel report-card">
          <div class="px" style="font-weight:700">📰 The Brackendale Bubble — tomorrow:</div>
          ${newsHTML}
        </div>
        <button class="btn btn-big btn-pink" onclick="G.nextDay()">Sleep 💤 ▸ Day ${S.day + 1}</button>
      </div>`);
    profSay(TIPS.report, "report");
    if (results.newBadges.length) Snd.fanfare();
  },

  tomorrowNewsHTML(r) {
    const fc = WEATHER[S.forecast];
    const lines = [`<div class="news-item">${fc.ico} Forecast: <b>${fc.name}</b>${S.forecast === "heatwave" ? " — boba weather!!" : S.forecast === "rainy" ? " — bring a raincoat…" : ""}</div>`];
    if (S.eventTomorrow)
      lines.push(`<div class="news-item">${S.eventTomorrow.ico} <b>${esc(S.eventTomorrow.name)}</b> at ${esc(LOCATIONS[S.eventTomorrow.loc].name)} — ${esc(S.eventTomorrow.blurb)}!</div>`);
    if (r.trendChanged)
      lines.push(`<div class="news-item">📢 New craze: <b>${TAG_NAMES[S.trend]}</b> flavours are THE thing this week.</div>`);
    return lines.join("");
  },

  nextDay() {
    Snd.jingle();
    S.day++;
    S.weather = resolveWeather(S.forecast);
    S.forecast = rollWeather();
    S.event = S.eventTomorrow;
    S.eventTomorrow = Math.random() < .28 ? (() => {
      const ev = pick(EVENTS);
      return { name: ev.name, ico: ev.ico, mult: ev.mult, blurb: ev.blurb, loc: pick(ev.locs) };
    })() : null;
    results = null;
    save();
    this.morning();
  },

  // ---------- badges & help ----------
  showBadges() {
    const cells = BADGES.map(b => `
      <div class="badge-cell ${S && S.badges.includes(b.id) ? "earned" : ""}">
        <div class="bico">${b.ico}</div><div class="bnm">${b.name}</div><div class="bds">${b.desc}</div>
      </div>`).join("");
    modal(`<h3 class="px">🏅 Badge Collection ${S ? `(${S.badges.length}/${BADGES.length})` : ""}</h3>
      <div class="badge-grid">${cells}</div>
      <div class="center" style="margin-top:12px"><button class="btn btn-small" onclick="G.closeModal()">Close</button></div>`);
    Snd.blip();
  },

  showHelp() {
    modal(`<h3 class="px">🧋 How to Play</h3>
      <div style="font-size:18px;line-height:1.35;margin-top:8px">
      <p><b>Each day:</b> 🛒 shop → 🍳 cook pearls → 📋 pick menu & price → 🗺️ pick a spot → 🧋 SELL!</p>
      <p style="margin-top:8px"><b>🛒 Shop:</b> every cup needs a pearl, a cup & tea. Milky drinks need milk; fancy flavours need syrup. Pearls must be cooked fresh daily!</p>
      <p style="margin-top:8px"><b>📋 Flavours:</b> a little unusual = exciting. SUPER weird = most folks pass… but weird flavours can go <b>viral</b>!</p>
      <p style="margin-top:8px"><b>🗺️ Spots:</b> returning builds familiarity (more customers!), but too many days in a row bores people. Rotate! Match flavours to each crowd. Watch weather & events.</p>
      <p style="margin-top:8px"><b>🧢 Crew:</b> charm sells more cups, skill makes better boba & shorter lines. Save $250 for a second stand a crew member can run!</p>
      </div>
      <div class="center" style="margin-top:12px"><button class="btn btn-small" onclick="G.closeModal()">Got it!</button></div>`);
    Snd.blip();
  },
};

// ------------------------------------------------------------
// Day simulation
// ------------------------------------------------------------
function simulateStand(locId, opts) {
  // opts: { capacity, charmBonus, quality, isMain }
  const L = LOCATIONS[locId];
  let traffic = locTrafficToday(locId);
  // viral check: any weird flavour on the menu has a chance to blow up
  let viralFid = null;
  if (opts.isMain) {
    const weird = S.menu.filter(f => FLAVORS[f].uniq >= 9);
    if (weird.length && Math.random() < .10) {
      viralFid = pick(weird);
      traffic *= 1.5;
    }
  }
  const arrivals = Math.min(60, Math.round(traffic * rnd(.85, 1.15)));
  const qm = .75 + opts.quality / 200;             // 0.75 … 1.25
  const repF = .7 + S.rep * .12;
  const priceF = priceFactor(S.price);
  const ev = { sold: 0, revenue: 0, soldOut: 0, lineLost: 0, taste: 0, pricey: 0, events: [], satSum: 0, viralFid };

  for (let i = 0; i < arrivals; i++) {
    const wants = S.menu.map(f => [f, flavorAppeal(f, locId, viralFid)]);
    if (!wants.length) break;
    const fid = weightedPick(wants);
    const f = FLAVORS[fid];
    const appeal = flavorAppeal(fid, locId, viralFid);
    const buyP = clamp(.62 * appeal * priceF * repF * qm * (1 + opts.charmBonus), .03, .97);
    const fname = f.name;
    let e;
    if (Math.random() > buyP) {
      const why = priceF < .85 && Math.random() < .6 ? "pricey" : "taste";
      e = { ok: false, cls: "meh", line: pick(LINES[why]), logline: `${pick(LINES[why])}` };
      ev.pricey += why === "pricey" ? 1 : 0; ev.taste += why === "taste" ? 1 : 0;
    } else if (ev.sold >= opts.capacity) {
      e = { ok: false, cls: "bad", line: pick(LINES.line), logline: `${pick(LINES.line)} (line too long!)` };
      ev.lineLost++;
    } else if (!canServe(fid)) {
      e = { ok: false, cls: "bad", line: pick(LINES.soldout), logline: `Wanted ${fname} — SOLD OUT!` };
      ev.soldOut++;
    } else {
      consume(fid);
      const paid = S.price;
      ev.sold++; ev.revenue += paid;
      ev.satSum += clamp(.45 * (opts.quality / 100) + .35 * Math.min(appeal, 1.4) / 1.4 + .2 * Math.min(priceF, 1.12), 0, 1);
      e = { ok: true, paid, line: pick(LINES.buy).replace("{f}", fname), logline: `Sold a ${fname}! +${fmt$(paid)}` };
    }
    ev.events.push(e);
  }
  return ev;
}

function simulateDay() {
  // crew assignments
  const helpers = S.hired.filter(id => id !== S.stand2staff)
    .map(id => STAFF_POOL.find(k => k.id === id));
  const charmBonus = helpers.reduce((s, k) => s + k.charm * .02, 0);
  const capacity = 22 + helpers.reduce((s, k) => s + 6 + k.skill, 0);

  const stand1 = simulateStand(S.loc1, { capacity, charmBonus, quality: S.quality, isMain: true });

  let stand2 = null;
  if (S.loc2 && S.stand2staff) {
    const k = STAFF_POOL.find(s => s.id === S.stand2staff);
    const r2 = simulateStand(S.loc2, {
      capacity: 14 + k.skill, charmBonus: k.charm * .03,
      quality: clamp(S.quality * (.6 + k.skill * .045), 10, 100), isMain: false,
    });
    stand2 = { sold: r2.sold, revenue: r2.revenue, satSum: r2.satSum, soldOut: r2.soldOut, lineLost: r2.lineLost, staffName: k.name };
  }

  const wages = S.hired.reduce((s, id) => s + STAFF_POOL.find(k => k.id === id).wage, 0);
  const cups = stand1.sold + (stand2 ? stand2.sold : 0);
  const revenue = stand1.revenue + (stand2 ? stand2.revenue : 0);
  return {
    stand1, stand2, wages, cups, revenue,
    soldOut: stand1.soldOut + (stand2 ? stand2.soldOut : 0),
    lineLost: stand1.lineLost + (stand2 ? stand2.lineLost : 0),
    viralFid: stand1.viralFid,
    satSum: stand1.satSum + (stand2 ? stand2.satSum : 0),
    tossed: 0, newBadges: [], repDelta: 0, trendChanged: false, applied: false,
  };
}

function applyResults() {
  const r = results;
  if (!r || r.applied) return;
  r.applied = true;

  // money
  S.money += r.revenue - r.wages;
  if (S.money < 0) S.money = 0;
  S.stats.sold += r.cups;
  S.stats.revenue += r.revenue;
  S.stats.bestDay = Math.max(S.stats.bestDay, r.revenue);
  if (r.viralFid) S.stats.viral++;

  // reputation
  const avgSat = r.cups > 0 ? r.satSum / r.cups : .4;
  let delta = clamp((avgSat * 5 - S.rep) * .15, -.4, .4);
  delta -= Math.min(.2, r.soldOut * .02);
  S.rep = clamp(S.rep + delta, 1, 5);
  r.repDelta = delta;

  // location memory
  const visited = [S.loc1, S.loc2].filter(Boolean);
  Object.entries(S.locs).forEach(([id, ls]) => {
    if (visited.includes(id)) {
      ls.fam = Math.min(1, ls.fam + (LOCATIONS[id].loyal ? .35 : .22));
      ls.consec++;
      ls.visited = true;
    } else {
      ls.fam *= LOCATIONS[id].loyal ? .97 : .93;
      ls.consec = 0;
    }
  });

  // pearls don't keep!
  r.tossed = S.pearls;
  S.pearls = 0; S.cooked = false; S.quality = 0;

  // weekly trend rotation
  if (S.day % 7 === 0) {
    const old = S.trend;
    S.trend = pick(Object.keys(TAG_NAMES).filter(t => t !== old));
    r.trendChanged = true;
  }

  // badges
  const earn = (id) => {
    if (!S.badges.includes(id)) {
      S.badges.push(id);
      r.newBadges.push(BADGES.find(b => b.id === id));
    }
  };
  if (S.stats.sold >= 1) earn("firstpour");
  if (r.revenue >= 100) earn("sweet100");
  if (r.viralFid) earn("viral");
  if (S.rep >= 4.5) earn("legend");
  if (S.hired.length > 0) earn("boss");
  if (S.stands >= 2) earn("tycoon");
  if (S.day >= 7) earn("weekone");
  if (S.money >= 1000) earn("moneybags");
  if (Object.values(S.locs).every(l => l.visited)) earn("explorer");

  save();
}

// ------------------------------------------------------------
// boot
// ------------------------------------------------------------
window.addEventListener("load", () => G.title());
// unlock audio on first interaction
document.addEventListener("pointerdown", () => Snd.ac()?.resume(), { once: true });
