# map-converters

[![Live](https://img.shields.io/badge/live-converter.opensamp.com-iris)](https://converter.opensamp.com/)

Convert SAMP, MTA, GTA:SA IPL and CSV map formats between each other — in the
browser, on the command line, or via Docker.

**Live web app:** [https://converter.opensamp.com/](https://converter.opensamp.com/)

This is a heavily extended TypeScript port of [convertFFS](https://github.com/diamondzxd/convertffs)
with modern MTA `<removeWorldObject>` support, GTA:SA IPL output (round-trippable
quaternion rotations), an internal CSV intermediate format, autodetection across
all three streams (objects / vehicles / removals), and a CLI.

## What it converts

**Objects** — SA-MP `CreateObject`, Incognito's Streamer, YSI, MTA 1.0/1.6,
MTA Race, MTA `createObject` (Lua), xObjects v1, xStreamer, Einstein's,
MidoStream, Double-O, Fallout's, tAxI's, rStreamer, pObjectStreams, Medit,
Westie's SMD, GTA:SA IPL `inst`, VS CSV.

**Vehicles** — SA-MP `AddStaticVehicle(Ex)` / `CreateVehicle`, MTA 1.0/1.6,
MTA Race spawnpoints, Double-O, tAxI's, VS CSV.

**World removals** — MTA `<removeWorldObject>`, SA-MP
`RemoveBuildingForPlayer`, VS CSV.

The web UI groups these into "families" so you only ever pick one input and one
output. Source format defaults to **Autodetect** — detectors run independently for
objects, vehicles and removals, so a single MTA map with all three is converted
in one pass.

## Web UI

Hosted: **[converter.opensamp.com](https://converter.opensamp.com/)**

Local dev (Docker, no Node required):

```sh
docker compose up
# http://localhost:5173
```

Production build:

```sh
docker compose run --rm dev npm run build
# Static site goes to dist/
```

Drop a `.map` / `.pwn` / `.ipl` / `.csv` file anywhere on the page — or click
**Upload file**. Pasted text works too. Convert, then **Copy** or **Download** the
output (filename is derived from the input + the target format extension).

## CLI / Docker

The same converter ships as a CLI inside a tiny Node image — no build step, no
local Node install required.

```sh
# Build the image once
docker build -t vs-converter .

# Convert a file via a volume mount
docker run --rm -v "$PWD:/work" vs-converter \
  -i /work/map.map -o /work/map.ipl --to "GTA:SA IPL"

# Pipe via stdin/stdout
cat map.map | docker run --rm -i vs-converter \
  --to "Incognito's Streamer Plugin" > map.pwn

# List supported source/target families
docker run --rm vs-converter --list-formats

# Print full help
docker run --rm vs-converter --help
```

If you have Node locally, the same CLI is exposed as `npm run cli -- <args>`.

| flag                  | default       | description                                          |
| --------------------- | ------------- | ---------------------------------------------------- |
| `-f, --from <family>` | `Autodetect`  | Source format. Autodetect runs detectors per kind.   |
| `-t, --to <family>`   | _required_    | Target format.                                       |
| `-i, --input <path>`  | stdin         | Input file path.                                     |
| `-o, --output <path>` | stdout        | Output file path.                                    |
| `--list-formats`      |               | Print supported family names and exit.               |
| `--no-comments`       | comments on   | Suppress trailing object/vehicle comments.           |
| `--draw-distance <n>` | `250`         | Object streamer draw distance.                       |
| `--respawn <n>`       | `15`          | Vehicle respawn time (seconds).                      |
| `-h, --help`          |               | Show help.                                           |

## VS CSV — the intermediate format

XML pre-flatten, all parsers and the matrix of conversions all funnel through one
canonical CSV form:

```
OBJ,{model},{x},{y},{z},{rx},{ry},{rz},{int},{vw},{comment}
VEH,{model},{x},{y},{z},{r},{c1},{c2},{respawn},{comment}
RWO,{model},{x},{y},{z},{radius},{int},{comment}
```

You can pick **VS CSV (intermediate)** as input or output to inspect or hand-edit
the intermediate state.

## GTA:SA IPL

The IPL output uses a mathematically-correct ZYX half-angle quaternion encoding
(reverse-compatible with reading back into Euler), unlike
[mta-map-to-ipl](https://github.com/Fernando-A-Rocha/mta-map-to-ipl) whose
full-angle Shepperd encoding can drop the sign of `rotZ`. See
[`src/converter/quaternion.ts`](src/converter/quaternion.ts) for the rationale.

## Project layout

| path                              | what                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `src/converter/formats.ts`        | Format definitions, autodetect regexes, families.       |
| `src/converter/input.ts`          | Line parser (port of `php/input.php`).                  |
| `src/converter/output.ts`         | Line renderer (port of `php/output.php`).               |
| `src/converter/xml.ts`            | MTA XML pre-flatten — Race + 1.0/1.6 + removeWorldObject. |
| `src/converter/quaternion.ts`     | Euler ↔ quaternion for IPL.                             |
| `src/converter/convert.ts`        | Orchestration (port of `convert.php`).                  |
| `src/App.tsx` / `src/main.tsx`    | Web UI on Radix Themes.                                |
| `scripts/cli.ts`                  | Node/CLI entry.                                         |
| `scripts/smoke.mjs`               | End-to-end regression test (`tsx` + `jsdom`).           |
| `Dockerfile`                      | CLI image.                                              |
| `docker-compose.yml`              | Dev server.                                            |
| `.github/workflows/deploy.yml`    | Build + GitHub Pages deploy.                           |

## Deployment

GitHub Pages, source set to **GitHub Actions** (Settings → Pages → Source).
Every push to `master` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
build with Vite, upload `dist/` as a Pages artifact, deploy.

The custom domain `converter.opensamp.com` is held by `public/CNAME` so the
Pages config persists across deploys.

## Credits

Derived from convertFFS by Haydz / diamondzxd. IPL approach inspired by
[mta-map-to-ipl](https://github.com/Fernando-A-Rocha/mta-map-to-ipl) and
[MTAConvert](https://github.com/eklypss/MTAConvert).

Powered by [vs-rp.org](http://vs-rp.org).
