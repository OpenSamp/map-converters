// Port of php/xml.php — pre-flattens MTA Race / MTA 1.0 XML map files into the
// shared CSV intermediate format consumed by Input. The same format is also
// user-selectable as "VS CSV".

import {
  CSV_OBJECT_TEMPLATE,
  CSV_REMOVAL_TEMPLATE,
  CSV_VEHICLE_TEMPLATE,
} from "./formats";

export const OBJECT_CUSTOM_FORMAT = CSV_OBJECT_TEMPLATE;
export const VEHICLE_CUSTOM_FORMAT = CSV_VEHICLE_TEMPLATE;
export const REMOVAL_CUSTOM_FORMAT = CSV_REMOVAL_TEMPLATE;

const MTARACE_OBJECT =
  '<object name="{comment}"><position>{x} {y} {z}</position><rotation>{rz} {ry} {rx}</rotation><model>{model}</model></object>';
const MTARACE_VEHICLE =
  '<spawnpoint name="{comment}"><vehicle>{model}</vehicle><position>{x} {y} {z}</position><rotation>{r}</rotation></spawnpoint>';
const MTA10_OBJECT =
  '<object id="{comment}" model="{model}" posx="{x}" posy="{y}" posz="{z}" rotx="{rx}" roty="{ry}" rotz="{rz}" dimension="{vw}" interior="{int}" />';
const MTA10_VEHICLE =
  '<vehicle model="{model}" posx="{x}" posy="{y}" posz="{z}" rotx="{rx}" roty="{ry}" rotz="{r}" color="{c1},{c2}" />';

function fixingInput(rawInput: string): string {
  let s = rawInput.trim().toLowerCase();
  // Match the PHP regex: keep only relevant tags so the parser stays happy.
  // Extended with `removeworldobject` for modern MTA support.
  const matches =
    s.match(/<.{0,2}?(object|position|rotation|model|spawnpoint|vehicle|removeworldobject).*>/g) ?? [];
  s = matches.join("");
  return "<mtayounoob>" + s + "</mtayounoob>";
}

function parse(s: string): Document | null {
  const dp = new DOMParser();
  const doc = dp.parseFromString(s, "text/xml");
  if (doc.querySelector("parsererror")) return null;
  return doc;
}

function attr(el: Element, name: string, fallback = ""): string {
  return el.getAttribute(name) ?? fallback;
}

export class XMLConverter {
  processMTARaceObjects(objectFormat: string, rawInput: string): string | null {
    if (objectFormat.toLowerCase() !== MTARACE_OBJECT) return null;
    const doc = parse(fixingInput(rawInput));
    if (!doc) throw new Error("XML_ERROR");

    let out = "";
    for (const obj of Array.from(doc.querySelectorAll("mtayounoob > object"))) {
      const positionEl = obj.querySelector(":scope > position");
      const rotationEl = obj.querySelector(":scope > rotation");
      const modelEl = obj.querySelector(":scope > model");
      const positionParams = padTo3((positionEl?.textContent ?? "").trim().replace(/\s+/g, " ").split(" "));
      const rotationParams = padTo3((rotationEl?.textContent ?? "").trim().replace(/\s+/g, " ").split(" "));
      const name = obj.getAttribute("name") ?? "";
      out += "OBJ,";
      out += (modelEl?.textContent ?? "") + ",";
      out += positionParams[0] + ",";
      out += positionParams[1] + ",";
      out += positionParams[2] + ",";
      // MTA Race stores rotation as Z Y X — flip back to X Y Z.
      out += rotationParams[2] + ",";
      out += rotationParams[1] + ",";
      out += rotationParams[0] + ",";
      out += "0,0," + name + "\r\n";
    }
    return out;
  }

  processMTARaceVehicles(vehicleFormat: string, rawInput: string): string | null {
    if (vehicleFormat.toLowerCase() !== MTARACE_VEHICLE) return null;
    const doc = parse(fixingInput(rawInput));
    if (!doc) throw new Error("XML_ERROR");

    let out = "";
    for (const sp of Array.from(doc.querySelectorAll("mtayounoob > spawnpoint"))) {
      const positionEl = sp.querySelector(":scope > position");
      const rotationEl = sp.querySelector(":scope > rotation");
      const vehicleEl = sp.querySelector(":scope > vehicle");
      const positionParams = padTo3((positionEl?.textContent ?? "").trim().replace(/\s+/g, " ").split(" "));
      out += "VEH,";
      out += (vehicleEl?.textContent ?? "") + ",";
      out += positionParams[0] + ",";
      out += positionParams[1] + ",";
      out += positionParams[2] + ",";
      out += (rotationEl?.textContent?.trim() ?? "0") + ",-1,-1,15,";
      out += (sp.getAttribute("name") ?? "") + "\r\n";
    }
    return out;
  }

  processMTA10Objects(objectFormat: string, rawInput: string): string | null {
    if (objectFormat.toLowerCase() !== MTA10_OBJECT) return null;
    const doc = parse(fixingInput(rawInput));
    if (!doc) throw new Error("XML_ERROR");

    let out = "";
    for (const obj of Array.from(doc.querySelectorAll("mtayounoob > object"))) {
      out += "OBJ,";
      out += attr(obj, "model") + ",";
      out += attr(obj, "posx") + ",";
      out += attr(obj, "posy") + ",";
      out += attr(obj, "posz") + ",";
      out += attr(obj, "rotx") + ",";
      out += attr(obj, "roty") + ",";
      out += attr(obj, "rotz") + ",";
      out += attr(obj, "interior") + ",";
      out += attr(obj, "dimension") + ",";
      out += attr(obj, "id") + "\r\n";
    }
    return out;
  }

  // MTA's `<removeWorldObject>` lives inside the same `<map>` as objects/vehicles in
  // both MTA Race and MTA 1.x. We trigger this whenever the user picked the modern-MTA
  // removal format as input. Returns null if no element is present so the caller can
  // skip prepending an empty block.
  processRemoveWorldObjects(rawInput: string): string | null {
    const flat = fixingInput(rawInput);
    if (flat.indexOf("<removeworldobject") < 0) return null;
    const doc = parse(flat);
    if (!doc) throw new Error("XML_ERROR");

    let out = "";
    const els = Array.from(doc.querySelectorAll("mtayounoob > removeworldobject"));
    if (els.length === 0) return null;
    for (const el of els) {
      out += "RWO,";
      out += attr(el, "model") + ",";
      out += attr(el, "posx") + ",";
      out += attr(el, "posy") + ",";
      out += attr(el, "posz") + ",";
      out += (attr(el, "radius") || "0.25") + ",";
      out += (attr(el, "interior") || "0") + ",";
      out += attr(el, "id") + "\r\n";
    }
    return out;
  }

  processMTA10Vehicles(vehicleFormat: string, rawInput: string): string | null {
    if (vehicleFormat.toLowerCase() !== MTA10_VEHICLE) return null;
    const doc = parse(fixingInput(rawInput));
    if (!doc) throw new Error("XML_ERROR");

    let out = "";
    for (const veh of Array.from(doc.querySelectorAll("mtayounoob > vehicle"))) {
      const color = (attr(veh, "color") || ",").split(",");
      const c1 = color[0] || "-1";
      const c2 = color[1] || "-1";
      out += "VEH,";
      out += attr(veh, "model") + ",";
      out += attr(veh, "posx") + ",";
      out += attr(veh, "posy") + ",";
      out += attr(veh, "posz") + ",";
      out += attr(veh, "rotz") + ",";
      out += c1 + ",";
      out += c2 + ",15,";
      out += attr(veh, "id") + "\r\n";
    }
    return out;
  }
}

function padTo3(arr: string[]): string[] {
  const out = arr.slice(0, 3);
  while (out.length < 3) out.push("0.0");
  for (let i = 0; i < 3; i++) if (!out[i]) out[i] = "0.0";
  return out;
}
