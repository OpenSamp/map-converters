# vs-converter

Client-side TypeScript port of [convertFFS](https://www.convertffs.com/) — converts SA-MP / MTA
object & vehicle format strings between dialects (CreateObject, CreateDynamicObject, MTA Race
XML, MTA 1.0 XML, etc.). Runs entirely in the browser, no server.

## Run the web UI via Docker (no local Node required)

```sh
docker compose up
```

Then open http://localhost:5173.

## Build the web UI

```sh
docker compose run --rm dev npm run build
```

Output goes to `dist/`.

## CLI

The same converter ships as a CLI. Build the image once, then invoke it like any
other Docker tool — file in/out via a volume mount, or stdin/stdout for pipes.

```sh
# Build image (one-off)
docker build -t vs-converter .

# Convert a file using a mounted directory
docker run --rm -v "$PWD:/work" vs-converter \
  -i /work/map.map -o /work/map.ipl --to "GTA:SA IPL"

# Pipe via stdin/stdout
cat map.map | docker run --rm -i vs-converter --to "Incognito's Streamer Plugin" > map.pwn

# List supported source/target families
docker run --rm vs-converter --list-formats

# Print full help
docker run --rm vs-converter --help
```

Locally (with Node installed) the same CLI is available as `npm run cli -- <args>`.

Useful flags:

| flag | default | description |
|---|---|---|
| `-f, --from <family>` | `Autodetect` | Source format. `Autodetect` runs each kind's regex separately. |
| `-t, --to <family>` | _required_ | Target format. |
| `-i, --input <path>` | stdin | Input file path. |
| `-o, --output <path>` | stdout | Output file path. |
| `--no-comments` | _comments on_ | Suppress trailing object/vehicle comments. |
| `--draw-distance <n>` | `250` | Object streamer draw distance. |
| `--respawn <n>` | `15` | Vehicle respawn time. |

## Layout

- `src/converter/formats.ts` — format definitions + auto-detect regexes.
- `src/converter/input.ts`   — line parser (port of `php/input.php`).
- `src/converter/output.ts`  — line renderer (port of `php/output.php`).
- `src/converter/xml.ts`     — MTA XML pre-flatten (port of `php/xml.php`).
- `src/converter/convert.ts` — orchestration (port of `convert.php`).
- `src/App.tsx`              — minimal UI.
