window.HH = window.HH || {};

HH.VS = 0.3;

HH.MAPS = [
  {
    id: "barnyard", name: "Sunny Barnyard", radius: 30, height: 26, hayValue: 0.02, gems: 80, needles: 0, par: 600,
    sky: 0x8fd3ff, fog: 0xcfeaff, ground: 0x7fc15a, hay: [0xf2c94c, 0xe8b53a, 0xf7d774, 0xdcaa36, 0xf5d066], night: false
  },
  {
    id: "meadow", name: "Moonlit Meadow", radius: 36, height: 30, hayValue: 0.03, gems: 160, needles: 1, par: 780,
    sky: 0x23285e, fog: 0x343a78, ground: 0x3f6f58, hay: [0xd8c070, 0xc9ae5c, 0xe6d28a, 0xbfa050], night: true
  },
  {
    id: "silo", name: "Spooky Silo", radius: 30, height: 46, hayValue: 0.042, gems: 300, needles: 3, par: 900, tall: true,
    sky: 0x4b2d60, fog: 0x5e3d70, ground: 0x544636, hay: [0xc7a24a, 0xb89040, 0xd8b460, 0xa87f35], night: true
  },
  {
    id: "mega", name: "The Mega Stack", radius: 44, height: 38, hayValue: 0.056, gems: 600, needles: 6, par: 1200,
    sky: 0xffb27a, fog: 0xffd2a8, ground: 0x9cb85a, hay: [0xffd75e, 0xf2c14a, 0xffe08a, 0xe8b23a, 0xffcf40], night: false
  }
];

HH.TOOLS = [
  { id: "hand", name: "Hands", key: "1", unlock: 0, icon: "&#9995;" },
  { id: "fork", name: "Pitchfork", key: "2", unlock: 15, icon: "&#128305;" },
  { id: "tnt", name: "Dynamite", key: "3", unlock: 40, icon: "&#129512;", rb: 1 },
  { id: "vac", name: "Vacuum", key: "4", unlock: 120, icon: "&#127744;", rb: 2 },
  { id: "tornado", name: "Hay Tornado", key: "5", unlock: 300, icon: "&#127786;", rb: 3 },
  { id: "hole", name: "Black Hole", key: "6", unlock: 1500, icon: "&#127761;", rb: 4 }
];

HH.BAG_TIERS = [ { cap: 80, cost: 0 }, { cap: 160, cost: 4 }, { cap: 280, cost: 10 }, { cap: 460, cost: 22 }, { cap: 720, cost: 45 }, { cap: 1100, cost: 85 }, { cap: 1700, cost: 150 }, { cap: 2600, cost: 260 }, { cap: 3800, cost: 430 }, { cap: 5500, cost: 700 }, { cap: 8000, cost: 1100 }, { cap: 11500, cost: 1700 } ];

HH.UPGRADES = [
  { id: "hold", group: "Hands", name: "Auto-Grab", desc: "Hold the mouse to keep grabbing", base: 1, grow: 1, max: 1 },
  { id: "grasp", group: "Hands", name: "Grasp", desc: "+1 hay per grab", base: 0.3, grow: 1.5, max: 15 },
  { id: "speed", group: "Hands", name: "Quick Hands", desc: "Grab 10% faster", base: 0.6, grow: 1.55, max: 10 },
  { id: "reach", group: "Hands", name: "Long Arms", desc: "Reach further into the stack", base: 2, grow: 1.7, max: 6 },
  { id: "golden", group: "Hands", name: "Golden Touch", desc: "+5% chance a grab hauls triple hay", base: 6, grow: 1.7, max: 6 },
  { id: "walk", group: "Body", name: "Fast Boots", desc: "+8% walk speed", base: 1.5, grow: 1.6, max: 8 },
  { id: "jump", group: "Body", name: "Spring Socks", desc: "+10% jump height", base: 1.5, grow: 1.6, max: 6 },
  { id: "glove", group: "Hands", name: "Steel Gloves", desc: "Each grab digs a wider area", base: 3, grow: 1.7, max: 6 },
  { id: "combo", group: "Body", name: "Combo King", desc: "Combos build faster and last longer", base: 5, grow: 1.8, max: 5 },
  { id: "sprint", group: "Body", name: "Turbo Sprint", desc: "Hold Shift to sprint (+15% sprint speed per level)", base: 4, grow: 1.7, max: 5 },
  { id: "hover", group: "Body", name: "Hay Glider", desc: "Hold Space in the air to float down slowly", base: 20, grow: 1, max: 1 },
  { id: "tip", group: "Selling", name: "Tip Jar", desc: "+5% sell price", base: 3, grow: 1.6, max: 10 },
  { id: "bulk", group: "Selling", name: "Bulk Deal", desc: "+3% bonus for every 100 hay sold at once", base: 10, grow: 1.8, max: 5 },
  { id: "goose", group: "Selling", name: "Golden Goose", desc: "A goose that honks at Bjorn until he pays 15% more", base: 250, grow: 1, max: 1 },
  { id: "fsweep", group: "Pitchfork", tool: "fork", name: "Wide Sweep", desc: "Bigger pitchfork scoop", base: 1, grow: 1.6, max: 8 },
  { id: "fcool", group: "Pitchfork", tool: "fork", name: "Fast Fork", desc: "12% shorter cooldown", base: 1, grow: 1.6, max: 8 },
  { id: "fgold", group: "Pitchfork", tool: "fork", name: "Golden Prongs", desc: "+8% chance a scoop turns into rainbow hay", base: 6, grow: 1.8, max: 5 },
  { id: "tpower", group: "Dynamite", tool: "tnt", name: "Blast Power", desc: "Bigger explosions", base: 4, grow: 1.7, max: 7 },
  { id: "tcool", group: "Dynamite", tool: "tnt", name: "Short Fuse", desc: "15% shorter cooldown", base: 4, grow: 1.7, max: 6 },
  { id: "tlucky", group: "Dynamite", tool: "tnt", name: "Lucky Blast", desc: "Blasted hay can turn into rainbow hay", base: 5, grow: 1.8, max: 5 },
  { id: "tcluster", group: "Dynamite", tool: "tnt", name: "Cluster Bombs", desc: "+10% chance a stick splits into 3", base: 8, grow: 1.9, max: 5 },
  { id: "vpower", group: "Vacuum", tool: "vac", name: "Suction Power", desc: "Pulls way more hay per second (gets stronger each tier)", base: 8, grow: 1.6, max: 10 },
  { id: "vrun", group: "Vacuum", tool: "vac", name: "Battery Pack", desc: "Runs much longer before overheating", base: 9, grow: 1.6, max: 8 },
  { id: "vwide", group: "Vacuum", tool: "vac", name: "Wide Nozzle", desc: "Bigger pickup radius", base: 10, grow: 1.7, max: 8 },
  { id: "vrange", group: "Vacuum", tool: "vac", name: "Long Hose", desc: "Vacuum reaches hay from further away", base: 10, grow: 1.7, max: 6 },
  { id: "vtick", group: "Vacuum", tool: "vac", name: "Intake Speed", desc: "Pulls in hay faster and more smoothly", base: 12, grow: 1.7, max: 6 },
  { id: "vmove", group: "Vacuum", tool: "vac", name: "Wheelie Pack", desc: "Move faster while vacuuming", base: 12, grow: 1.7, max: 5 },
  { id: "vcool", group: "Vacuum", tool: "vac", name: "Heat Sink", desc: "Recovers from overheating much faster", base: 14, grow: 1.7, max: 6 },
  { id: "vitem", group: "Vacuum", tool: "vac", name: "Item Sucker", desc: "Vacuum also pulls in loose treasure, rainbow hay and golden bales", base: 40, grow: 1.9, max: 3 },
  { id: "tsize", group: "Tornado", tool: "tornado", name: "Bigger Twister", desc: "Tornado sucks a wider area", base: 25, grow: 1.7, max: 6 },
  { id: "tlast", group: "Tornado", tool: "tornado", name: "Long Storm", desc: "Tornado lasts longer", base: 25, grow: 1.7, max: 6 },
  { id: "tcd", group: "Tornado", tool: "tornado", name: "Storm Chaser", desc: "12% shorter tornado cooldown", base: 30, grow: 1.7, max: 6 },
  { id: "ttwin", group: "Tornado", tool: "tornado", name: "Twin Twisters", desc: "+1 tornado per summon", base: 400, grow: 2.2, max: 2 },
  { id: "hamster", group: "Helpers", name: "Hay Hamster", desc: "A pet hamster that stuffs hay into your bag while you're near the stack", base: 60, grow: 1, max: 1 },
  { id: "hamlvl", group: "Helpers", req: "hamster", name: "Hamster Snacks", desc: "Hamster works twice as fast per level", base: 15, grow: 1.7, max: 5 },
  { id: "drone", group: "Helpers", name: "Hay Drone", desc: "Collects hay and sells it for you", base: 80, grow: 1, max: 1 },
  { id: "dspeed", group: "Helpers", req: "drone", name: "Drone Rotors", desc: "Drones fly faster", base: 8, grow: 1.6, max: 6 },
  { id: "dcap", group: "Helpers", req: "drone", name: "Drone Basket", desc: "Drones carry more", base: 8, grow: 1.6, max: 6 },
  { id: "dfleet", group: "Helpers", req: "drone", name: "Drone Fleet", desc: "+1 extra drone", base: 200, grow: 2.5, max: 2 },
  { id: "magnet", group: "Helpers", name: "Hay Magnet", desc: "Pulls in loose treasure and rainbow hay around you", base: 30, grow: 1.7, max: 5 },
  { id: "teleport", group: "Helpers", name: "Hay Teleporter", desc: "Press F to sell from anywhere (20% fee)", base: 150, grow: 1, max: 1 },
  { id: "radar", group: "Needle Hunting", name: "Needle Radar", desc: "Beeps when the needle is somewhere nearby (a rough hint, not exact)", base: 60, grow: 1, max: 1 },
  { id: "rrange", group: "Needle Hunting", req: "radar", name: "Radar Range", desc: "Detects the needle from further away", base: 10, grow: 1.8, max: 5 },
  { id: "compass", group: "Needle Hunting", name: "Needle Compass", desc: "Once 35% of the stack is cleared, a compass points toward the needle", base: 300, grow: 1, max: 1 },
  { id: "hsize", group: "Black Hole", tool: "hole", name: "Event Horizon", desc: "Black hole swallows a bigger area", base: 300, grow: 1.8, max: 5 },
  { id: "hcool", group: "Black Hole", tool: "hole", name: "Hawking Radiation", desc: "15% shorter black hole cooldown", base: 300, grow: 1.8, max: 5 },
  { id: "compress", group: "Late Game", minLevel: 3, name: "Hay Compressor", desc: "Squish hay so your bag holds 25% more", base: 120, grow: 1.9, max: 5 },
  { id: "drill", group: "Late Game", minLevel: 3, name: "Diamond Drill", desc: "+4% chance any grab digs up a bonus gem", base: 150, grow: 1.9, max: 5 },
  { id: "autosell", group: "Late Game", minLevel: 4, name: "Auto-Seller", desc: "Your bag sells itself the moment it's full (10% fee)", base: 400, grow: 1, max: 1 },
  { id: "megafork", group: "Late Game", minLevel: 4, tool: "fork", name: "Mega Fork", desc: "Pitchfork scoops 40% more hay", base: 250, grow: 2, max: 4 },
  { id: "turbovac", group: "Late Game", minLevel: 5, tool: "vac", name: "Turbo Vacuum", desc: "+50% suction and cools twice as fast", base: 500, grow: 2, max: 3 },
  { id: "stormcall", group: "Late Game", minLevel: 6, name: "Storm Caller", desc: "Hay Storms happen twice as often", base: 800, grow: 1, max: 1 },
  { id: "nuke", group: "Late Game", minLevel: 6, tool: "tnt", name: "Nuke-a-mite", desc: "Every 4th dynamite is a MEGA blast", base: 900, grow: 1, max: 1 },
  { id: "harvest", group: "Late Game", minLevel: 8, name: "Golden Harvest", desc: "All hay is worth +25% more", base: 1500, grow: 2.2, max: 3 },
  { id: "nmagnet", group: "Late Game", minLevel: 8, name: "Needle Magnet", desc: "The needle rips itself out of the hay when you get within 3m", base: 2500, grow: 1, max: 1 }
];

HH.REBIRTH_ITEMS = [
  { id: "kitgrab", name: "Starter Kit: Auto-Grab", desc: "Every haystack starts with Auto-Grab already bought.", cost: 1, icon: "&#9995;" },
  { id: "kitbag", name: "Starter Backpack", desc: "Every haystack starts with Bag 3 (280 hay).", cost: 2, icon: "&#127890;" },
  { id: "kitfork", name: "Starter Pitchfork", desc: "Every haystack starts with the Pitchfork.", cost: 2, icon: "&#128305;" },
  { id: "goldgloves", name: "Golden Gloves", desc: "Hand grabs take twice as much hay, forever.", cost: 3, icon: "&#129508;" },
  { id: "autosell", name: "Bjorn's Contract", desc: "Your bag auto-sells when full, with NO fee.", cost: 3, icon: "&#128221;" },
  { id: "rainbowrain", name: "Rainbow Rain", desc: "Hay Storms come twice as often and last longer.", cost: 3, icon: "&#127752;" },
  { id: "clover", name: "Lucky Clover", desc: "+50% rainbow hay and diamonds in every haystack.", cost: 4, icon: "&#127808;" },
  { id: "hamking", name: "Hamster King", desc: "Start every haystack with a Hay Hamster that works 2x faster.", cost: 4, icon: "&#128057;" },
  { id: "needlesense", name: "Needle Sense", desc: "Free Needle Radar every haystack, with +4m range.", cost: 5, icon: "&#128225;" },
  { id: "gemfountain", name: "Gem Fountain", desc: "+50% gems from everything, forever.", cost: 5, icon: "&#9970;" }
];

HH.LEVELS = [
  { name: "First Haystack", map: "barnyard", layout: "dome", size: 0.8, tip: "A small stack to learn the ropes. Find the needle and bring it to Wizzo!" },
  { name: "Twin Trouble", map: "barnyard", layout: "twin", size: 0.95, tip: "Two haystacks! The needle is in one of them." },
  { name: "Golden Hill", map: "barnyard", layout: "dome", size: 1.05, tip: "A tall golden hill. Dig straight down to save time." },
  { name: "Muddy Meadow", map: "meadow", layout: "cluster", size: 1.1, mud: 6, tip: "Five small stacks, and mud puddles slow you down." },
  { name: "Hay Maze", map: "barnyard", layout: "maze", size: 1.1, tip: "Walls of hay form a maze. Dig through or find your way around." },
  { name: "Windy Ridge", map: "meadow", layout: "wall", size: 1.15, wind: true, tip: "Long hay walls, and strong gusts of wind push you around." },
  { name: "The Doughnut", map: "meadow", layout: "ring", size: 1.2, tip: "A ring-shaped stack. Check the inner wall too." },
  { name: "Silo Tower", map: "silo", layout: "tower", size: 1.2, deep: true, tip: "A tall tower of hay. The needle is buried deep." },
  { name: "Stepped Pyramid", map: "silo", layout: "pyramid", size: 1.25, mud: 4, tip: "A pyramid with mud around it. Climb carefully!" },
  { name: "Foggy Fields", map: "meadow", layout: "cluster", size: 1.3, fog: true, mud: 5, tip: "Thick fog hides the far stacks. Use your radar!" },
  { name: "Storm Front", map: "mega", layout: "twin", size: 1.3, wind: true, tip: "Wind and two big stacks." },
  { name: "The Mega Stack", map: "mega", layout: "dome", size: 1.4, deep: true, tip: "The biggest haystack yet. Good luck!" }
];

HH.BOOSTS = [
  { id: "vacboost", name: "Turbo Vacuum", desc: "Vacuum pulls 2x more hay for 2 minutes", dur: 120, icon: "vac" },
  { id: "bagboost", name: "Bigger Bag", desc: "+50% bag space for 3 minutes", dur: 180, icon: "bag" },
  { id: "sellboost", name: "2x Hay Money", desc: "Hay sells for DOUBLE cash for 3 minutes", dur: 180, icon: "cash" },
  { id: "cashboost", name: "Cash Drop", desc: "Instantly get cash worth 3 full bags", dur: 0, icon: "cash" },
  { id: "doubleboost", name: "2x Gems", desc: "Your next returned needle pays DOUBLE gems", dur: 0, icon: "gem" }
];

HH.rebirthNeed = function (rebirths) { return 3 + rebirths * 2; };
HH.stackScale = function (needles, rebirths, mapId) {
  const cap = mapId === "mega" ? 1.45 : mapId === "meadow" ? 1.6 : 1.8;
  return Math.min(cap, 1 + 0.05 * Math.min(needles, 10) + 0.1 * rebirths);
};

HH.PERKS = [
  { id: "hayValue", name: "Hay Value", desc: "+10% cash per hay", base: 20, grow: 1.45, max: 25 },
  { id: "bagSize", name: "Bag Size", desc: "+40 bag space", base: 25, grow: 1.45, max: 25 },
  { id: "grab", name: "Grab Amount", desc: "+1 hay per hand grab", base: 50, grow: 1.6, max: 10 },
  { id: "startCash", name: "Head Start", desc: "Start each run with +$500", base: 40, grow: 1.6, max: 10 },
  { id: "lucky", name: "Rainbow Luck", desc: "+15% rainbow hay in every stack", base: 60, grow: 1.6, max: 10 },
  { id: "gemValue", name: "Gem Value", desc: "+10% gems from everything", base: 150, grow: 1.7, max: 10 }
];

HH.CLASSES = [
  { id: "farmhand", name: "Farmhand", cost: 0, desc: "No bonus. Honest work." },
  { id: "baggoblin", name: "Bag Goblin", cost: 150, desc: "+50% bag space" },
  { id: "haggler", name: "Hay Haggler", cost: 200, desc: "+20% cash from selling hay" },
  { id: "forklord", name: "Fork Lord", cost: 300, desc: "+25% pitchfork haul, pitchfork upgrades 25% cheaper" },
  { id: "boomuncle", name: "Boom Uncle", cost: 400, desc: "+20% blast radius, +10% cluster chance" },
  { id: "sniffer", name: "Shiny Sniffer", cost: 600, desc: "Diamonds 50% more common, radar range +30%" },
  { id: "dronewhisper", name: "Drone Whisperer", cost: 800, desc: "Free drone that flies 30% faster and carries 40% more" },
  { id: "speedy", name: "Zoomer", cost: 1000, desc: "+25% walk speed and +20% jump" },
  { id: "barnaby", name: "Big Boss Barnaby", cost: 3000, desc: "Every bonus above, all at once" }
];

HH.NPC = {
  buyer: { name: "Bjorn Bargainini", title: "Hay Viking", model: "Barbarian" },
  wizard: { name: "Wizzo Stitchini", title: "Needle Wizard", model: "Mage" },
  shop: { name: "Hank Haybucks", title: "Shopkeeper", model: "Guy" }
};

HH.BUYER_LINES = [
  "SKÅL! Bellissimo hay!", "Crunchy! Delicious! Mine!", "More hay, more money, more hay!",
  "Bjorn approves this straw.", "This hay smells like VICTORY.", "Hay hay hay! Money money!", "Ooh, premium straw.",
  "My mug runneth over with coins!", "Keep digging, farmer friend!", "By Odin's beard, what quality!"
];

HH.WIZARD_LINES = [
  "My enchanted needle! The prophecy is fulfilled!", "Now I can knit the Sweater of Infinite Power!", "You found it! Take these gems, brave farmer!"
];

HH.fmt = function (n) {
  if (n < 1000) return (Math.round(n * 100) / 100).toFixed(2);
  const u = ["K", "M", "B", "T"];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : 1) + u[i];
};

HH.cash = function (n) { const v = Math.floor((n || 0) * 100 + 1e-6); if (v < 100000) return v.toLocaleString("en-US"); return HH.fmt(v); }; 
HH.fmtInt = function (n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  return HH.fmt(n);
};

HH.fmtTime = function (t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
};

HH.WARDROBE = {
  chars: [
    { id: "male-e", name: "Farmer Guy", model: "Guy", cost: 0, sleeve: "#f4f1e8", skin: null },
    { id: "female-b", name: "Sunny Penny", model: "character-female-b", cost: 30, sleeve: "#f2c230", skin: null },
    { id: "male-a", name: "Theo", model: "character-male-a", cost: 30, sleeve: "#3aa860", skin: "#8a5a3c" },
    { id: "female-c", name: "Rosa", model: "character-female-c", cost: 40, sleeve: "#e0552e", skin: "#e2b08c" },
    { id: "male-f", name: "Sam", model: "character-male-f", cost: 40, sleeve: "#3fae6a", skin: "#b5784f" },
    { id: "female-a", name: "Maya", model: "character-female-a", cost: 60, sleeve: "#7a4fd0", skin: "#8d5a3b" },
    { id: "male-b", name: "Big Bruno", model: "character-male-b", cost: 60, sleeve: "#e04a3a", skin: null },
    { id: "female-d", name: "Boss Gail", model: "character-female-d", cost: 80, sleeve: "#6d7480", skin: null },
    { id: "male-c", name: "Officer Bale", model: "character-male-c", cost: 90, sleeve: "#3f5fbf", skin: "#e8b99a" },
    { id: "female-e", name: "Dr. Kiko", model: "character-female-e", cost: 100, sleeve: "#eef0f5", skin: "#efc7a8" },
    { id: "female-f", name: "Hazel", model: "character-female-f", cost: 120, sleeve: "#2b2b33", skin: "#c98d68" },
    { id: "male-d", name: "Mr. Fancy", model: "character-male-d", cost: 150, sleeve: "#23232b", skin: null }
  ],
  hats: [
    { id: "none", name: "No Hat", cost: 0 },
    { id: "straw", name: "Straw Hat", cost: 15 },
    { id: "cap", name: "Red Cap", cost: 20 },
    { id: "cowboy", name: "Cowboy Hat", cost: 45 },
    { id: "party", name: "Party Hat", cost: 50 },
    { id: "chef", name: "Chef Hat", cost: 60 },
    { id: "beanie", name: "Propeller Beanie", cost: 80 },
    { id: "tophat", name: "Top Hat", cost: 100 },
    { id: "viking", name: "Viking Helmet", cost: 140 },
    { id: "crown", name: "Golden Crown", cost: 300 }
  ],
  faces: [
    { id: "none", name: "No Glasses", cost: 0 },
    { id: "glasses", name: "Reading Glasses", model: "aid-glasses", cost: 25 },
    { id: "sunglasses", name: "Cool Shades", model: "aid-sunglasses", cost: 60 }
  ],
  gloves: [
    { id: "none", name: "Bare Hands", cost: 0 },
    { id: "work", name: "Work Gloves", color: "#8a5a2b", cost: 20 },
    { id: "rubber", name: "Rubber Gloves", color: "#f2d23a", cost: 30 },
    { id: "ninja", name: "Ninja Gloves", color: "#26262e", cost: 50 },
    { id: "gold", name: "Golden Gloves", color: "#e8b923", cost: 150 }
  ],
  paints: [
    { id: "classic", name: "Classic", wood: 0x9a6634, metal: 0xc9ced8, body: 0xe05cb0, cost: 0 },
    { id: "candy", name: "Candy Cane", wood: 0xff4d6d, metal: 0xffffff, body: 0xff8fb1, cost: 40 },
    { id: "frost", name: "Frost", wood: 0x9fd8ff, metal: 0xe8fbff, body: 0x5ec8ff, cost: 60 },
    { id: "midnight", name: "Midnight", wood: 0x2b2440, metal: 0x9a6cff, body: 0x4b2c8a, cost: 80 },
    { id: "lava", name: "Lava", wood: 0x3a1a10, metal: 0xff6a00, body: 0xff3b1f, cost: 120 },
    { id: "golden", name: "Solid Gold", wood: 0xd4a017, metal: 0xffd700, body: 0xffc93c, cost: 250 }
  ]
};
