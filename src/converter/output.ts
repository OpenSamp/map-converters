// Port of php/output.php. Renders parsed lines back into a target format string.

import { CSV_OBJECT_TEMPLATE, CSV_REMOVAL_TEMPLATE, CSV_VEHICLE_TEMPLATE, IPL_OBJECT_TEMPLATE, VEHICLE_NAMES } from "./formats";
import type { ParsedLine } from "./input";
import { eulerDegToQuaternion } from "./quaternion";

export interface ConvertOptions {
  drawDistance: string;
  vehicleRespawnTime: string;
  commentBehaviour: "Yes" | "No";
  addToSampScript: "No" | "Gamemode" | "Filterscript";
  vehicleArray: string;
  objectArray: string;
  vehicleColour1: string;
  vehicleColour2: string;
}

export const DEFAULT_OPTIONS: ConvertOptions = {
  drawDistance: "250",
  vehicleRespawnTime: "15",
  commentBehaviour: "Yes",
  addToSampScript: "No",
  vehicleArray: "No",
  objectArray: "No",
  vehicleColour1: "-1",
  vehicleColour2: "-1",
};

const MTA10_OBJECT_FORMAT =
  '<object id="{comment}" model="{model}" posx="{x}" posy="{y}" posz="{z}" rotx="{rx}" roty="{ry}" rotz="{rz}" dimension="{vw}" interior="{int}" />';
const MTA10_VEHICLE_FORMAT =
  '<vehicle model="{model}" posx="{x}" posy="{y}" posz="{z}" rotx="{rx}" roty="{ry}" rotz="{r}" color="{c1},{c2}" />';
const MTARACE_OBJECT_FORMAT =
  '<object name="{comment}"><position>{x} {y} {z}</position><rotation>{rx} {ry} {rz}</rotation><model>{model}</model></object>';
const MTARACE_OBJECT_FORMAT_ALT =
  '<object name="{comment}"><position>{x} {y} {z}</position><rotation>{rz} {ry} {rx}</rotation><model>{model}</model></object>';
const MTARACE_VEHICLE_FORMAT =
  '<spawnpoint name="{comment}"><vehicle>{model}</vehicle><position>{x} {y} {z}</position><rotation>{r}</rotation></spawnpoint>';
const LUA_OBJECT_FORMAT =
  "createobject({model},{x},{y},{z},{rx},{ry},{rz}){comment}";
const LUA_VEHICLE_FORMAT =
  "createvehicle({model},{x},{y},{z},{rx},{ry},{r},{dd}){comment}";

// Templates whose `{comment}` field is the trailing CSV column rather than a
// scripting-language comment, so we shouldn't decorate it with `//` or `--`.
const CSV_FORMATS = new Set([
  CSV_OBJECT_TEMPLATE.toLowerCase(),
  CSV_VEHICLE_TEMPLATE.toLowerCase(),
  CSV_REMOVAL_TEMPLATE.toLowerCase(),
]);

// IPL `inst` lines have no per-line comment slot — `{comment}` doesn't appear in
// the template so the value just gets dropped.
const IPL_FORMAT = IPL_OBJECT_TEMPLATE.toLowerCase();

function f7(v: string | undefined, fallback = "0.0"): string {
  const n = parseFloat(v ?? fallback);
  return (Number.isFinite(n) ? n : 0).toFixed(7);
}

function ifEmpty(v: string | undefined, fallback: string | number): string {
  if (v === undefined || v === null || v === "") return String(fallback);
  return v;
}

export class Output {
  private objectFormat = "NaN";
  private vehicleFormat = "NaN";
  private removalFormat = "NaN";
  private opts: ConvertOptions = { ...DEFAULT_OPTIONS };
  private objectCount = 0;
  private vehicleCount = 0;
  private removalCount = 0;
  private toPrepend = "";
  private modelCount = new Set<number>();
  // Calling RemoveBuildingForPlayer twice for the same building can crash the client.
  // Dedupe by (model, x, y, z, radius).
  private seenRemovals = new Set<string>();

  setObjectFormat(fmt: string): void {
    // Preserve case so the rendered output reads `CreateObject(...)` not
    // `createobject(...)`. Comparisons against the constants below normalise via
    // `.toLowerCase()` since the constants are stored lowercased.
    this.objectFormat = fmt;
    if (this.objectFormat.toLowerCase() === LUA_OBJECT_FORMAT) {
      this.objectCount += 1;
    }
  }

  setVehicleFormat(fmt: string): void {
    this.vehicleFormat = fmt;
    if (this.vehicleFormat.toLowerCase() === LUA_VEHICLE_FORMAT) {
      this.vehicleCount += 1;
    }
  }

  setRemovalFormat(fmt: string): void {
    this.removalFormat = fmt;
  }

  setConvertOptions(o: ConvertOptions): void {
    this.opts = o;
  }

  convertLine(p: ParsedLine | null): string {
    if (!p) return "";
    // If the user picked "Don't convert <kind>" for this output, drop the line.
    if (p.isRemoval) {
      if (this.removalFormat === "~NO~CONVERT~") return "";
      return this.convertRemovalLine(p);
    }
    if (p.isObject) {
      if (this.objectFormat === "~NO~CONVERT~") return "";
      return this.convertObjectLine(p);
    }
    if (this.vehicleFormat === "~NO~CONVERT~") return "";
    return this.convertVehicleLine(p);
  }

  private convertObjectLine(p: ParsedLine): string {
    let fmt = this.objectFormat;
    const a = this.completeObjectArray(p);

    if (fmt.toLowerCase() === IPL_FORMAT) {
      const [qx, qy, qz, qw] = eulerDegToQuaternion(
        parseFloat(a.rx ?? "0") || 0,
        parseFloat(a.ry ?? "0") || 0,
        parseFloat(a.rz ?? "0") || 0,
      );
      fmt = fmt.split("{qx}").join(qx.toFixed(7));
      fmt = fmt.split("{qy}").join(qy.toFixed(7));
      fmt = fmt.split("{qz}").join(qz.toFixed(7));
      fmt = fmt.split("{qw}").join(qw.toFixed(7));
    }

    fmt = fmt.split("{x}").join(f7(a.x));
    fmt = fmt.split("{y}").join(f7(a.y));
    fmt = fmt.split("{z}").join(f7(a.z));
    fmt = fmt.split("{rx}").join(f7(a.rx));
    fmt = fmt.split("{ry}").join(f7(a.ry));
    fmt = fmt.split("{rz}").join(f7(a.rz));
    fmt = fmt.split("{model}").join(a.model ?? "");
    fmt = fmt.split("{pid}").join(a.pid ?? "");
    fmt = fmt.split("{int}").join(a.int ?? "");
    fmt = fmt.split("{dd}").join(a.dd ?? "");
    fmt = fmt.split("{comment}").join(a.comment ?? "");
    fmt = fmt.split("{vw}").join(a.vw ?? "");
    fmt = fmt.split("{id}").join(String(this.objectCount));
    this.objectCount += 1;

    return this.toPrepend + (a.array ?? "") + fmt;
  }

  private convertVehicleLine(p: ParsedLine): string {
    let fmt = this.vehicleFormat;
    const a = this.completeVehicleArray(p);

    fmt = fmt.split("{x}").join(f7(a.x));
    fmt = fmt.split("{y}").join(f7(a.y));
    fmt = fmt.split("{z}").join(f7(a.z));
    fmt = fmt.split("{r}").join(f7(a.r));
    fmt = fmt.split("{c1}").join(a.c1 ?? "");
    fmt = fmt.split("{c2}").join(a.c2 ?? "");
    fmt = fmt.split("{model}").join(a.model ?? "");
    fmt = fmt.split("{respawn}").join(a.respawn ?? "");
    fmt = fmt.split("{comment}").join(a.comment ?? "");
    fmt = fmt.split("{id}").join(String(this.vehicleCount));
    fmt = fmt.split("{rx}").join("0.0000000");
    fmt = fmt.split("{ry}").join("0.0000000");
    fmt = fmt.split("{dd}").join('"CFFS"');
    this.vehicleCount += 1;

    const modelInt = parseInt(String(a.model ?? "0"), 10);
    if (Number.isFinite(modelInt)) this.modelCount.add(modelInt);

    return this.toPrepend + (a.array ?? "") + fmt;
  }

  private convertRemovalLine(p: ParsedLine): string {
    const x = f7(p.x);
    const y = f7(p.y);
    const z = f7(p.z);
    const radius = f7(p.radius, "0.25");
    const model = ifEmpty(p.model, -1);

    const key = `${model}|${x}|${y}|${z}|${radius}`;
    if (this.seenRemovals.has(key)) return "";
    this.seenRemovals.add(key);

    let comment = "";
    if (this.opts.commentBehaviour === "Yes") {
      const id = (p.id ?? p.comment ?? "").toString().trim();
      const stripped = id.replace(/\/\/|--|\/\*|\*\//g, "");
      const text = stripped !== "" ? stripped : "removal " + this.removalCount;
      comment = CSV_FORMATS.has(this.removalFormat.toLowerCase()) ? text : " //" + text;
    }

    let fmt = this.removalFormat;
    fmt = fmt.split("{model}").join(String(model));
    fmt = fmt.split("{x}").join(x);
    fmt = fmt.split("{y}").join(y);
    fmt = fmt.split("{z}").join(z);
    fmt = fmt.split("{radius}").join(radius);
    fmt = fmt.split("{int}").join(ifEmpty(p.int, 0));
    fmt = fmt.split("{comment}").join(comment);
    fmt = fmt.split("{id}").join(String(this.removalCount));
    this.removalCount += 1;

    return this.toPrepend + fmt;
  }

  private completeObjectArray(p: ParsedLine): ParsedLine & { array?: string } {
    const a: ParsedLine & { array?: string } = { ...p };
    a.dd = ifEmpty(a.dd, 250);
    let dd = this.opts.drawDistance;
    if (dd === "No change") dd = a.dd;
    a.dd = dd;

    let comment = "";
    a.comment = ifEmpty(a.comment, "");
    if (this.opts.commentBehaviour === "Yes") {
      comment = a.comment.trim().replace(/\/\/|--|\/\*|\*\/|--\[\[|--\]\]/g, "");
      const fmt = this.objectFormat.toLowerCase();
      if (CSV_FORMATS.has(fmt) || fmt === IPL_FORMAT) {
        // CSV/IPL: the comment is either a trailing column or unused — no decorator.
      } else if (fmt === LUA_OBJECT_FORMAT) {
        comment = " --" + comment;
      } else if (
        fmt !== MTARACE_OBJECT_FORMAT &&
        fmt !== MTA10_OBJECT_FORMAT
      ) {
        comment = " //" + comment;
      } else if (comment === "") {
        comment = "convertFFS (" + this.objectCount + ")";
      }
    }
    a.comment = comment;
    a.pid = ifEmpty(a.pid, -1);
    a.int = ifEmpty(a.int, 0);
    a.vw = ifEmpty(a.vw, 0);
    a.model = ifEmpty(a.model, 1337);
    a.x = ifEmpty(a.x, "0.0");
    a.y = ifEmpty(a.y, "0.0");
    a.z = ifEmpty(a.z, "0.0");
    a.rx = ifEmpty(a.rx, "0.0");
    a.ry = ifEmpty(a.ry, "0.0");
    a.rz = ifEmpty(a.rz, "0.0");

    let arr = this.opts.objectArray;
    if (arr === "No") arr = "";
    a.array = arr.replace("[]", "[" + this.objectCount + "] = ");
    return a;
  }

  private completeVehicleArray(p: ParsedLine): ParsedLine & { array?: string } {
    const a: ParsedLine & { array?: string } = { ...p };
    a.c1 = ifEmpty(a.c1, -1);
    let c1 = this.opts.vehicleColour1;
    if (c1 === "No change") c1 = a.c1;
    a.c1 = c1;

    a.c2 = ifEmpty(a.c2, -1);
    let c2 = this.opts.vehicleColour2;
    if (c2 === "No change") c2 = a.c2;
    a.c2 = c2;

    a.respawn = ifEmpty(a.respawn, "15");
    let respawn = this.opts.vehicleRespawnTime;
    if (respawn === "No change") respawn = a.respawn;
    a.respawn = respawn;

    a.model = ifEmpty(a.model, 406);

    let comment = "";
    if (this.opts.commentBehaviour === "Yes") {
      // For CSV output we want the original input comment if present, else the
      // GTA model name as a friendly fallback.
      const fmt = this.vehicleFormat.toLowerCase();
      if (CSV_FORMATS.has(fmt)) {
        comment = (p.comment ?? "").trim();
        if (comment === "") {
          let idx = parseInt(String(a.model), 10) - 399;
          if (!Number.isFinite(idx) || !VEHICLE_NAMES[idx]) idx = 0;
          comment = VEHICLE_NAMES[idx] ?? "";
        }
      } else {
        let idx = parseInt(String(a.model), 10) - 399;
        if (!Number.isFinite(idx) || !VEHICLE_NAMES[idx]) idx = 0;
        comment = VEHICLE_NAMES[idx] ?? "";
        if (fmt === LUA_OBJECT_FORMAT) {
          comment = " --" + comment;
        } else if (
          fmt !== MTARACE_VEHICLE_FORMAT &&
          fmt !== MTA10_VEHICLE_FORMAT
        ) {
          comment = " //" + comment;
        }
      }
    }
    a.comment = comment;

    a.x = ifEmpty(a.x, "0.0");
    a.y = ifEmpty(a.y, "0.0");
    a.z = ifEmpty(a.z, "0.0");
    a.r = ifEmpty(a.r, "0.0");

    let arr = this.opts.vehicleArray;
    if (arr === "No") arr = "";
    a.array = arr.replace("[]", "[" + this.vehicleCount + "] = ");
    return a;
  }

  returnConversionData(elapsedSeconds: number): string {
    const variants = [
      `In the time this conversion took to finish a hummingbird could have flapped it's wings ${(elapsedSeconds / 0.04).toFixed(2)} times!`,
      `In the time this conversion took to finish light could have travelled around the world ${(elapsedSeconds / 0.1336).toFixed(2)} times!`,
      `In the time this conversion took to finish ${(elapsedSeconds / 1.2096).toFixed(2)} micro-fortnights have passed!`,
      `convertFFS converted your input in ${elapsedSeconds.toFixed(2)} seconds - Chuck Norris could have done it in ${(elapsedSeconds / 63).toFixed(4)} seconds!`,
      `In the time this conversion took to finish the US national debt has risen by about $${(43981.48 * elapsedSeconds).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}!`,
    ];
    const timeText = variants[Math.floor(Math.random() * variants.length)];

    let commentStart = "/*";
    let commentEnd = "*/";
    if (
      this.objectFormat.toLowerCase() === MTA10_OBJECT_FORMAT ||
      this.vehicleFormat.toLowerCase() === MTA10_VEHICLE_FORMAT ||
      this.objectFormat.toLowerCase() === MTARACE_OBJECT_FORMAT ||
      this.vehicleFormat.toLowerCase() === MTARACE_VEHICLE_FORMAT
    ) {
      commentStart = "<!--";
      commentEnd = "-->";
    }
    if (this.objectFormat.toLowerCase() === LUA_OBJECT_FORMAT) {
      commentStart = "--[[";
      commentEnd = "--]]";
    }
    // IPL uses single-line `#` comments; emit each footer line with that prefix.
    if (this.objectFormat.toLowerCase() === IPL_FORMAT) {
      return (
        "\r\n" +
        "# Objects converted: " + this.objectCount + "\r\n" +
        "# " + timeText + "\r\n"
      );
    }
    let warning = "";
    if (this.removalCount > 1000) {
      warning =
        this.toPrepend +
        "WARNING: " + this.removalCount +
        " RemoveBuildingForPlayer calls — SA-MP has a soft limit around 1000.\r\n";
    }

    return (
      "\r\n" + this.toPrepend + commentStart + "\r\n" +
      this.toPrepend + "Objects converted: " + this.objectCount + "\r\n" +
      this.toPrepend + "Vehicles converted: " + this.vehicleCount + "\r\n" +
      this.toPrepend + "Vehicle models found: " + this.modelCount.size + "\r\n" +
      this.toPrepend + "World objects removed: " + this.removalCount + "\r\n" +
      warning +
      this.toPrepend + "----------------------\r\n" +
      this.toPrepend + timeText + "\r\n" +
      this.toPrepend + commentEnd + "\r\n"
    );
  }

  additionsTop(): string {
    if (
      this.objectFormat.toLowerCase() === MTA10_OBJECT_FORMAT ||
      this.vehicleFormat.toLowerCase() === MTA10_VEHICLE_FORMAT
    ) {
      this.toPrepend = "\t";
      return (
        '<map edf:definitions="editor_main">\r\n' +
        "\t<meta>\r\n" +
        "\t\t<info author='convertFFS.com' version='1.0' name='convertFFS map file' description='Converted by convertFFS' type='map' />\r\n" +
        "\t</meta>\r\n"
      );
    }
    if (
      this.objectFormat.toLowerCase() === MTARACE_OBJECT_FORMAT_ALT ||
      this.vehicleFormat.toLowerCase() === MTARACE_VEHICLE_FORMAT
    ) {
      this.toPrepend = "\t";
      return (
        '<map mod="race" version="1.0">\r\n' +
        "\t<meta>\r\n" +
        "\t\t<author>convertFFS.com</author>\r\n" +
        "\t</meta>\r\n" +
        "\t<options>\r\n" +
        "\t\t<respawn>timelimit</respawn>\r\n" +
        "\t</options>\r\n"
      );
    }
    if (this.objectFormat.toLowerCase() === IPL_FORMAT) {
      return "# IPL generated by vs-converter\r\ninst\r\n";
    }
    return "";
  }

  additionsBottom(): string {
    if (
      this.objectFormat.toLowerCase() === MTA10_OBJECT_FORMAT ||
      this.vehicleFormat.toLowerCase() === MTA10_VEHICLE_FORMAT ||
      this.objectFormat.toLowerCase() === MTARACE_OBJECT_FORMAT ||
      this.vehicleFormat.toLowerCase() === MTARACE_VEHICLE_FORMAT
    ) {
      return "</map>";
    }
    if (this.objectFormat.toLowerCase() === IPL_FORMAT) {
      return "end\r\n";
    }
    return "";
  }
}
