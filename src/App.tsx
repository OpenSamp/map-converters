import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  IconButton,
  Link as RadixLink,
  Select,
  Separator,
  Switch,
  Text,
  TextArea,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import {
  ClipboardCopyIcon,
  Cross2Icon,
  DownloadIcon,
  GitHubLogoIcon,
  MagicWandIcon,
  RocketIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { convert } from "./converter/convert";
import { AUTODETECT_NAME, families, resolveFamily } from "./converter/formats";
import { DEFAULT_OPTIONS, type ConvertOptions } from "./converter/output";

const DEFAULT_OUTPUT_FAMILY = "Incognito's Streamer Plugin";
const REPO_URL = "https://github.com/OpenSamp/map-converters";

function extensionForOutput(family: string): string {
  const n = family.toLowerCase();
  if (n.includes("ipl")) return "ipl";
  if (n.includes("csv")) return "csv";
  // Lua check must come before MTA — "MTA 1.x createObject (Lua)" mentions both.
  if (n.includes("lua")) return "lua";
  if (n.includes("mta")) return "map";
  return "pwn";
}

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [inputFamily, setInputFamily] = useState(AUTODETECT_NAME);
  const [outputFamily, setOutputFamily] = useState(DEFAULT_OUTPUT_FAMILY);
  const [opts, setOpts] = useState<ConvertOptions>({ ...DEFAULT_OPTIONS });
  const [copied, setCopied] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputChoices = useMemo(
    () => [AUTODETECT_NAME, ...families.map((f) => f.name)],
    [],
  );
  const outputChoices = useMemo(() => families.map((f) => f.name), []);

  const detected = useMemo(() => {
    if (inputFamily !== AUTODETECT_NAME || input.trim() === "") return null;
    return resolveFamily(inputFamily, input).detectedNotes ?? null;
  }, [inputFamily, input]);

  // Page-level drag listeners so users can drop a file anywhere on the window.
  useEffect(() => {
    function over(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        setDragActive(true);
      }
    }
    function leave(e: DragEvent) {
      // Only clear when we leave the window itself.
      if (e.relatedTarget === null) setDragActive(false);
    }
    function drop(e: DragEvent) {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) loadFile(f);
    }
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  async function loadFile(file: File) {
    const text = await file.text();
    setInput(text);
    setFilename(file.name);
    setOutput("");
  }

  function onConvert() {
    if (input.trim() === "") {
      setOutput("// Input is empty.");
      return;
    }
    const inFmt = resolveFamily(inputFamily, input);
    const outFmt = resolveFamily(outputFamily);
    setOutput(
      convert({
        inputObjectFormat: inFmt.object,
        inputVehicleFormat: inFmt.vehicle,
        inputRemovalFormat: inFmt.removal,
        outputObjectFormat: outFmt.object,
        outputVehicleFormat: outFmt.vehicle,
        outputRemovalFormat: outFmt.removal,
        options: opts,
        input,
      }),
    );
  }

  async function onCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onDownload() {
    if (!output) return;
    const ext = extensionForOutput(outputFamily);
    const base = filename ? filename.replace(/\.[^.]+$/, "") : "converted";
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
    e.target.value = ""; // reset so picking the same file again still fires
  }

  return (
    <Container size="3" px="4" py="6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".map,.pwn,.lua,.ipl,.csv,.txt,text/*,application/xml"
        onChange={onFilePick}
        style={{ display: "none" }}
      />

      {dragActive && (
        <Box
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--accent-a4)",
            border: "2px dashed var(--accent-9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            backdropFilter: "blur(2px)",
          }}
        >
          <Flex direction="column" align="center" gap="2">
            <UploadIcon width={32} height={32} />
            <Heading size="5">Drop file to load</Heading>
          </Flex>
        </Box>
      )}

      <Flex direction="column" gap="5">
        <Flex align="center" justify="between" gap="4">
          <Box>
            <Heading size="7" weight="bold">vs-converter</Heading>
            <Text as="p" size="2" color="gray" mt="1">
              SAMP / MTA / IPL / CSV map format converter — runs entirely in your
              browser.
            </Text>
          </Box>
          <Tooltip content="View source on GitHub">
            <RadixLink href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <IconButton size="3" variant="soft" color="gray" aria-label="GitHub">
                <GitHubLogoIcon width={20} height={20} />
              </IconButton>
            </RadixLink>
          </Tooltip>
        </Flex>

        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          <Card size="3">
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <MagicWandIcon />
                <Text weight="medium">Formats</Text>
              </Flex>
              <Separator size="4" />

              <Flex direction="column" gap="1">
                <Text as="label" size="2" color="gray">Input format</Text>
                <Select.Root value={inputFamily} onValueChange={setInputFamily}>
                  <Select.Trigger />
                  <Select.Content>
                    {inputChoices.map((n) => (
                      <Select.Item key={n} value={n}>{n}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                {detected && detected.length > 0 && (
                  <Flex gap="1" wrap="wrap" mt="1">
                    {detected.map((d) => (
                      <Badge key={d} color="iris" variant="soft" size="1">{d}</Badge>
                    ))}
                  </Flex>
                )}
                {detected && detected.length === 0 && input.trim() !== "" && (
                  <Text size="1" color="gray" mt="1">
                    Nothing recognised yet — keep typing or pick a format.
                  </Text>
                )}
              </Flex>

              <Flex direction="column" gap="1">
                <Text as="label" size="2" color="gray">Output format</Text>
                <Select.Root value={outputFamily} onValueChange={setOutputFamily}>
                  <Select.Trigger />
                  <Select.Content>
                    {outputChoices.map((n) => (
                      <Select.Item key={n} value={n}>{n}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>
          </Card>

          <Card size="3">
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <RocketIcon />
                <Text weight="medium">Options</Text>
              </Flex>
              <Separator size="4" />

              <Flex direction="column" gap="1">
                <Text as="label" size="2" color="gray">Object draw distance</Text>
                <TextField.Root
                  value={opts.drawDistance}
                  onChange={(e) => setOpts({ ...opts, drawDistance: e.target.value })}
                  placeholder="250"
                />
              </Flex>

              <Flex direction="column" gap="1">
                <Text as="label" size="2" color="gray">Vehicle respawn time</Text>
                <TextField.Root
                  value={opts.vehicleRespawnTime}
                  onChange={(e) => setOpts({ ...opts, vehicleRespawnTime: e.target.value })}
                  placeholder="15"
                />
              </Flex>

              <Flex align="center" justify="between" mt="1">
                <Text as="label" size="2">Add comments</Text>
                <Switch
                  checked={opts.commentBehaviour === "Yes"}
                  onCheckedChange={(c) =>
                    setOpts({ ...opts, commentBehaviour: c ? "Yes" : "No" })
                  }
                />
              </Flex>
            </Flex>
          </Card>
        </Grid>

        <Card size="3">
          <Flex direction="column" gap="3">
            <Flex align="center" justify="between" wrap="wrap" gap="2">
              <Flex align="center" gap="2">
                <Text weight="medium">Input</Text>
                {filename && (
                  <Badge color="gray" variant="soft" size="1">
                    {filename}
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      ml="1"
                      onClick={() => { setFilename(null); setInput(""); }}
                      aria-label="Clear file"
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Badge>
                )}
              </Flex>
              <Flex align="center" gap="2">
                {input && (
                  <Text size="1" color="gray">
                    {input.length.toLocaleString()} chars
                  </Text>
                )}
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon /> Upload file
                </Button>
              </Flex>
            </Flex>
            <TextArea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (filename) setFilename(null);
              }}
              placeholder="Paste, drop, or upload a file with objects, vehicles, MTA map XML, IPL or CSV…"
              spellCheck={false}
              size="2"
              resize="vertical"
              style={{ minHeight: 180, fontFamily: "var(--code-font-family)" }}
            />
          </Flex>
        </Card>

        <Flex gap="3" justify="center" wrap="wrap">
          <Button size="3" onClick={onConvert} disabled={input.trim() === ""}>
            Convert
          </Button>
          <Button
            size="3"
            variant="soft"
            color="gray"
            onClick={onCopy}
            disabled={!output}
          >
            <ClipboardCopyIcon /> {copied ? "Copied" : "Copy output"}
          </Button>
          <Button
            size="3"
            variant="soft"
            color="gray"
            onClick={onDownload}
            disabled={!output}
          >
            <DownloadIcon /> Download
          </Button>
        </Flex>

        <Card size="3">
          <Flex direction="column" gap="3">
            <Flex align="center" justify="between">
              <Text weight="medium">Output</Text>
              {output && (
                <Text size="1" color="gray">{output.length.toLocaleString()} chars</Text>
              )}
            </Flex>
            <TextArea
              value={output}
              readOnly
              placeholder="Output will appear here…"
              spellCheck={false}
              size="2"
              resize="vertical"
              style={{ minHeight: 240, fontFamily: "var(--code-font-family)" }}
            />
          </Flex>
        </Card>

        <Callout.Root size="1" color="gray" variant="surface">
          <Callout.Text>
            Need a CLI version? <RadixLink href={REPO_URL} target="_blank" rel="noopener noreferrer">
              See the docs on GitHub
            </RadixLink>{" "}— there's a Docker image with the same converter.
          </Callout.Text>
        </Callout.Root>

        <Flex justify="center" mt="2">
          <Text size="1" color="gray">
            Powered by{" "}
            <RadixLink href="https://vs-rp.org" target="_blank" rel="noopener noreferrer">
              vs-rp.org
            </RadixLink>
          </Text>
        </Flex>
      </Flex>
    </Container>
  );
}

export default App;
