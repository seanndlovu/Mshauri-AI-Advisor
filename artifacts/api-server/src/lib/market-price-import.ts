import { inflateRawSync } from "node:zlib";

export type ImportedPriceEntry = {
  commodity: string;
  grade: string | null;
  unit: string;
  market: string;
  priceUsd: string | null;
  priceZig: string | null;
  observedDate: string;
  source: string;
  notes: string | null;
};

export type ImportProblem = { row: number; field?: string; message: string };

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2_000;
const MAX_XLSX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_XLSX_ENTRY_BYTES = 2 * 1024 * 1024;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function unzipXlsx(buffer: Buffer): Map<string, Buffer> {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let i = Math.max(0, buffer.length - 65_557); i <= buffer.length - 4; i++) {
    if (buffer.readUInt32LE(i) === endSignature) endOffset = i;
  }
  if (endOffset < 0) throw new Error("The Excel file is not a valid .xlsx workbook.");

  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  if (entryCount > 100) throw new Error("The Excel workbook contains too many files.");
  const files = new Map<string, Buffer>();
  let offset = centralOffset;
  let declaredUncompressed = 0;
  let actualUncompressed = 0;

  for (let entry = 0; entry < entryCount; entry++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("The Excel workbook directory is invalid.");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    declaredUncompressed += uncompressedSize;
    if (uncompressedSize > MAX_XLSX_ENTRY_BYTES || declaredUncompressed > MAX_XLSX_UNCOMPRESSED_BYTES) {
      throw new Error("The Excel workbook expands to more than 8 MB.");
    }
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("The Excel workbook is missing file data.");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method !== 0 && method !== 8) throw new Error("The Excel workbook uses an unsupported compression format.");
    const remainingBudget = Math.min(MAX_XLSX_ENTRY_BYTES, MAX_XLSX_UNCOMPRESSED_BYTES - actualUncompressed);
    const content = method === 8 ? inflateRawSync(compressed, { maxOutputLength: remainingBudget }) : compressed;
    actualUncompressed += content.length;
    if (content.length > MAX_XLSX_ENTRY_BYTES || actualUncompressed > MAX_XLSX_UNCOMPRESSED_BYTES) {
      throw new Error("The Excel workbook expands to more than 8 MB.");
    }
    files.set(name, content);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function columnIndex(reference: string): number {
  const letters = reference.replace(/\d/g, "").toUpperCase();
  return [...letters].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function parseXlsx(buffer: Buffer): string[][] {
  const files = unzipXlsx(buffer);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The workbook needs a first worksheet with price data.");
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join(""))
  );

  const rows: string[][] = [];
  const sheetXml = sheet.toString("utf8");
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const reference = attributes.match(/\br="([^"]+)"/)?.[1] ?? "";
      const type = attributes.match(/\bt="([^"]+)"/)?.[1] ?? "";
      const raw = cellMatch[2];
      const inline = raw.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      const value = raw.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
      const decoded = type === "s" ? (sharedStrings[Number(value)] ?? "") : decodeXml(inline ?? value);
      row[columnIndex(reference)] = decoded;
    }
    if (row.some((cell) => (cell ?? "").trim())) rows.push(row.map((cell) => cell ?? ""));
  }
  return rows;
}

function asDate(value: string, fallback: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    return parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + Number(trimmed) * 86_400_000).toISOString().slice(0, 10);
  }
  return null;
}

function asMoney(value: string): string | null {
  const clean = value.replace(/[$,\s]/g, "").trim();
  if (!clean) return null;
  const number = Number(clean);
  if (!Number.isFinite(number) || number < 0) return null;
  return number.toFixed(2);
}

export function parseMarketPriceWorkbook(
  fileName: string,
  fileData: string,
  batchObservedDate: string,
  batchSource: string,
): { entries: ImportedPriceEntry[]; errors: ImportProblem[] } {
  const buffer = Buffer.from(fileData, "base64");
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
    throw new Error("Upload a non-empty file smaller than 2 MB.");
  }

  const rows = fileName.toLowerCase().endsWith(".xlsx")
    ? parseXlsx(buffer)
    : parseCsv(buffer.toString("utf8").replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The file must include headers and at least one price row.");
  if (rows.length - 1 > MAX_ROWS) throw new Error(`A price edition can contain at most ${MAX_ROWS} rows.`);

  const headerIndex = new Map(rows[0].map((header, index) => [normalizeHeader(header), index]));
  const firstIndex = (...names: string[]) => names.map((name) => headerIndex.get(name)).find((index) => index !== undefined);
  const commodityIndex = firstIndex("commodity", "crop", "product", "item");
  const marketIndex = firstIndex("market", "location");
  const unitIndex = firstIndex("unit", "measure", "quantity");
  const usdIndex = firstIndex("price usd", "usd", "price");
  const zigIndex = firstIndex("price zig", "zig");
  const gradeIndex = firstIndex("grade", "variety");
  const dateIndex = firstIndex("observed date", "date");
  const sourceIndex = firstIndex("source");
  const notesIndex = firstIndex("notes", "note");

  const errors: ImportProblem[] = [];
  if (commodityIndex === undefined) errors.push({ row: 1, field: "Commodity", message: "Missing a Commodity column." });
  if (marketIndex === undefined) errors.push({ row: 1, field: "Market", message: "Missing a Market column." });
  if (unitIndex === undefined) errors.push({ row: 1, field: "Unit", message: "Missing a Unit column." });
  if (usdIndex === undefined && zigIndex === undefined) errors.push({ row: 1, field: "Price", message: "Add a Price USD, USD, Price, Price ZiG, or ZiG column." });
  if (errors.length) return { entries: [], errors };

  const entries: ImportedPriceEntry[] = [];
  const valueAt = (row: string[], index: number | undefined) => (index === undefined ? "" : (row[index] ?? "")).trim();
  rows.slice(1).forEach((row, position) => {
    const rowNumber = position + 2;
    const commodity = valueAt(row, commodityIndex);
    const market = valueAt(row, marketIndex);
    const unit = valueAt(row, unitIndex);
    const priceUsd = asMoney(valueAt(row, usdIndex));
    const priceZig = asMoney(valueAt(row, zigIndex));
    const observedDate = asDate(valueAt(row, dateIndex), batchObservedDate);

    if (!commodity) errors.push({ row: rowNumber, field: "Commodity", message: "Commodity is required." });
    if (!market) errors.push({ row: rowNumber, field: "Market", message: "Market is required." });
    if (!unit) errors.push({ row: rowNumber, field: "Unit", message: "Unit is required." });
    if (!priceUsd && !priceZig) errors.push({ row: rowNumber, field: "Price", message: "Enter a valid USD or ZiG price." });
    if (!observedDate) errors.push({ row: rowNumber, field: "Observed date", message: "Use a valid date." });
    if (!commodity || !market || !unit || (!priceUsd && !priceZig) || !observedDate) return;

    entries.push({
      commodity,
      grade: valueAt(row, gradeIndex) || null,
      unit,
      market,
      priceUsd,
      priceZig,
      observedDate,
      source: valueAt(row, sourceIndex) || batchSource,
      notes: valueAt(row, notesIndex) || null,
    });
  });

  return { entries, errors };
}