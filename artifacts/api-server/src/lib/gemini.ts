import { logger } from "./logger";

const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const MINE_SCHEMA = {
  type: "OBJECT",
  properties: {
    consignment_note: { type: "STRING" },
    truck_reg: { type: "STRING" },
    departure_time: { type: "STRING" },
    net_weight: { type: "NUMBER" },
  },
  required: ["truck_reg", "net_weight"],
};

const PORT_SCHEMA = {
  type: "OBJECT",
  properties: {
    port_reference: { type: "STRING" },
    truck_reg: { type: "STRING" },
    arrival_time: { type: "STRING" },
    net_weight: { type: "NUMBER" },
  },
  required: ["truck_reg", "net_weight"],
};

async function callGemini(
  fileBytes: Buffer,
  mimeType: string,
  schema: object,
  systemInstruction: string
): Promise<Record<string, unknown>> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the backend.");
  }

  const base64Data = fileBytes.toString("base64");

  const payload = {
    contents: [
      {
        parts: [
          { text: systemInstruction },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  const response = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ status: response.status, body: errText }, "Gemini API error");
    throw new Error(`Gemini processing error: ${errText}`);
  }

  const resJson = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const extractedText =
    resJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(extractedText) as Record<string, unknown>;
}

export async function extractMineSlip(
  fileBytes: Buffer,
  mimeType: string
): Promise<Record<string, unknown>> {
  return callGemini(
    fileBytes,
    mimeType,
    MINE_SCHEMA,
    "Extract the consignment note, truck registration, departure time (as ISO timestamp), and net weight in tonnes from this mine weighbridge slip."
  );
}

export async function extractPortSlip(
  fileBytes: Buffer,
  mimeType: string
): Promise<Record<string, unknown>> {
  return callGemini(
    fileBytes,
    mimeType,
    PORT_SCHEMA,
    "Extract the port reference, truck registration, arrival time (as ISO timestamp), and net weight in tonnes from this port siding slip."
  );
}
