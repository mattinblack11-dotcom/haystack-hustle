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
  { id: "tnt", name: "Dynamite", key: "3", unlock: 150, minLevel: 1, icon: "&#129512;" },
  { id: "vac", name: "Vacuum", key: "4", unlock: 600, minLevel: 3, icon: "&#127744;" },
  { id: "tornado", name: "Hay Tornado", key: "5", unlock: 2500, icon: "&#127786;", rb: 1 },
  { id: "hole", name: "Black Hole", key: "6", unlock: 12000, icon: "&#127761;", rb: 2 }
];

HH.BAG_TIERS = [ { cap: 80, cost: 0 }, { cap: 160, cost: 12 }, { cap: 280, cost: 36 }, { cap: 460, cost: 95 }, { cap: 720, cost: 240 }, { cap: 1100, cost: 560 }, { cap: 1700, cost: 1250 }, { cap: 2600, cost: 2700 }, { cap: 3800, cost: 5600 }, { cap: 5500, cost: 11500 }, { cap: 8000, cost: 23000 }, { cap: 11500, cost: 45000 }, { cap: 16000, cost: 88000 }, { cap: 22000, cost: 170000 }, { cap: 30000, cost: 320000 } ];

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
  { id: "tshovel", group: "Hand Tools", name: "Toy Shovel", desc: "A little plastic shovel. +2 hay per grab", base: 0.064, grow: 1, max: 1 },
  { id: "shovel", group: "Hand Tools", name: "Steel Shovel", desc: "A real shovel. +4 hay per grab", base: 1.03, grow: 1, max: 1 },
  { id: "bucket", group: "Hand Tools", name: "Hay Bucket", desc: "Scoop hay into a bucket. +6 hay per grab", base: 3.1, grow: 1, max: 1 },
  { id: "bigbucket", group: "Hand Tools", name: "Bigger Bucket", desc: "+3 hay per grab", base: 2, grow: 1.7, max: 6 },
  { id: "barrow", group: "Hand Tools", name: "Wheelbarrow", desc: "Shovel straight into a wheelbarrow. +10 hay per grab", base: 11.5, grow: 1, max: 1 },
  { id: "belt", group: "Machines", name: "Conveyor Belt", desc: "Sells 3 hay per second from your bag while you work (90% price)", base: 5, grow: 1.7, max: 8 },
  { id: "rake", group: "Machines", name: "Hay Rake Tractor", desc: "+12% pitchfork scoop size", base: 45, grow: 1.8, max: 5 },
  { id: "arm", group: "Machines", name: "Robot Arm", desc: "Builds a robot arm by the stack that digs hay into your bag", base: 25, grow: 1.9, max: 5 },
  { id: "armspd", group: "Machines", name: "Arm Speed", desc: "Robot arms dig 25% faster", base: 60, grow: 1.8, max: 6 },
  { id: "armreach", group: "Machines", name: "Long-Reach Arm", desc: "Robot arms reach deeper and grab 50% more per scoop", base: 120, grow: 1.9, max: 4 },
  { id: "generator", group: "Machines", name: "Hay Generator", desc: "Burns spare straw to power machines: belts and arms work 20% faster", base: 300, grow: 2, max: 4 },
  { id: "wrapper", group: "Processing", name: "Bale Wrapper", desc: "Wrap hay into bales before selling: +8% hay value", base: 40, grow: 1.8, max: 5 },
  { id: "pellet", group: "Processing", name: "Pellet Mill", desc: "Press hay into feed pellets: +10% hay value", base: 150, grow: 1.9, max: 5 },
  { id: "brick", group: "Processing", name: "Eco Brick Press", desc: "Turn hay into building bricks: +12% hay value", base: 500, grow: 1.9, max: 5 },
  { id: "paper", group: "Processing", name: "Hay Paper Machine", desc: "Make paper out of hay: +15% hay value", base: 1500, grow: 2, max: 5 },
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
  { id: "compass", group: "Needle Hunting", name: "Needle Compass", desc: "Once 55% of the stack is cleared, a compass points toward the needle", base: 300, grow: 1, max: 1 },
  { id: "hsize", group: "Black Hole", tool: "hole", name: "Event Horizon", desc: "Black hole swallows a bigger area", base: 300, grow: 1.8, max: 5 },
  { id: "hcool", group: "Black Hole", tool: "hole", name: "Hawking Radiation", desc: "15% shorter black hole cooldown", base: 300, grow: 1.8, max: 5 },
  { id: "sharp", group: "Packed Hay", minLevel: 1, name: "Sharpened Tools", desc: "Every tool cuts through packed hay better (-10% hay density per level)", base: 30, grow: 1.9, max: 6 },
  { id: "loosen", group: "Packed Hay", minLevel: 4, name: "Hay Loosener", desc: "Spray the stack so packed hay crumbles (-8% hay density per level)", base: 350, grow: 2, max: 4 },
  { id: "compress", group: "Late Game", minLevel: 3, name: "Hay Compressor", desc: "Squish hay so your bag holds 25% more", base: 120, grow: 1.9, max: 5 },
  { id: "drill", group: "Late Game", minLevel: 3, name: "Diamond Drill", desc: "+4% chance any grab digs up a bonus gem", base: 150, grow: 1.9, max: 5 },
  { id: "autosell", group: "Late Game", minLevel: 4, name: "Auto-Seller", desc: "Your bag sells itself the moment it's full (10% fee)", base: 400, grow: 1, max: 1 },
  { id: "megafork", group: "Late Game", minLevel: 4, tool: "fork", name: "Mega Fork", desc: "Pitchfork scoops 40% more hay", base: 250, grow: 2, max: 4 },
  { id: "turbovac", group: "Late Game", minLevel: 5, tool: "vac", name: "Turbo Vacuum", desc: "+50% suction and cools twice as fast", base: 500, grow: 2, max: 3 },
  { id: "stormcall", group: "Late Game", minLevel: 6, name: "Storm Caller", desc: "Hay Storms happen twice as often", base: 800, grow: 1, max: 1 },
  { id: "nuke", group: "Late Game", minLevel: 6, tool: "tnt", name: "Nuke-a-mite", desc: "Every 4th dynamite is a MEGA blast", base: 900, grow: 1, max: 1 },
  { id: "harvest", group: "Late Game", minLevel: 8, name: "Golden Harvest", desc: "All hay is worth +25% more", base: 1500, grow: 2.2, max: 3 },
  { id: "nmagnet", group: "Late Game", minLevel: 8, name: "Needle Magnet", desc: "The needle rips itself out of the hay when you get within 3m", base: 2500, grow: 1, max: 1 },
  { id: "baler", group: "Late Game", minLevel: 5, name: "Hay Baler", desc: "Bale your hay before selling: +10% hay value per level", base: 2000, grow: 1.8, max: 8 },
  { id: "megabag", group: "Late Game", minLevel: 6, name: "Mega Bag", desc: "+20% bag space per level", base: 1500, grow: 1.9, max: 8 },
  { id: "gemmag", group: "Late Game", minLevel: 7, name: "Gem Magnet", desc: "+10% gems from every needle per level", base: 3000, grow: 2, max: 5 },
  { id: "qgrab", group: "Late Game", minLevel: 9, name: "Quantum Grab", desc: "Hand grabs take +30% more hay per level", base: 4000, grow: 1.9, max: 6 },
  { id: "thermite", group: "Late Game", minLevel: 9, tool: "tnt", name: "Thermite Sticks", desc: "+15% blast radius per level", base: 5000, grow: 1.9, max: 6 },
  { id: "ovac", group: "Late Game", minLevel: 10, tool: "vac", name: "Overclocked Vacuum", desc: "+20% suction per level", base: 6000, grow: 1.9, max: 6 },
  { id: "stormmag", group: "Late Game", minLevel: 11, name: "Storm Magnet", desc: "Hay Storms last 30% longer per level", base: 8000, grow: 2, max: 4 },
  { id: "goldfork", group: "Late Game", minLevel: 12, tool: "fork", name: "Golden Pitchfork", desc: "Pitchfork scoops 25% more hay per level", base: 9000, grow: 1.9, max: 6 },
  { id: "vip", group: "Late Game", minLevel: 13, name: "Bjorn's VIP Card", desc: "+8% sell price per level", base: 12000, grow: 2, max: 6 },
  { id: "lore", group: "Late Game", minLevel: 15, name: "Ancient Hay Lore", desc: "Packed hay gets 6% looser per level", base: 20000, grow: 2, max: 5 },
  { id: "cosmic", group: "Late Game", minLevel: 15, tool: "hole", name: "Cosmic Black Hole", desc: "Black hole swallows 25% more per level", base: 25000, grow: 2, max: 5 },
  { id: "warp", group: "Late Game", minLevel: 18, name: "Time Warp", desc: "Every tool cooldown is 5% shorter per level", base: 40000, grow: 2, max: 6 },
  { id: "pockets", group: "Late Game", minLevel: 20, name: "Infinite Pockets", desc: "+50% bag space per level", base: 60000, grow: 2.2, max: 5 },
  { id: "tycoon", group: "Late Game", minLevel: 25, name: "Hay Tycoon", desc: "+10% to ALL hay income per level", base: 100000, grow: 1.5, max: 8 },
  { id: "dblj", group: "Gadgets", minLevel: 2, name: "Double Jump Boots", desc: "Press Space again in mid-air to jump a second time", base: 250, grow: 1, max: 1 },
  { id: "jetpack", group: "Gadgets", minLevel: 3, name: "Jetpack", desc: "Hold Space in the air to fly! Fuel refills when you land", base: 900, grow: 1, max: 1 },
  { id: "jfuel", group: "Gadgets", req: "jetpack", name: "Bigger Fuel Tank", desc: "+40% jetpack fuel per level", base: 350, grow: 1.8, max: 6 },
  { id: "jthrust", group: "Gadgets", req: "jetpack", name: "Jet Thrusters", desc: "Fly up faster and steer quicker", base: 450, grow: 1.8, max: 5 },
  { id: "jrefuel", group: "Gadgets", req: "jetpack", name: "Quick Refuel", desc: "Fuel refills 30% faster per level", base: 400, grow: 1.8, max: 5 },
  { id: "hayboard", group: "Gadgets", minLevel: 6, name: "Hay Hoverboard", desc: "Sprinting is 20% faster per level and never tires", base: 2500, grow: 1.9, max: 5 }
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
  { id: "needlesense", name: "Needle Sense", desc: "Free Needle Radar every haystack, with +2m range.", cost: 5, icon: "&#128225;" },
  { id: "gemfountain", name: "Gem Fountain", desc: "+50% gems from everything, forever.", cost: 5, icon: "&#9970;" },
  { id: "infjet", name: "Rocket Fuel", desc: "A free Jetpack that NEVER runs out of fuel.", cost: 6, icon: "" },
  { id: "dronearmy", name: "Drone Army", desc: "+2 free Hay Drones that collect and sell for you.", cost: 6, icon: "" },
  { id: "superbag", name: "Bottomless Bag", desc: "Your bag holds DOUBLE, forever.", cost: 7, icon: "" },
  { id: "titanfork", name: "Titan Pitchfork", desc: "Pitchfork scoops twice as much hay, forever.", cost: 7, icon: "" },
  { id: "midas", name: "Midas Touch", desc: "ALL hay is worth DOUBLE, forever.", cost: 8, icon: "" },
  { id: "timelord", name: "Time Lord", desc: "Every tool cooldown is cut in HALF, forever.", cost: 9, icon: "" }
];

HH.RB_TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Cosmic"];
(function () {
  const kinds = [
    { k: "cash", name: "Coin Purse", icon: "cash", per: 0.10, txt: function (v) { return "+" + Math.round(v * 100) + "% hay money, forever"; } },
    { k: "gems", name: "Gem Pouch", icon: "gem", per: 0.10, txt: function (v) { return "+" + Math.round(v * 100) + "% gems, forever"; } },
    { k: "bag", name: "Satchel", icon: "bag", per: 0.15, txt: function (v) { return "+" + Math.round(v * 100) + "% bag space, forever"; } },
    { k: "grab", name: "Work Gloves", icon: "hand", per: 0.15, txt: function (v) { return "Hand grabs take +" + Math.round(v * 100) + "% hay, forever"; } },
    { k: "fork", name: "Pitchfork Tines", icon: "fork", per: 0.12, txt: function (v) { return "Pitchfork scoops +" + Math.round(v * 100) + "% hay, forever"; } },
    { k: "tnt", name: "Blasting Caps", icon: "tnt", per: 0.08, txt: function (v) { return "+" + Math.round(v * 100) + "% dynamite blast size, forever"; } },
    { k: "vac", name: "Turbo Fan", icon: "vac", per: 0.12, txt: function (v) { return "+" + Math.round(v * 100) + "% vacuum suction, forever"; } },
    { k: "speed", name: "Running Boots", icon: "walk", per: 0.02, txt: function (v) { return "+" + Math.round(v * 100) + "% walk speed, forever"; } },
    { k: "cd", name: "Pocket Watch", icon: "clock", per: 0.03, txt: function (v) { return "All tool cooldowns -" + Math.round(v * 100) + "%, forever"; } },
    { k: "density", name: "Hay Shears", icon: "bolt", per: 0.04, txt: function (v) { return "Packed hay is " + Math.round(v * 100) + "% looser, forever"; } }
  ];
  HH.RB_TIER_NAMES.forEach(function (tn, ti) {
    const tier = ti + 1;
    kinds.forEach(function (kd) {
      const v = +(kd.per * tier).toFixed(3);
      HH.REBIRTH_ITEMS.push({ id: "t" + tier + "_" + kd.k, name: tn + " " + kd.name, desc: kd.txt(v), cost: tier, tier: tier, fx: [kd.k, v], ic: kd.icon });
    });
  });
})();

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
  { name: "The Mega Stack", map: "mega", layout: "dome", size: 1.4, deep: true, tip: "The biggest haystack yet. Good luck!" },
  { name: "Haunted Hayride", map: "meadow", layout: "maze", size: 1.3, fog: true, mud: 6, deep: true, hard: 1, tip: "A foggy hay maze at night. Stay close to the walls!" },
  { name: "Twin Peaks", map: "mega", layout: "twin", size: 1.45, wind: true, deep: true, hard: 1, tip: "Two enormous stacks battered by wind." },
  { name: "The Hay Fortress", map: "silo", layout: "wall", size: 1.45, mud: 8, deep: true, hard: 1, tip: "Thick hay walls guard the needle. Bring dynamite!" },
  { name: "Ring of Fire", map: "mega", layout: "ring", size: 1.5, wind: true, fog: true, deep: true, hard: 2, tip: "A giant ring in a sandstorm of straw." },
  { name: "Leaning Tower", map: "silo", layout: "tower", size: 1.5, wind: true, deep: true, hard: 2, tip: "The tallest tower yet, and the wind never stops." },
  { name: "Swamp Stacks", map: "meadow", layout: "cluster", size: 1.55, mud: 14, fog: true, deep: true, hard: 2, tip: "Five huge stacks in a muddy swamp." },
  { name: "The Great Pyramid", map: "mega", layout: "pyramid", size: 1.6, mud: 6, deep: true, hard: 3, tip: "An ancient pyramid of packed hay." },
  { name: "Midnight Labyrinth", map: "meadow", layout: "maze", size: 1.55, fog: true, wind: true, deep: true, hard: 3, tip: "The biggest maze. Fog, wind and dead ends." },
  { name: "Storm Citadel", map: "silo", layout: "wall", size: 1.6, wind: true, fog: true, mud: 8, deep: true, hard: 3, tip: "Everything at once. Good luck, farmer." },
  { name: "Mount Strawmore", map: "mega", layout: "dome", size: 1.7, wind: true, deep: true, hard: 4, tip: "A mountain of hay. The needle is near the bottom." },
  { name: "Twin Titans", map: "mega", layout: "twin", size: 1.75, fog: true, mud: 10, deep: true, hard: 4, tip: "Two titanic stacks in thick fog." },
  { name: "The Final Haystack", map: "mega", layout: "cluster", size: 1.8, wind: true, fog: true, mud: 12, deep: true, hard: 5, tip: "The hardest haystack in the world. Prove you are the Hay Master!" }
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

HH.PASTRIES = [
  { id: "p_roll", name: "Cinnamon Roll", desc: "+50% hay money for 3 minutes", dur: 180, bags: 2, icon: "cash" },
  { id: "p_croissant", name: "Butter Croissant", desc: "+30% walk speed for 3 minutes", dur: 180, bags: 1, icon: "walk" },
  { id: "p_bread", name: "Hay Bread", desc: "+50% bag space for 3 minutes", dur: 180, bags: 1.5, icon: "bag" },
  { id: "p_donut", name: "Energy Donut", desc: "Tool cooldowns -30% for 2 minutes", dur: 120, bags: 2, icon: "clock" },
  { id: "p_cake", name: "Wizard Cake", desc: "Double gems from diamonds and skeletons for 5 minutes", dur: 300, gems: 40, icon: "gem" },
  { id: "p_pie", name: "Golden Pie", desc: "Your next returned needle pays DOUBLE gems", dur: 0, gems: 30, icon: "star" }
];

HH.ENCHANTS = [
  { id: "eff", name: "Efficiency", desc: "+8% dig size per level", max: 5, base: 40 },
  { id: "fortune", name: "Fortune", desc: "+10% hay money per level while you hold this tool", max: 5, base: 60 },
  { id: "haste", name: "Haste", desc: "-6% cooldown per level", max: 5, base: 50 },
  { id: "lucky", name: "Lucky", desc: "+2% chance per level to dig up a bonus gem", max: 5, base: 80 },
  { id: "slayer", name: "Slayer", desc: "+50% damage to skeletons per level", max: 3, base: 70 }
];

HH.REFORGES = [
  { id: "sturdy", name: "Sturdy", rarity: "Common", color: "#c9ced8", w: 40, fx: { size: 0.05 }, desc: "+5% dig size" },
  { id: "sharp", name: "Sharp", rarity: "Uncommon", color: "#7ff77f", w: 26, fx: { size: 0.1 }, desc: "+10% dig size" },
  { id: "swift", name: "Swift", rarity: "Rare", color: "#5cc8ff", w: 16, fx: { cd: 0.12 }, desc: "-12% cooldown" },
  { id: "golden", name: "Golden", rarity: "Epic", color: "#d38cff", w: 12, fx: { cash: 0.25 }, desc: "+25% hay money" },
  { id: "mythic", name: "Mythic", rarity: "Legendary", color: "#ffd23f", w: 6, fx: { size: 0.2, cash: 0.2, cd: 0.15 }, desc: "+20% dig size, +20% hay money, -15% cooldown" }
];
