import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  console.error("Missing GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const [, , command, arg1, arg2, arg3] = process.argv;

const JOB_TRACKER_HEADERS = [
  "Company",
  "Careers page link",
  "Role link",
  "Date applied",
  "Contacted recruiter?",
  "Contacted engineer?",
  "Notes",
  "Follow-up date",
];

function usage() {
  console.error(`
Usage:
  node tools/sheets.js setup-tracker [sheetAliasOrId]
  node tools/sheets.js read <sheetAliasOrId> <range>
  node tools/sheets.js read <range>
  node tools/sheets.js append <sheetAliasOrId> <range> <jsonRow>
  node tools/sheets.js append <sheetAliasOrId> <jsonObject>
  node tools/sheets.js append <range> <jsonRow>
  node tools/sheets.js append <jsonObject>
  node tools/sheets.js update <sheetAliasOrId> <range> <json2DArray>
  node tools/sheets.js update <range> <json2DArray>

Examples:
  node tools/sheets.js setup-tracker
  node tools/sheets.js setup-tracker leads
  node tools/sheets.js read test 'Sheet1!A1:B10'
  node tools/sheets.js read 'Sheet1!A1:B10'
  node tools/sheets.js append test 'Sheet1!A:B' '["Acme","Lead"]'
  node tools/sheets.js append test '{"Company":"Acme","Notes":"Applied"}'
  node tools/sheets.js append '{"Company":"Acme","Notes":"Applied"}'
  node tools/sheets.js update test 'Sheet1!B2' '[["Customer"]]'
`);
}

function loadSheetConfig() {
  const configPath = path.resolve(process.cwd(), "config", "sheets.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function resolveSpreadsheetId(aliasOrId, config) {
  if (!aliasOrId) {
    return config.default || null;
  }

  if (config[aliasOrId]) {
    return config[aliasOrId];
  }

  return aliasOrId;
}

function looksLikeJson(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function parseArgs(command, arg1, arg2, arg3, config) {
  let spreadsheetId;
  let range;
  let rawValues;

  if (command === "setup-tracker") {
    spreadsheetId = resolveSpreadsheetId(arg1, config) || resolveSpreadsheetId(null, config);
    return { spreadsheetId, range: null, rawValues: null };
  }

  if (command === "read") {
    if (arg2) {
      spreadsheetId = resolveSpreadsheetId(arg1, config);
      range = arg2;
    } else {
      spreadsheetId = resolveSpreadsheetId(null, config);
      range = arg1;
    }
  }

  if (command === "append") {
    if (arg3) {
      spreadsheetId = resolveSpreadsheetId(arg1, config);
      range = arg2;
      rawValues = arg3;
      return { spreadsheetId, range, rawValues };
    }

    if (arg2) {
      if (looksLikeJson(arg2)) {
        spreadsheetId = resolveSpreadsheetId(arg1, config);
        range = null;
        rawValues = arg2;
      } else {
        spreadsheetId = resolveSpreadsheetId(null, config);
        range = arg1;
        rawValues = arg2;
      }
      return { spreadsheetId, range, rawValues };
    }

    spreadsheetId = resolveSpreadsheetId(null, config);
    range = null;
    rawValues = arg1;
  }

  if (command === "update") {
    if (arg3) {
      spreadsheetId = resolveSpreadsheetId(arg1, config);
      range = arg2;
      rawValues = arg3;
    } else {
      spreadsheetId = resolveSpreadsheetId(null, config);
      range = arg1;
      rawValues = arg2;
    }
  }

  return { spreadsheetId, range, rawValues };
}

async function setupTracker(spreadsheetId) {
  const range = "Sheet1!A1:H1";

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [JOB_TRACKER_HEADERS],
    },
  });

  console.log(JSON.stringify({
    message: "Job tracker initialized",
    headers: JOB_TRACKER_HEADERS,
    updatedRange: res.data.updatedRange,
    updatedCells: res.data.updatedCells,
  }, null, 2));
}

async function readRange(spreadsheetId, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  console.log(JSON.stringify(res.data.values ?? [], null, 2));
}

async function appendRow(spreadsheetId, rangeOrJson, maybeJson) {
  if (maybeJson) {
    const range = rangeOrJson;
    const rawValues = maybeJson;
    const values = JSON.parse(rawValues);

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });

    console.log(JSON.stringify(res.data, null, 2));
    return;
  }

  const obj = JSON.parse(rangeOrJson);
  const sheetName = "Sheet1";

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headers = headerRes.data.values?.[0] ?? [];

  if (headers.length === 0) {
    throw new Error(
      'No headers found in Sheet1 row 1. Run "setup-job-tracker" first or create headers manually.'
    );
  }

  const row = headers.map((header) => obj[header] ?? "");

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });

  console.log(JSON.stringify({
    appendedObject: obj,
    resolvedRow: row,
    updatedRange: res.data.updates?.updatedRange,
  }, null, 2));
}

async function updateRange(spreadsheetId, range, rawValues) {
  const values = JSON.parse(rawValues);

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });

  console.log(JSON.stringify(res.data, null, 2));
}

async function main() {
  if (!command) {
    usage();
    process.exit(1);
  }

  const config = loadSheetConfig();
  const { spreadsheetId, range, rawValues } = parseArgs(command, arg1, arg2, arg3, config);

  if (command === "setup-tracker") {
    if (!spreadsheetId) {
      usage();
      process.exit(1);
    }
    await setupTracker(spreadsheetId);
    return;
  }

  if (!spreadsheetId || !range && command !== "append") {
    usage();
    process.exit(1);
  }

  if (command === "read") {
    await readRange(spreadsheetId, range);
    return;
  }

  if (command === "append") {
    if (!rawValues) {
      console.error("append requires either a JSON row or JSON object");
      process.exit(1);
    }

    await appendRow(spreadsheetId, range ? range : rawValues, range ? rawValues : undefined);
    return;
  }

  if (command === "update") {
    if (!rawValues) {
      console.error("update requires a JSON 2D array");
      process.exit(1);
    }

    await updateRange(spreadsheetId, range, rawValues);
    return;
  }

  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
