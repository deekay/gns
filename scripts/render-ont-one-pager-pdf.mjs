#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "docs/core/ONT_ONE_PAGER.pdf");

const page = { width: 792, height: 612 };

const colors = {
  paper: [0.965, 0.925, 0.855],
  sheet: [1.0, 0.988, 0.955],
  ink: [0.12, 0.105, 0.09],
  muted: [0.36, 0.32, 0.27],
  faint: [0.91, 0.84, 0.74],
  warm: [0.985, 0.944, 0.875],
  warm2: [0.95, 0.875, 0.77],
  clay: [0.49, 0.20, 0.10],
  copper: [0.72, 0.38, 0.19],
  dark: [0.12, 0.105, 0.09],
  white: [1, 0.982, 0.94],
  green: [0.18, 0.35, 0.27]
};

function rgb(values) {
  return values.map((value) => value.toFixed(3)).join(" ");
}

function escapePdf(text) {
  return String(text)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function approximateWidth(text, size, font = "sans") {
  let units = 0;
  for (const ch of String(text)) {
    if (ch === " ") units += 0.27;
    else if ("il.,:;!|'`".includes(ch)) units += 0.24;
    else if ("mwMW@".includes(ch)) units += 0.78;
    else if (/[A-Z]/.test(ch)) units += font === "serif" ? 0.63 : 0.61;
    else if (/[0-9]/.test(ch)) units += 0.53;
    else units += font === "serif" ? 0.50 : 0.48;
  }
  return units * size;
}

function wrapText(text, size, maxWidth, font = "sans") {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (approximateWidth(candidate, size, font) <= maxWidth || current === "") {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current !== "") lines.push(current);
  return lines;
}

class PdfDocument {
  constructor() {
    this.objects = [];
    this.pages = [];
  }

  addObject(body) {
    this.objects.push(body);
    return this.objects.length;
  }

  addPage(stream) {
    const contentId = this.addObject(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    );
    this.pages.push({ contentId });
  }

  build() {
    const helvetica = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const helveticaBold = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const timesBold = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
    const courier = this.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

    const pageIds = [];
    for (const pageRecord of this.pages) {
      pageIds.push(
        this.addObject(
          `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${helvetica} 0 R /F2 ${helveticaBold} 0 R /F3 ${timesBold} 0 R /F4 ${courier} 0 R >> >> /Contents ${pageRecord.contentId} 0 R >>`
        )
      );
    }

    const pagesId = this.addObject(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
    );

    for (const id of pageIds) {
      this.objects[id - 1] = this.objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
    }

    const catalogId = this.addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (const [index, body] of this.objects.entries()) {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${this.objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, "utf8");
  }
}

function rect(x, y, width, height, fill, stroke = null, strokeWidth = 0.8) {
  let op = `q ${rgb(fill)} rg `;
  if (stroke !== null) op += `${rgb(stroke)} RG ${strokeWidth} w `;
  op += `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${stroke === null ? "f" : "B"} Q\n`;
  return op;
}

function line(x1, y1, x2, y2, stroke = colors.faint, strokeWidth = 0.8) {
  return `q ${rgb(stroke)} RG ${strokeWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`;
}

function text(x, y, value, font = "F1", size = 9, color = colors.ink) {
  return `BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(value)}) Tj ET\n`;
}

function textBlock({ x, y, width, value, size = 8.6, lineHeight = 11, font = "F1", color = colors.muted }) {
  let ops = "";
  let cursor = y;
  for (const row of wrapText(value, size, width, font === "F3" ? "serif" : "sans")) {
    ops += text(x, cursor, row, font, size, color);
    cursor -= lineHeight;
  }
  return { ops, y: cursor };
}

function heading(x, y, label, kicker = null) {
  let ops = "";
  if (kicker !== null) {
    ops += text(x, y + 17, kicker.toUpperCase(), "F2", 6.8, colors.clay);
  }
  ops += text(x, y, label, "F3", 15.5, colors.ink);
  ops += line(x, y - 5, x + 148, y - 5, colors.faint, 0.8);
  return ops;
}

function bulletList({
  x,
  y,
  width,
  items,
  size = 7.6,
  lineHeight = 9.3,
  itemGap = 2.8,
  color = colors.muted,
  bulletColor = colors.copper
}) {
  let ops = "";
  let cursor = y;
  const bulletSize = Math.max(2.5, size * 0.38);
  const textInset = 13;
  for (const item of items) {
    ops += rect(x, cursor + size * 0.27, bulletSize, bulletSize, bulletColor);
    const lines = wrapText(item, size, width - textInset);
    for (const row of lines) {
      ops += text(x + textInset, cursor, row, "F1", size, color);
      cursor -= lineHeight;
    }
    cursor -= itemGap;
  }
  return { ops, y: cursor };
}

function card(x, y, width, height, fill = colors.sheet, stroke = colors.faint) {
  return rect(x, y, width, height, fill, stroke, 0.75);
}

function chip(x, y, label, width) {
  let ops = "";
  ops += rect(x, y, width, 17, [0.995, 0.958, 0.892], [0.88, 0.77, 0.64], 0.6);
  ops += text(x + 8, y + 5.3, label, "F2", 6.8, colors.clay);
  return ops;
}

function btcMark(x, y, size = 10, color = colors.clay) {
  let ops = "";
  ops += text(x + size * 0.05, y, "B", "F2", size, color);
  const left = x + size * 0.20;
  const right = x + size * 0.34;
  const top = y + size * 0.92;
  const bottom = y - size * 0.25;
  ops += line(left, bottom, left, top, color, Math.max(0.85, size * 0.075));
  ops += line(right, bottom, right, top, color, Math.max(0.85, size * 0.075));
  return ops;
}

function btcAmount(x, y, amount, size = 7.6, color = colors.ink) {
  let ops = "";
  ops += btcMark(x, y - 0.2, size + 1.8, color);
  ops += text(x + size * 2.02, y, amount, "F2", size, color);
  return ops;
}

function renderHeader() {
  let ops = "";
  ops += rect(0, 0, page.width, page.height, colors.paper);
  ops += rect(24, 24, page.width - 48, page.height - 48, colors.sheet, [0.89, 0.80, 0.67], 0.9);
  ops += rect(24, 454, page.width - 48, 134, [0.97, 0.90, 0.79]);
  ops += text(48, 552, "OPEN NAME TAGS", "F2", 7.4, colors.clay);
  ops += text(48, 525, "Open Name Tags (ONT)", "F3", 27, colors.ink);
  ops += text(48, 501, "Human-readable names you can actually own", "F3", 16.2, colors.ink);
  ops += textBlock({
    x: 48,
    y: 481,
    width: 500,
    value: "Bitcoin anchors ownership. Owner-signed off-chain records keep destinations updateable. Bonds create cost without rent; public auctions price scarce names.",
    size: 8.6,
    lineHeight: 10.5,
    color: colors.muted
  }).ops;

  const thesisX = 584;
  const thesis = [
    ["01", "Ownership", "on Bitcoin"],
    ["02", "Records", "off-chain"],
    ["03", "Bonds", "not rent"]
  ];
  const cardWidth = 132;
  const cardHeight = 29;
  const cardGap = 8;
  const numberX = thesisX + 12;
  const labelX = thesisX + 44;
  let cardTop = 570;
  for (const [number, title, detail] of thesis) {
    const cardY = cardTop - cardHeight;
    ops += rect(thesisX, cardY, cardWidth, cardHeight, [0.995, 0.958, 0.892], [0.88, 0.77, 0.64], 0.65);
    ops += text(numberX, cardY + 11.4, number, "F2", 7.1, colors.copper);
    ops += text(labelX, cardY + 15.2, title, "F2", 7.4, colors.ink);
    ops += text(labelX, cardY + 6.1, detail, "F1", 6.5, colors.clay);
    cardTop -= cardHeight + cardGap;
  }
  return ops;
}

function renderAliceFlow() {
  const x = 48;
  const y = 296;
  const height = 108;
  const width = 212;
  const gap = 30;
  let ops = "";
  ops += text(x, 440, "HOW ONE NAME RESOLVES", "F2", 7.0, colors.clay);
  ops += text(x, 420, "Alice Example", "F3", 17.5, colors.ink);
  ops += line(x, 410, 744, 410, colors.faint, 0.8);
  const cards = [
    {
      x,
      title: "Bitcoin anchor",
      meta: "alice",
      body: ["owner key: 8f3c...12ab", "bond: 6,250,000 sats"]
    },
    {
      x: x + width + gap,
      title: "Signed off-chain bundle",
      meta: "current destinations",
      body: ["bitcoin: bc1qxy...0wlh", "lightning: lno1q...9sa", "email: alice@example.com", "website: alice.example"]
    },
    {
      x: x + (width + gap) * 2,
      title: "Client",
      meta: "resolve and verify",
      body: ["checks Bitcoin ownership", "verifies owner signature", "uses website: alice.example"]
    }
  ];

  for (const [index, item] of cards.entries()) {
    ops += card(item.x, y, width, height, index === 1 ? [0.995, 0.965, 0.915] : colors.sheet, [0.87, 0.78, 0.67]);
    ops += text(item.x + 15, y + height - 25, item.title, "F3", 14.0, colors.ink);
    ops += text(item.x + 15, y + height - 42, item.meta, "F2", 7.1, colors.clay);
    let bodyY = y + height - 60;
    for (const row of item.body) {
      ops += text(item.x + 15, bodyY, row, "F4", 7.25, colors.muted);
      bodyY -= 10.2;
    }
    if (index < cards.length - 1) {
      const arrowY = y + height / 2;
      const startX = item.x + width + 7;
      const endX = item.x + width + gap - 7;
      ops += line(startX, arrowY, endX, arrowY, colors.copper, 1.0);
      ops += text(endX - 3, arrowY - 3, ">", "F2", 7.5, colors.copper);
    }
  }

  ops += rect(x, 264, 696, 20, [0.16, 0.135, 0.105]);
  ops += text(x + 14, 271.5, "Bitcoin answers who owns alice. The signed bundle answers where it points.", "F2", 7.8, colors.white);
  return ops;
}

function renderBondCard() {
  const x = 48;
  const y = 50;
  const width = 330;
  const height = 196;
  let ops = "";
  ops += card(x, y, width, height, colors.sheet, [0.88, 0.80, 0.70]);
  ops += text(x + 18, y + height - 26, "Bonds, Not Rent", "F3", 17.0, colors.ink);
  ops += text(x + 18, y + height - 43, "ALLOCATION COST", "F2", 6.7, colors.clay);
  ops += textBlock({
    x: x + 18,
    y: y + height - 65,
    width: 126,
    value: "A bond creates real cost without paying a third party to allocate scarcity.",
    size: 9.4,
    lineHeight: 11.8,
    font: "F3",
    color: colors.ink
  }).ops;
  ops += textBlock({
    x: x + 18,
    y: y + 73,
    width: 128,
    value: "The bitcoin remains yours in self-custody. The cost is liquidity, time, and opportunity cost.",
    size: 7.3,
    lineHeight: 9.0,
    color: colors.muted
  }).ops;

  ops += line(x + 154, y + 20, x + 154, y + height - 24, [0.90, 0.82, 0.72], 0.65);

  const tableX = x + 170;
  const tableY = y + 23;
  const tableWidth = 140;
  const rowH = 17.2;
  const rows = [
    ["1", "same", "1"],
    ["2", "same", "0.5"],
    ["3", "same", "0.25"],
    ["4", "same", "0.125"],
    ["5", "same", "0.0625"],
    ["6", "same", "0.03125"],
    ["12+", "same", "0.0005 floor"]
  ];

  ops += text(tableX, y + height - 29, "Example opening floors", "F2", 7.6, colors.clay);
  ops += text(tableX, y + height - 43, "Illustrative; not final.", "F1", 6.7, colors.muted);
  ops += rect(tableX, tableY + 121, tableWidth, 18, [0.965, 0.90, 0.80]);
  ops += text(tableX + 8, tableY + 128, "Len", "F2", 6.5, colors.clay);
  ops += text(tableX + 39, tableY + 128, "Lane", "F2", 6.5, colors.clay);
  ops += text(tableX + 84, tableY + 128, "Floor", "F2", 6.5, colors.clay);

  let rowY = tableY + 111;
  for (const row of rows) {
    ops += text(tableX + 9, rowY, row[0], "F2", 7.2, colors.ink);
    ops += text(tableX + 39, rowY, row[1], "F1", 6.8, colors.muted);
    ops += btcAmount(tableX + 84, rowY, row[2], 7.15, colors.ink);
    ops += line(tableX + 7, rowY - 5.2, tableX + tableWidth - 7, rowY - 5.2, [0.92, 0.86, 0.78], 0.4);
    rowY -= rowH;
  }
  return ops;
}

function renderLaunchCards() {
  const x = 400;
  const y = 158;
  const width = 344;
  const height = 88;
  let ops = "";
  ops += card(x, y, width, height, colors.sheet, [0.88, 0.80, 0.70]);
  ops += text(x + 16, y + height - 24, "Name Auctions", "F3", 16.0, colors.ink);
  ops += text(x + 16, y + height - 40, "ONE LANE FOR VALID NAMES", "F2", 6.5, colors.clay);
  ops += textBlock({
    x: x + 16,
    y: y + height - 59,
    width: 162,
    value: "Valid names open by auction at launch. One bidder can win at the floor; competing bidders discover the final bond.",
    size: 7.35,
    lineHeight: 9.2,
    color: colors.muted
  }).ops;

  const launchItems = [
    "public auction window",
    "bids discover final bond",
    "winner settles ownership"
  ];
  ops += bulletList({
    x: x + 198,
    y: y + height - 50,
    width: 126,
    items: launchItems,
    size: 6.9,
    lineHeight: 8.6,
    itemGap: 3.0
  }).ops;
  return ops;
}

function renderLengthFloorCard() {
  const x = 400;
  const y = 50;
  const width = 344;
  const height = 94;
  let ops = "";
  ops += card(x, y, width, height, [0.995, 0.958, 0.895], [0.86, 0.72, 0.60]);
  ops += text(x + 16, y + height - 24, "Length Floors", "F3", 16.0, colors.ink);
  ops += text(x + 16, y + height - 40, "SHORTER NAMES START HIGHER", "F2", 6.5, colors.clay);
  ops += bulletList({
    x: x + 16,
    y: y + height - 61,
    width: 152,
    items: [
      "same auction mechanics",
      "objective length curve",
      "expensive early sweeps"
    ],
    size: 6.9,
    lineHeight: 8.6,
    itemGap: 3.0
  }).ops;
  ops += line(x + 186, y + 20, x + 186, y + height - 20, [0.88, 0.76, 0.64], 0.6);
  ops += textBlock({
    x: x + 204,
    y: y + height - 32,
    width: 120,
    value: "Length floors make early bulk capture expensive without creating a second auction lane.",
    size: 6.75,
    lineHeight: 8.2,
    color: colors.muted
  }).ops;
  return ops;
}

function renderFooter() {
  let ops = "";
  ops += text(48, 34, "opennametags.org", "F2", 6.8, colors.clay);
  ops += text(650, 34, "prototype launch brief", "F1", 6.6, colors.muted);
  return ops;
}

let stream = "";
stream += renderHeader();
stream += renderAliceFlow();
stream += renderBondCard();
stream += renderLaunchCards();
stream += renderLengthFloorCard();
stream += renderFooter();

const pdf = new PdfDocument();
pdf.addPage(stream);

if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
fs.writeFileSync(outputPath, pdf.build());

const stats = fs.statSync(outputPath);
console.log(`${outputPath}\n${stats.size} bytes`);
