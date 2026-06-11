# 🧋 Boba Stand! — a bubble tea adventure

A cozy retro boba-stand simulator set in Brackendale, made as a gift for a
young boba chef. No build step, no dependencies — pure HTML/CSS/JS.

## How to play it

Just open `index.html` in any browser (double-click it). That's it.

The game auto-saves after every day (in the browser's localStorage), so she
can close the tab and hit **Continue** later. Saves are per-browser.

> Tip: pixel fonts load from Google Fonts, so it looks best online, but the
> game works fully offline too (it just falls back to a plain font).

## The daily loop

1. **🛒 Shop** — buy tapioca starch, tea, milk, sugar, cups, and flavour
   syrups. Buying a syrup unlocks that flavour forever.
2. **🍳 Kitchen** — cook the pearls in a 3-step timing minigame
   (boil → simmer → syrup soak). Quality affects every sale all day, and
   leftover pearls are tossed at night — boba must be fresh!
3. **📋 Menu** — pick up to 3 flavours and set the price. Mildly-unusual
   flavours (taro, honeydew, lavender) sell best; super-weird ones
   (dill pickle, garlic butter) usually flop… but can **go viral**.
4. **🗺️ Map** — pick a spot in Brackendale. Each location tracks
   *familiarity* (show up often → locals seek you out) and *staleness*
   (too many days in a row → people get bored). Rotating 2-3 spots is the
   sweet spot. Each crowd has flavour preferences, and weather, weekends,
   and news events (soccer tournaments, farmers market…) move the crowds.
5. **🧋 Sell** — watch the customers roll in.
6. **🌙 Report** — profit, reputation, badges, and tomorrow's news.

Long-term: hire neighbourhood kids (charm = sales, skill = quality & line
speed), buy a **second stand** ($250) for a crew member to run, and collect
all 10 badges.

## Tweaking it (all in `js/data.js`)

- **Flavours** — add one to `FLAVORS` with a `uniq` 1-10, a colour, and a
  syrup price. It shows up in the shop automatically.
- **Locations** — names, positions, traffic and crowd preferences are in
  `LOCATIONS`; the map drawing is `mapSVG()` in `js/game.js`.
- **Hireable kids** — `STAFF_POOL` (rename them after her real friends!).
- **Difficulty** — starting money is in `freshState()` (`js/game.js`),
  prices in `STAPLES`, and the customer "buy chance" multiplier (0.62) is in
  `simulateStand()`.

## Dev preview

`.claude/launch.json` is set up to serve the folder at
`http://localhost:8742` via `python3 -m http.server`.
