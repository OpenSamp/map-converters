import { quaternionToEulerDeg } from "./quaternion";

// Port of php/input.php. Parses each input line according to a placeholder format
// (e.g. `CreateObject({model},{x},{y},{z},...)`) and returns a key->value map.
//
// Algorithm (matches PHP behavior):
//   1. Replace placeholders like {model} in the format with marker strings
//      `model<DEL2><DEL1>` so we can later reconstruct (key, captured-value) pairs.
//   2. Build a regex from the format by escaping it then replacing each placeholder
//      with `(.*?)`.
//   3. Match the input line; the captured groups are the actual values.
//   4. Substitute each captured value into the marker string, replacing one DEL1
//      per value, then re-run the regex on the marker string. The capture groups
//      now look like `model<DEL2>1337` — split on DEL2 to recover (key, value).

const DEL1 = "\x01";
const DEL2 = "\x02";
const IGNORE = "\x03";

const PLACEHOLDER_KEYS = [
  "model", "x", "y", "z", "rx", "ry", "rz", "id", "dd", "respawn",
  "c1", "c2", "r", "vw", "int", "pid", "comment", "radius",
  "qx", "qy", "qz", "qw",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOnce(haystack: string, needle: string, replace: string): string {
  const i = haystack.indexOf(needle);
  if (i < 0) return haystack;
  return haystack.slice(0, i) + replace + haystack.slice(i + needle.length);
}

export type RotationConversion = "none" | "toEulers" | "toRadians";

export interface ParsedLine {
  isObject?: boolean;
  isRemoval?: boolean;
  count: number;
  model?: string;
  x?: string;
  y?: string;
  z?: string;
  rx?: string;
  ry?: string;
  rz?: string;
  id?: string;
  dd?: string;
  respawn?: string;
  c1?: string;
  c2?: string;
  r?: string;
  vw?: string;
  int?: string;
  pid?: string;
  comment?: string;
  radius?: string;
  qx?: string;
  qy?: string;
  qz?: string;
  qw?: string;
}

export class Input {
  private objectRegex: string = "NaN";
  private vehicleRegex: string = "NaN";
  private removalRegex: string = "NaN";
  private objectMarkerFormat: string = "NaN";
  private vehicleMarkerFormat: string = "NaN";
  private removalMarkerFormat: string = "NaN";
  private rotationConversion: RotationConversion = "none";

  setRotationConversion(rc: RotationConversion): void {
    this.rotationConversion = rc;
  }

  processRawInput(raw: string): string[] {
    let s = raw.replace(/[\r\t\x0B]/g, "");
    s = s.toLowerCase();
    return s.split("\n");
  }

  setObjectFormat(fmt: string): void {
    const r = this.prepareFormat(fmt);
    this.objectRegex = r.regex;
    this.objectMarkerFormat = r.markerFormat;
  }

  setVehicleFormat(fmt: string): void {
    const r = this.prepareFormat(fmt);
    this.vehicleRegex = r.regex;
    this.vehicleMarkerFormat = r.markerFormat;
  }

  setRemovalFormat(fmt: string): void {
    const r = this.prepareFormat(fmt);
    this.removalRegex = r.regex;
    this.removalMarkerFormat = r.markerFormat;
  }

  private prepareFormat(fmt: string): { regex: string; markerFormat: string } {
    if (fmt === "~NOT~FOUND~" || fmt === "~NO~CONVERT~") {
      return { regex: IGNORE, markerFormat: IGNORE };
    }
    let f = fmt.replace(/[\r\t\x0B]/g, "").toLowerCase();
    f = replaceOnce(f, " (", "(");
    f = replaceOnce(f, " )", ")");
    f = f.replace(/ ,/g, ",");

    let markerFormat = f;
    for (const key of PLACEHOLDER_KEYS) {
      markerFormat = markerFormat.split("{" + key + "}").join(key + DEL2 + DEL1);
    }

    const placeholderPattern = new RegExp(`\\\\\\{(${PLACEHOLDER_KEYS.join("|")})\\\\\\}`, "g");
    const escaped = escapeRegex(f);
    const regex = escaped.replace(placeholderPattern, "(.*?)");

    return { regex, markerFormat };
  }

  processLine(inputLine: string): ParsedLine | null {
    const obj = this.processLineForObjects(inputLine);
    if (obj && obj.count > 0) return obj;
    const rem = this.processLineForRemovals(inputLine);
    if (rem && rem.count > 0) return rem;
    const veh = this.processLineForVehicles(inputLine);
    if (veh && veh.count > 0) return veh;
    return null;
  }

  private processLineForObjects(line: string): ParsedLine | null {
    if (this.objectRegex === IGNORE) return null;
    let s = line.trim();
    s = replaceOnce(s, " (", "(");
    s = replaceOnce(s, " )", ")");
    s = s.replace(/ ,/g, ",");

    const result: ParsedLine = { isObject: true, count: 0 };
    const fetched = this.fetch(s, this.objectRegex);
    result.count = fetched.length;
    if (fetched.length === 0) return result;

    let marker = this.objectMarkerFormat;
    for (const v of fetched) marker = replaceOnce(marker, DEL1, v);

    const pairs = this.fetch(marker, this.objectRegex);
    for (const pair of pairs) {
      const [key, value] = pair.split(DEL2);
      if (key !== undefined && value !== undefined) {
        (result as unknown as Record<string, unknown>)[key] = value.trim();
      }
    }

    if (this.rotationConversion === "toEulers") {
      result.rx = String(rad2deg(toNum(result.rx)));
      result.ry = String(rad2deg(toNum(result.ry)));
      result.rz = String(rad2deg(toNum(result.rz)));
    } else if (this.rotationConversion === "toRadians") {
      result.rx = String(deg2rad(toNum(result.rx)));
      result.ry = String(deg2rad(toNum(result.ry)));
      result.rz = String(deg2rad(toNum(result.rz)));
    }

    // If the input format captured a quaternion (e.g. IPL `inst` lines), expand it
    // into Euler degrees so downstream output formats can render any rotation field.
    if (
      result.qx !== undefined && result.qy !== undefined &&
      result.qz !== undefined && result.qw !== undefined &&
      result.rx === undefined
    ) {
      const [rx, ry, rz] = quaternionToEulerDeg(
        toNum(result.qx), toNum(result.qy),
        toNum(result.qz), toNum(result.qw),
      );
      result.rx = String(rx);
      result.ry = String(ry);
      result.rz = String(rz);
    }

    return result;
  }

  private processLineForRemovals(line: string): ParsedLine | null {
    if (this.removalRegex === IGNORE) return null;
    let s = line.trim();
    s = replaceOnce(s, " (", "(");
    s = replaceOnce(s, " )", ")");
    s = s.replace(/ ,/g, ",");

    const result: ParsedLine = { isRemoval: true, count: 0 };
    const fetched = this.fetch(s, this.removalRegex);
    result.count = fetched.length;
    if (fetched.length === 0) return result;

    let marker = this.removalMarkerFormat;
    for (const v of fetched) marker = replaceOnce(marker, DEL1, v);

    const pairs = this.fetch(marker, this.removalRegex);
    for (const pair of pairs) {
      const [key, value] = pair.split(DEL2);
      if (key !== undefined && value !== undefined) {
        (result as unknown as Record<string, unknown>)[key] = value.trim();
      }
    }

    return result;
  }

  private processLineForVehicles(line: string): ParsedLine | null {
    if (this.vehicleRegex === IGNORE) return null;
    let s = line.trim();
    s = replaceOnce(s, " (", "(");
    s = replaceOnce(s, " )", ")");
    s = s.replace(/ ,/g, ",");

    const result: ParsedLine = { count: 0 };
    const fetched = this.fetch(s, this.vehicleRegex);
    result.count = fetched.length;
    if (fetched.length === 0) return result;

    let marker = this.vehicleMarkerFormat;
    for (const v of fetched) marker = replaceOnce(marker, DEL1, v);

    const pairs = this.fetch(marker, this.vehicleRegex);
    for (const pair of pairs) {
      const [key, value] = pair.split(DEL2);
      if (key !== undefined && value !== undefined) {
        (result as unknown as Record<string, unknown>)[key] = value.trim();
      }
    }

    return result;
  }

  private fetch(line: string, pattern: string): string[] {
    const re = new RegExp("^" + pattern + "$");
    const m = line.match(re);
    if (!m) return [];
    return m.slice(1);
  }
}

function toNum(v: string | undefined): number {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}
function rad2deg(r: number): number {
  return (r * 180) / Math.PI;
}
function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}
