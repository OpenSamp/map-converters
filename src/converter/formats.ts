// Object/vehicle format definitions ported from convertFFS.js / PHP backend.
// Each entry pairs a display name with a detection regex (for auto-detection of input
// format from the raw text), the *default output* format name to switch to when this
// input is detected, and the format-string template using {model},{x},{y},{z},...
// placeholders that the converter understands.

export type FormatKind = "object" | "vehicle" | "removal";

export interface FormatDef {
  name: string;
  detect: RegExp;
  defaultOutput: string;
  template: string;
}

export const NO_CONVERT_OBJECT = "Don't convert objects";
export const NO_CONVERT_VEHICLE = "Don't convert vehicles";
export const NO_CONVERT_REMOVAL = "Don't convert removals";
export const NO_CONVERT_TOKEN = "~NO~CONVERT~";
export const NOT_FOUND_TOKEN = "~NOT~FOUND~";

// MTA's `<removeWorldObject ... />` element (modern MTA editor / MTA 1.x map files).
// Lowercased to match the rest of the matcher's casing convention.
export const MTA_REMOVAL_TEMPLATE =
  '<removeworldobject model="{model}" posx="{x}" posy="{y}" posz="{z}" radius="{radius}" interior="{int}" />';

// VS CSV — the canonical intermediate format. XML pre-flatten emits this same shape
// before handing off to the regex matcher, so picking "VS CSV" round-trips cleanly.
// Each kind is one line prefixed by OBJ, / VEH, / RWO, so the three streams can
// share a single document.
export const CSV_OBJECT_TEMPLATE =
  "OBJ,{model},{x},{y},{z},{rx},{ry},{rz},{int},{vw},{comment}";
export const CSV_VEHICLE_TEMPLATE =
  "VEH,{model},{x},{y},{z},{r},{c1},{c2},{respawn},{comment}";
export const CSV_REMOVAL_TEMPLATE =
  "RWO,{model},{x},{y},{z},{radius},{int},{comment}";

// GTA:SA singleplayer IPL `inst` line. Rotation is stored as quaternion (qx,qy,qz,qw)
// — Output computes those from rx/ry/rz at render time (see quaternion.ts), and Input
// expands them back into Euler if the line is read back in. The trailing `-1` is the
// LOD index and is hard-coded since vs-converter doesn't generate LODs.
export const IPL_OBJECT_TEMPLATE =
  "{model}, dummy, {int}, {x}, {y}, {z}, {qx}, {qy}, {qz}, {qw}, -1";

export const objectFormats: FormatDef[] = [
  {
    name: "SA-MP CreateObject",
    detect: /CreateObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "Incognito's Streamer Plugin",
    template: "CreateObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "MTA 1.0 / 1.6 Object",
    // Accepts both self-closing (`<object ... />`, MTA 1.0/1.5) and paired tags
    // (`<object ...></object>`, MTA 1.6+ from the Map Editor with extra metadata).
    // Requires a posX/posY attribute to avoid matching MTA Race objects that use
    // `<position>` child elements instead of attributes.
    detect: /<object\b[^>]*\bpos[xX]\s*=/i,
    defaultOutput: "SA-MP CreateObject",
    template:
      '<object id="{comment}" model="{model}" posX="{x}" posY="{y}" posZ="{z}" rotX="{rx}" rotY="{ry}" rotZ="{rz}" dimension="{vw}" interior="{int}" />',
  },
  {
    name: "MTA Race Object",
    // Race format uses children: <object name="..."><position>...</position>...</object>
    detect: /<object\b[^>]*>\s*<position\b/i,
    defaultOutput: "SA-MP CreateObject",
    template:
      '<object name="{comment}"><position>{x} {y} {z}</position><rotation>{rz} {ry} {rx}</rotation><model>{model}</model></object>',
  },
  {
    name: "Incognito's Streamer Plugin",
    detect: /CreateDynamicObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateDynamicObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "YSI CreateDynamicObject",
    detect: /CreateDynamicObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateDynamicObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "MTA 1.0 / 1.6 createObject",
    detect: /createObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\)/,
    defaultOutput: "SA-MP CreateObject",
    template: "createObject({model},{x},{y},{z},{rx},{ry},{rz}){comment}",
  },
  {
    name: "xObjects v1",
    detect: /\{([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\}/,
    defaultOutput: "SA-MP CreateObject",
    template: "{{model},{x},{y},{z},{rx},{ry},{rz},{dd}},{comment}",
  },
  {
    name: "xStreamer",
    detect: /CreateStreamedObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateStreamedObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "Einstein's Object Streamer",
    detect: /CreateObjectToStream\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateObjectToStream({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "MidoStream Object Streamer",
    detect: /CreateStreamObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateStreamObject({model},{x},{y},{z},{rx},{ry},{rz},{dd});{comment}",
  },
  {
    name: "Double-O-Objects",
    detect: /CreateStreamObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateStreamObject({model},{x},{y},{z},{rx},{ry},{rz},{dd},{vw});{comment}",
  },
  {
    name: "Fallout's Object Streamer",
    detect: /F_CreateObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "F_CreateObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "tAxI's Streamer Systems",
    detect: /CreateStreamObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateStreamObject({model},{x},{y},{z},{rx},{ry},{rz},{dd});{comment}",
  },
  {
    name: "rStreamer",
    detect: /CreateStreamedObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateStreamedObject({model},{x},{y},{z},{rx},{ry},{rz},{dd});{comment}",
  },
  {
    name: "pObjectStreams",
    detect: /CreateDynamicObject\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateObject",
    template: "CreateDynamicObject({model},{x},{y},{z},{rx},{ry},{rz});{comment}",
  },
  {
    name: "Medit",
    detect: /([0-9 ]+) ([0-9. -]+) ([0-9. -]+) ([0-9. -]+) ([0-9. -]+) ([0-9. -]+) ([0-9. -]+) E/,
    defaultOutput: "Incognito's Streamer Plugin",
    template: "{model} {x} {y} {z} {rx} {ry} {rz} E",
  },
  {
    name: "Westie's SMD Streamer",
    detect: /([0-9]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+)/,
    defaultOutput: "Incognito's Streamer Plugin",
    template: "{model} {x} {y} {z} {rx} {ry} {rz} {dd}",
  },
  {
    name: "VS CSV Object",
    detect: /^obj,/im,
    defaultOutput: "Incognito's Streamer Plugin",
    template: CSV_OBJECT_TEMPLATE,
  },
  {
    name: "GTA:SA IPL inst",
    // Detects the `inst` block opener or a typical instance line:
    //   <model>, dummy, <interior>, <x>, <y>, <z>, <qx>, <qy>, <qz>, <qw>, -1
    detect: /(^|\n)\s*(inst|\d+\s*,\s*dummy\s*,\s*-?\d+\s*,)/i,
    defaultOutput: "Incognito's Streamer Plugin",
    template: IPL_OBJECT_TEMPLATE,
  },
];

export const vehicleFormats: FormatDef[] = [
  {
    name: "MTA Race Spawnpoint",
    detect: /<spawnpoint\b[^>]*>[\s\S]*?<\/spawnpoint>/i,
    defaultOutput: "SA-MP AddStaticVehicleEx",
    template:
      '<spawnpoint name="{comment}"><vehicle>{model}</vehicle><position>{x} {y} {z}</position><rotation>{r}</rotation></spawnpoint>',
  },
  {
    name: "MTA 1.0 / 1.6 Vehicle",
    detect: /<vehicle\b[^>]*\bpos[xX]\s*=/i,
    defaultOutput: "SA-MP AddStaticVehicleEx",
    template:
      '<vehicle model="{model}" posX="{x}" posY="{y}" posZ="{z}" rotX="{rx}" rotY="{ry}" rotZ="{r}" color="{c1},{c2}" />',
  },
  {
    name: "SA-MP AddStaticVehicleEx",
    detect: /AddStaticVehicleEx\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9 -]+),([0-9 ]+)\);/,
    defaultOutput: "SA-MP CreateVehicle",
    template: "AddStaticVehicleEx({model},{x},{y},{z},{r},{c1},{c2},{respawn});{comment}",
  },
  {
    name: "SA-MP CreateVehicle",
    detect: /CreateVehicle\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9 -]+),([0-9 ]+)\);/,
    defaultOutput: "SA-MP AddStaticVehicleEx",
    template: "CreateVehicle({model},{x},{y},{z},{r},{c1},{c2},{respawn});{comment}",
  },
  {
    name: "SA-MP AddStaticVehicle",
    detect: /AddStaticVehicle\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9 -]+)\);/,
    defaultOutput: "SA-MP CreateVehicle",
    template: "AddStaticVehicle({model},{x},{y},{z},{r},{c1},{c2});{comment}",
  },
  {
    name: "Double-O-Vehicles",
    detect: /CreateStreamVehicle\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateVehicle",
    template: "CreateStreamVehicle({model},{x},{y},{z},{r},{c1},{c2},{respawn});{comment}",
  },
  {
    name: "tAxI's Streamer Systems",
    detect: /CreateStreamVehicle\(([0-9 ]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP CreateVehicle",
    template: "CreateStreamVehicle({model},{x},{y},{z},{r},{c1},{c2});{comment}",
  },
  {
    name: "VS CSV Vehicle",
    detect: /^veh,/im,
    defaultOutput: "SA-MP AddStaticVehicleEx",
    template: CSV_VEHICLE_TEMPLATE,
  },
];

export const removalFormats: FormatDef[] = [
  {
    name: "MTA removeWorldObject",
    // Match both self-closing and paired forms. MTA 1.6 emits paired tags with
    // additional Map Editor metadata attributes.
    detect: /<removeworldobject\b[^>]*>/i,
    defaultOutput: "SA-MP RemoveBuildingForPlayer",
    template: MTA_REMOVAL_TEMPLATE,
  },
  {
    name: "SA-MP RemoveBuildingForPlayer",
    detect:
      /RemoveBuildingForPlayer\(\s*[A-Za-z0-9_]+\s*,\s*([0-9 -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+),([0-9. -]+)\);/,
    defaultOutput: "SA-MP RemoveBuildingForPlayer",
    template:
      "RemoveBuildingForPlayer(playerid, {model}, {x}, {y}, {z}, {radius});{comment}",
  },
  {
    name: "VS CSV Removal",
    detect: /^rwo,/im,
    defaultOutput: "SA-MP RemoveBuildingForPlayer",
    template: CSV_REMOVAL_TEMPLATE,
  },
];

export function getRemovalTemplate(name: string): string {
  if (name === NO_CONVERT_REMOVAL) return NO_CONVERT_TOKEN;
  const f = removalFormats.find((x) => x.name === name);
  return f ? f.template : NOT_FOUND_TOKEN;
}

// A "family" bundles object/vehicle/removal sub-formats under one name so the user
// only picks one input and one output. A missing kind means "don't convert that kind".
export interface FormatFamily {
  name: string;
  object?: string;
  vehicle?: string;
  removal?: string;
}

export const AUTODETECT_NAME = "Autodetect";

export const families: FormatFamily[] = [
  {
    name: "SA-MP CreateObject",
    object: "SA-MP CreateObject",
    vehicle: "SA-MP AddStaticVehicleEx",
    removal: "SA-MP RemoveBuildingForPlayer",
  },
  {
    name: "SA-MP AddStaticVehicle",
    vehicle: "SA-MP AddStaticVehicle",
  },
  {
    name: "SA-MP CreateVehicle",
    object: "SA-MP CreateObject",
    vehicle: "SA-MP CreateVehicle",
  },
  {
    name: "Incognito's Streamer Plugin",
    object: "Incognito's Streamer Plugin",
    vehicle: "SA-MP AddStaticVehicleEx",
    removal: "SA-MP RemoveBuildingForPlayer",
  },
  {
    name: "YSI CreateDynamicObject",
    object: "YSI CreateDynamicObject",
    vehicle: "SA-MP AddStaticVehicleEx",
  },
  {
    name: "MTA 1.0 / 1.6",
    object: "MTA 1.0 / 1.6 Object",
    vehicle: "MTA 1.0 / 1.6 Vehicle",
    removal: "MTA removeWorldObject",
  },
  {
    name: "MTA Race",
    object: "MTA Race Object",
    vehicle: "MTA Race Spawnpoint",
  },
  {
    name: "MTA 1.x createObject (Lua)",
    object: "MTA 1.0 / 1.6 createObject",
  },
  { name: "xObjects v1", object: "xObjects v1" },
  { name: "xStreamer", object: "xStreamer" },
  { name: "Einstein's Object Streamer", object: "Einstein's Object Streamer" },
  { name: "MidoStream Object Streamer", object: "MidoStream Object Streamer" },
  {
    name: "Double-O",
    object: "Double-O-Objects",
    vehicle: "Double-O-Vehicles",
  },
  { name: "Fallout's Object Streamer", object: "Fallout's Object Streamer" },
  {
    name: "tAxI's Streamer Systems",
    object: "tAxI's Streamer Systems",
    vehicle: "tAxI's Streamer Systems",
  },
  { name: "rStreamer", object: "rStreamer" },
  { name: "pObjectStreams", object: "pObjectStreams" },
  { name: "Medit", object: "Medit" },
  { name: "Westie's SMD Streamer", object: "Westie's SMD Streamer" },
  {
    name: "VS CSV (intermediate)",
    object: "VS CSV Object",
    vehicle: "VS CSV Vehicle",
    removal: "VS CSV Removal",
  },
  {
    name: "GTA:SA IPL",
    // IPL is objects-only — no vehicle or removal kind exists in the format.
    object: "GTA:SA IPL inst",
  },
];

export interface ResolvedFormats {
  object: string;
  vehicle: string;
  removal: string;
  detectedNotes?: string[];
}

// Resolves a chosen family (or "Autodetect") into the three concrete template strings
// that convert.ts expects. For Autodetect we run each kind's detector regexes against
// the raw text independently, so an MTA Race file with SA-MP vehicles could in
// principle be split correctly.
export function resolveFamily(name: string, rawText = ""): ResolvedFormats {
  if (name === AUTODETECT_NAME) {
    const obj = objectFormats.find((f) => f.detect.test(rawText));
    const veh = vehicleFormats.find((f) => f.detect.test(rawText));
    const rem = removalFormats.find((f) => f.detect.test(rawText));
    const notes: string[] = [];
    if (obj) notes.push(`objects = ${obj.name}`);
    if (veh) notes.push(`vehicles = ${veh.name}`);
    if (rem) notes.push(`removals = ${rem.name}`);
    return {
      object: obj ? obj.template : NO_CONVERT_TOKEN,
      vehicle: veh ? veh.template : NO_CONVERT_TOKEN,
      removal: rem ? rem.template : NO_CONVERT_TOKEN,
      detectedNotes: notes,
    };
  }

  const fam = families.find((f) => f.name === name);
  if (!fam) {
    return { object: NO_CONVERT_TOKEN, vehicle: NO_CONVERT_TOKEN, removal: NO_CONVERT_TOKEN };
  }
  return {
    object: fam.object ? getObjectTemplate(fam.object) : NO_CONVERT_TOKEN,
    vehicle: fam.vehicle ? getVehicleTemplate(fam.vehicle) : NO_CONVERT_TOKEN,
    removal: fam.removal ? getRemovalTemplate(fam.removal) : NO_CONVERT_TOKEN,
  };
}

export function getObjectTemplate(name: string): string {
  if (name === NO_CONVERT_OBJECT) return NO_CONVERT_TOKEN;
  const f = objectFormats.find((x) => x.name === name);
  return f ? f.template : NOT_FOUND_TOKEN;
}

export function getVehicleTemplate(name: string): string {
  if (name === NO_CONVERT_VEHICLE) return NO_CONVERT_TOKEN;
  const f = vehicleFormats.find((x) => x.name === name);
  return f ? f.template : NOT_FOUND_TOKEN;
}

export const VEHICLE_NAMES: string[] = [
  "n/a", "Landstalker", "Bravura", "Buffalo", "Linerunner", "Perrenial", "Sentinel", "Dumper",
  "Firetruck", "Trashmaster", "Stretch", "Manana", "Infernus", "Voodoo", "Pony", "Mule", "Cheetah",
  "Ambulance", "Leviathan", "Moonbeam", "Esperanto", "Taxi", "Washington", "Bobcat", "Mr Whoopee",
  "BF Injection", "Hunter", "Premier", "Enforcer", "Securicar", "Banshee", "Predator", "Bus",
  "Rhino", "Barracks", "Hotknife", "Trailer 1", "Previon", "Coach", "Cabbie", "Stallion", "Rumpo",
  "RC Bandit", "Romero", "Packer", "Monster", "Admiral", "Squalo", "Seasparrow", "Pizzaboy", "Tram",
  "Trailer 2", "Turismo", "Speeder", "Reefer", "Tropic", "Flatbed", "Yankee", "Caddy", "Solair",
  "Berkley's RC Van", "Skimmer", "PCJ-600", "Faggio", "Freeway", "RC Baron", "RC Raider",
  "Glendale", "Oceanic", "Sanchez", "Sparrow", "Patriot", "Quad", "Coastguard", "Dinghy", "Hermes",
  "Sabre", "Rustler", "ZR-350", "Walton", "Regina", "Comet", "BMX", "Burrito", "Camper", "Marquis",
  "Baggage", "Dozer", "Maverick", "News Chopper", "Rancher", "FBI Rancher", "Virgo", "Greenwood",
  "Jetmax", "Hotring", "Sandking", "Blista Compact", "Police Maverick", "Boxville", "Benson",
  "Mesa", "RC Goblin", "Hotring Racer A", "Hotring Racer B", "Bloodring Banger", "Rancher",
  "Super GT", "Elegant", "Journey", "Bike", "Mountain Bike", "Beagle", "Cropdust", "Stunt",
  "Tanker", "Roadtrain", "Nebula", "Majestic", "Buccaneer", "Shamal", "Hydra", "FCR-900",
  "NRG-500", "HPV1000", "Cement Truck", "Tow Truck", "Fortune", "Cadrona", "FBI Truck", "Willard",
  "Forklift", "Tractor", "Combine", "Feltzer", "Remington", "Slamvan", "Blade", "Freight", "Streak",
  "Vortex", "Vincent", "Bullet", "Clover", "Sadler", "Firetruck LA", "Hustler", "Intruder",
  "Primo", "Cargobob", "Tampa", "Sunrise", "Merit", "Utility", "Nevada", "Yosemite", "Windsor",
  "Monster A", "Monster B", "Uranus", "Jester", "Sultan", "Stratum", "Elegy", "Raindance",
  "RC Tiger", "Flash", "Tahoma", "Savanna", "Bandito", "Freight Flat", "Streak Carriage", "Kart",
  "Mower", "Duneride", "Sweeper", "Broadway", "Tornado", "AT-400", "DFT-30", "Huntley", "Stafford",
  "BF-400", "Newsvan", "Tug", "Trailer 3", "Emperor", "Wayfarer", "Euros", "Hotdog", "Club",
  "Freight Carriage", "Trailer 3", "Andromada", "Dodo", "RC Cam", "Launch", "Police Car (LSPD)",
  "Police Car (SFPD)", "Police Car (LVPD)", "Police Ranger", "Picador", "S.W.A.T. Van", "Alpha",
  "Phoenix", "Glendale", "Sadler", "Luggage Trailer A", "Luggage Trailer B", "Stair Trailer",
  "Boxville", "Farm Plow", "Utility Trailer",
];
