// Port of convert.php — wires Input + XML pre-flatten + Output together.

import { MTA_REMOVAL_TEMPLATE, NO_CONVERT_TOKEN } from "./formats";
import { Input } from "./input";
import { Output, type ConvertOptions } from "./output";
import {
  OBJECT_CUSTOM_FORMAT,
  REMOVAL_CUSTOM_FORMAT,
  VEHICLE_CUSTOM_FORMAT,
  XMLConverter,
} from "./xml";

export interface ConvertRequest {
  inputObjectFormat: string; // template like "CreateObject({model},...)"
  inputVehicleFormat: string;
  inputRemovalFormat: string;
  outputObjectFormat: string;
  outputVehicleFormat: string;
  outputRemovalFormat: string;
  options: ConvertOptions;
  input: string;
}

export function convert(req: ConvertRequest): string {
  const start = performance.now();
  const xml = new XMLConverter();
  const input = new Input();
  const output = new Output();

  let rawInput = req.input;
  let inObj = req.inputObjectFormat;
  let inVeh = req.inputVehicleFormat;
  let inRem = req.inputRemovalFormat;

  try {
    // Pre-flatten <removeWorldObject> nodes when the user picked the MTA template as
    // the removal input. Same trick as for objects/vehicles below: parse the XML once
    // and prepend a CSV-ish block that the regex matcher can chew through.
    if (
      req.outputRemovalFormat !== NO_CONVERT_TOKEN &&
      inRem === MTA_REMOVAL_TEMPLATE
    ) {
      const rwo = xml.processRemoveWorldObjects(rawInput);
      if (rwo !== null) {
        inRem = REMOVAL_CUSTOM_FORMAT;
        rawInput = rwo + "\r\n\r\n" + rawInput;
      }
    }

    const r1 = xml.processMTARaceObjects(inObj, rawInput);
    if (r1 !== null) {
      inObj = OBJECT_CUSTOM_FORMAT;
      rawInput = r1 + "\r\n\r\n" + rawInput;
    }
    const r2 = xml.processMTARaceVehicles(inVeh, rawInput);
    if (r2 !== null) {
      inVeh = VEHICLE_CUSTOM_FORMAT;
      rawInput = r2 + "\r\n\r\n" + rawInput;
    }
    const r3 = xml.processMTA10Objects(inObj, rawInput);
    if (r3 !== null) {
      inObj = OBJECT_CUSTOM_FORMAT;
      rawInput = r3 + "\r\n\r\n" + rawInput;
    }
    const r4 = xml.processMTA10Vehicles(inVeh, rawInput);
    if (r4 !== null) {
      inVeh = VEHICLE_CUSTOM_FORMAT;
      rawInput = r4 + "\r\n\r\n" + rawInput;
    }
  } catch (e) {
    if ((e as Error).message === "XML_ERROR") return "~XML~ERROR~";
    throw e;
  }

  input.setObjectFormat(inObj);
  input.setVehicleFormat(inVeh);
  input.setRemovalFormat(inRem);
  output.setObjectFormat(req.outputObjectFormat);
  output.setVehicleFormat(req.outputVehicleFormat);
  output.setRemovalFormat(req.outputRemovalFormat);

  // Match PHP's edge-case rotation conversion when targeting MTA Race rotation order.
  const mtaRaceObj =
    '<object name="{comment}"><position>{x} {y} {z}</position><rotation>{rz} {ry} {rx}</rotation><model>{model}</model></object>';
  if (req.outputObjectFormat === mtaRaceObj && req.inputObjectFormat !== mtaRaceObj) {
    input.setRotationConversion("toRadians");
  }

  output.setConvertOptions(req.options);

  let out = output.additionsTop();
  const lines = input.processRawInput(rawInput);
  for (const line of lines) {
    const parsed = input.processLine(line);
    if (!parsed) continue;
    const rendered = output.convertLine(parsed);
    if (rendered) out += rendered + "\r\n";
  }
  out += output.returnConversionData((performance.now() - start) / 1000);
  out += output.additionsBottom();
  return out;
}
