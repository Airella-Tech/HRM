// Small, dependency-free export helpers (CSV and multi-sheet Excel workbook).

const saveBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvCell = (v) => {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+@]/.test(s)) s = `'${s}`; // spreadsheet formula guard
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsvFile = (filename, headers, rows) => {
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  saveBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
};

const xmlEsc = (v) =>
  String(v)
    // eslint-disable-next-line no-control-regex -- strip XML-invalid control chars
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sheetName = (name, used) => {
  let base = String(name).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Sheet";
  let n = base, i = 2;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 25)} ${i++}`;
  used.add(n.toLowerCase());
  return n;
};

const cellXml = (v, style) => {
  if (v == null || v === "") return `<Cell${style ? ` ss:StyleID="${style}"` : ""}/>`;
  if (typeof v === "number" && isFinite(v)) {
    return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="Number">${v}</Data></Cell>`;
  }
  return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`;
};

/**
 * Downloads an Excel workbook (SpreadsheetML, opens in Excel / LibreOffice / Google Sheets).
 * sheets: [{ name, title?, subtitle?, headers: [], rows: [[]], totals?: [] }]
 * Numbers stay numeric so people can sum / chart them.
 */
export const downloadWorkbook = (filename, sheets) => {
  const used = new Set();
  const body = sheets.map((sh) => {
    const cols = Math.max(sh.headers.length, ...sh.rows.map((r) => r.length), 1);
    const lines = [];
    if (sh.title) lines.push(`<Row ss:Height="22">${cellXml(sh.title, "title")}</Row>`);
    if (sh.subtitle) lines.push(`<Row>${cellXml(sh.subtitle, "sub")}</Row>`);
    if (sh.title || sh.subtitle) lines.push("<Row/>");
    lines.push(`<Row ss:Height="20">${sh.headers.map((h) => cellXml(h, "head")).join("")}</Row>`);
    sh.rows.forEach((r) => lines.push(`<Row>${r.map((v) => cellXml(v, typeof v === "number" ? "num" : "")).join("")}</Row>`));
    if (sh.totals) lines.push(`<Row>${sh.totals.map((v) => cellXml(v, "total")).join("")}</Row>`);
    const widths = Array.from({ length: cols }, (_, c) => {
      const longest = Math.max(String(sh.headers[c] ?? "").length, ...sh.rows.slice(0, 200).map((r) => String(r[c] ?? "").length));
      return `<Column ss:Width="${Math.min(260, Math.max(60, longest * 6.5 + 14))}"/>`;
    }).join("");
    return `<Worksheet ss:Name="${xmlEsc(sheetName(sh.name, used))}"><Table>${widths}${lines.join("")}</Table>` +
      `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>${(sh.title || sh.subtitle ? 3 : 0) + 1}</SplitHorizontal><TopRowBottomPane>${(sh.title || sh.subtitle ? 3 : 0) + 1}</TopRowBottomPane></WorksheetOptions></Worksheet>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="title"><Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#0F766E"/></Style>
<Style ss:ID="sub"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#6B7280"/></Style>
<Style ss:ID="head"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0D9488" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="num"><NumberFormat ss:Format="#,##0.00"/></Style>
<Style ss:ID="total"><Font ss:Bold="1"/><Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/><NumberFormat ss:Format="#,##0.00"/></Style>
</Styles>${body}</Workbook>`;
  saveBlob(filename, new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" }));
};
