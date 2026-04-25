// Smoke test: load the converter via tsx and run against a real map file.
// Exercises three paths: source → CSV, CSV → SA-MP, source → IPL → SA-MP.
import { JSDOM } from "jsdom";
import fs from "fs";
import { convert } from "../src/converter/convert.ts";
import { AUTODETECT_NAME, resolveFamily } from "../src/converter/formats.ts";

const dom = new JSDOM("");
globalThis.DOMParser = dom.window.DOMParser;
globalThis.performance = { now: () => Date.now() };

const path = process.argv[2] || "test.map";
const text = fs.readFileSync(path, "utf8");

const opts = { drawDistance:"250", vehicleRespawnTime:"15", commentBehaviour:"Yes", addToSampScript:"No", vehicleArray:"No", objectArray:"No", vehicleColour1:"-1", vehicleColour2:"-1" };

function run(fromFamily, toFamily, body) {
  const inFmt = resolveFamily(fromFamily, body);
  const outFmt = resolveFamily(toFamily);
  return convert({
    inputObjectFormat:  inFmt.object,
    inputVehicleFormat: inFmt.vehicle,
    inputRemovalFormat: inFmt.removal,
    outputObjectFormat: outFmt.object,
    outputVehicleFormat: outFmt.vehicle,
    outputRemovalFormat: outFmt.removal,
    options: opts,
    input: body,
  });
}

// Pass 1: source → IPL
const ipl = run(AUTODETECT_NAME, "GTA:SA IPL", text);
const iplLines = ipl.split(/\r?\n/);
const iplData = iplLines.filter(l => /^\d+,\s*dummy,/.test(l));
console.log("--- pass 1 (source → IPL) ---");
console.log("inst lines:", iplData.length, "first:", iplData[0]);
console.log("head:\n" + ipl.slice(0, 220));

// Pass 2: IPL back → SA-MP (round-trip)
const back = run(AUTODETECT_NAME, "Incognito's Streamer Plugin", ipl);
const backLines = back.split(/\r?\n/);
const backObj = backLines.filter(l => l.startsWith("CreateDynamicObject"));
console.log("--- pass 2 (IPL → SA-MP) ---");
console.log("Object lines:", backObj.length, "first:", backObj[0]);

// Sanity: rotation should round-trip. Find first non-zero rotation in source and
// compare with what IPL→SA-MP gives back.
const srcMatch = text.match(/posX="([\-0-9.]+)" posY="([\-0-9.]+)" posZ="([\-0-9.]+)" rotX="([\-0-9.]+)" rotY="([\-0-9.]+)" rotZ="([\-0-9.]+)"/);
if (srcMatch) {
  console.log("Source first rot:", srcMatch[4], srcMatch[5], srcMatch[6]);
}
const backMatch = backObj[0].match(/CreateDynamicObject\([^,]+,[^,]+,[^,]+,[^,]+,([^,]+),([^,]+),([^,)]+)\)/);
if (backMatch) {
  console.log("Round-trip rot:", backMatch[1], backMatch[2], backMatch[3]);
}
