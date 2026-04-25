// CLI entry — wraps the converter for shell / Docker use.
// Usage: see `--help`.

import fs from "node:fs";
import process from "node:process";
import { JSDOM } from "jsdom";
import { convert } from "../src/converter/convert";
import { AUTODETECT_NAME, families, resolveFamily } from "../src/converter/formats";
import { DEFAULT_OPTIONS, type ConvertOptions } from "../src/converter/output";

// The converter uses DOMParser (a browser API) to parse MTA XML maps. jsdom
// provides a Node-compatible implementation.
const dom = new JSDOM("");
(globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser as unknown as typeof DOMParser;
if (!(globalThis as { performance?: Performance }).performance) {
  (globalThis as unknown as { performance: { now(): number } }).performance = {
    now: () => Date.now(),
  };
}

interface Args {
  from: string;
  to: string;
  input?: string;
  output?: string;
  listFormats?: boolean;
  help?: boolean;
  comments: boolean;
  drawDistance?: string;
  respawnTime?: string;
}

function help(): string {
  return [
    "vs-converter — SAMP / MTA / IPL / CSV map converter",
    "",
    "Usage:",
    "  vs-converter --to <family> [--from <family>] [-i <path>] [-o <path>] [opts]",
    "  vs-converter --list-formats",
    "",
    "Options:",
    "  -f, --from <family>     Source format family. Default: Autodetect.",
    "  -t, --to <family>       Target format family. Required.",
    "  -i, --input <path>      Read input from file. Default: stdin.",
    "  -o, --output <path>     Write output to file. Default: stdout.",
    "      --list-formats      Print supported family names.",
    "      --no-comments       Suppress trailing object/vehicle comments.",
    "      --draw-distance <n> Object draw distance. Default: 250.",
    "      --respawn <n>       Vehicle respawn time. Default: 15.",
    "  -h, --help              Show this help.",
    "",
    "Examples:",
    "  vs-converter -i map.map -o map.pwn --to \"Incognito's Streamer Plugin\"",
    "  cat map.map | vs-converter --to \"GTA:SA IPL\" > map.ipl",
    "",
  ].join("\n");
}

function parseArgs(argv: string[]): Args {
  const a: Args = { from: AUTODETECT_NAME, to: "", comments: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) {
        process.stderr.write(`Missing value for ${k}\n`);
        process.exit(2);
      }
      return v;
    };
    switch (k) {
      case "-f": case "--from": a.from = next(); break;
      case "-t": case "--to": a.to = next(); break;
      case "-i": case "--input": a.input = next(); break;
      case "-o": case "--output": a.output = next(); break;
      case "--list-formats": a.listFormats = true; break;
      case "--no-comments": a.comments = false; break;
      case "--draw-distance": a.drawDistance = next(); break;
      case "--respawn": a.respawnTime = next(); break;
      case "-h": case "--help": a.help = true; break;
      default:
        process.stderr.write(`Unknown argument: ${k}\n`);
        process.stderr.write(help());
        process.exit(2);
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  process.stdout.write(help());
  process.exit(0);
}

if (args.listFormats) {
  process.stdout.write(`${AUTODETECT_NAME} (input only)\n`);
  for (const f of families) process.stdout.write(f.name + "\n");
  process.exit(0);
}

if (!args.to) {
  process.stderr.write("Error: --to is required. Run with --help for usage.\n");
  process.exit(2);
}

const text = args.input
  ? fs.readFileSync(args.input, "utf8")
  : fs.readFileSync(0, "utf8"); // 0 = stdin fd

const inFmt = resolveFamily(args.from, text);
const outFmt = resolveFamily(args.to);

const opts: ConvertOptions = {
  ...DEFAULT_OPTIONS,
  commentBehaviour: args.comments ? "Yes" : "No",
  ...(args.drawDistance ? { drawDistance: args.drawDistance } : {}),
  ...(args.respawnTime ? { vehicleRespawnTime: args.respawnTime } : {}),
};

const result = convert({
  inputObjectFormat: inFmt.object,
  inputVehicleFormat: inFmt.vehicle,
  inputRemovalFormat: inFmt.removal,
  outputObjectFormat: outFmt.object,
  outputVehicleFormat: outFmt.vehicle,
  outputRemovalFormat: outFmt.removal,
  options: opts,
  input: text,
});

if (args.output) {
  fs.writeFileSync(args.output, result, "utf8");
  if (inFmt.detectedNotes?.length) {
    process.stderr.write(`Detected: ${inFmt.detectedNotes.join(", ")}\n`);
  }
  process.stderr.write(`Wrote ${result.length} bytes to ${args.output}\n`);
} else {
  process.stdout.write(result);
}
