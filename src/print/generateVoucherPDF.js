import { jsPDF } from "jspdf";

const GREEN = [26, 92, 56];
const BLACK = [20, 20, 20];
const BLUE = [30, 30, 150];

function drawVoucher(doc, data, logoImg) {
  const {
    voucherNo = "",
    date = "",
    debit = "",
    credit = "",
    items = [],
    total = "",
  } = data;

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 45;
  const rightX = 155;

  // ---- Logo (USC seal image) — left side ----
  const logoSize = 100;
  const logoCx = 80;
  const logoCy = 100;

  if (logoImg) {
    doc.addImage(logoImg, "PNG", logoCx - logoSize / 2, logoCy - logoSize / 2, logoSize, logoSize);
  } else {
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1.5);
    doc.circle(logoCx, logoCy, logoSize / 2 - 5, "S");
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...GREEN);
    doc.text("USC", logoCx, logoCy + 2, { align: "center" });
  }

  // ---- Header text (right column) ----
  let y = 70;

  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...GREEN);
  doc.text("UNIVERSITY OF THE SOUTHERN CARIBBEAN", rightX, y);

  y += 20;
  doc.setFont("times", "normal");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text("Inter-Department Transfer Voucher", rightX, y);

  // ---- No. / Date row ----
  y += 20;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text("No.", rightX, y);
  doc.text(String(voucherNo), rightX + 30, y);

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("Date", pageW - 170, y);
  doc.setLineDashPattern([3, 3], 0);
  doc.setLineWidth(0.5);
  doc.line(pageW - 148, y + 1, pageW - 45, y + 1);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.2);

  if (date) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLUE);
    doc.text(String(date), pageW - 143, y - 2);
    doc.setTextColor(...BLACK);
  }

  // ---- Debit line ----
  y += 18;
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("Debit", rightX, y);
  doc.setLineDashPattern([3, 3], 0);
  doc.setLineWidth(0.5);
  doc.line(rightX + 32, y + 1, pageW - 170, y + 1);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.2);
  doc.text("Department", pageW - 165, y);

  if (debit) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLUE);
    doc.text(String(debit), rightX + 40, y - 2);
    doc.setTextColor(...BLACK);
  }

  // ---- Credit line ----
  y += 18;
  doc.setFont("times", "normal");
  doc.text("Credit", rightX, y);
  doc.setLineDashPattern([3, 3], 0);
  doc.setLineWidth(0.5);
  doc.line(rightX + 35, y + 1, pageW - 170, y + 1);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.2);
  doc.text("Department", pageW - 165, y);

  if (credit) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLUE);
    doc.text(String(credit), rightX + 42, y - 2);
    doc.setTextColor(...BLACK);
  }

  y += 18;
  doc.setFont("times", "normal");
  doc.text("for the following items:", rightX, y);

  y += 15;

  // ---- Table ----
  const tableTop = y;
  const tableLeft = marginX;
  const tableRight = pageW - marginX;
  const colQtyW = 65;
  const colPriceW = 90;
  const colDescW = tableRight - tableLeft - colQtyW - colPriceW;

  const colQtyX = tableLeft;
  const colDescX = colQtyX + colQtyW;
  const colPriceX = colDescX + colDescW;

  const headerH = 22;
  const rowH = 20;
  const numRows = Math.max(7, items.length + 1);

  const tableBottom = tableTop + headerH + rowH * numRows;
  const totalRowY = tableTop + headerH + rowH * (numRows - 1);

  doc.setLineWidth(0.8);
  doc.setDrawColor(...BLACK);

  // outer border
  doc.rect(tableLeft, tableTop, tableRight - tableLeft, tableBottom - tableTop);
  // vertical dividers — stop description divider at total row
  doc.line(colDescX, tableTop, colDescX, totalRowY);
  doc.line(colPriceX, tableTop, colPriceX, tableBottom);
  // header bottom line
  doc.line(tableLeft, tableTop + headerH, tableRight, tableTop + headerH);
  // row lines
  for (let i = 1; i <= numRows; i++) {
    const ly = tableTop + headerH + rowH * i;
    doc.line(tableLeft, ly, tableRight, ly);
  }

  // header labels — regular weight serif
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Quantity", colQtyX + colQtyW / 2, tableTop + 14, { align: "center" });
  doc.text("Description", colDescX + colDescW / 2, tableTop + 14, { align: "center" });
  doc.text("Price", colPriceX + colPriceW / 2, tableTop + 14, { align: "center" });

  // item rows
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...BLUE);

  items.forEach((item, i) => {
    const rowTop = tableTop + headerH + rowH * i;
    if (i >= numRows - 1) return;
    if (item.qty) {
      doc.text(String(item.qty), colQtyX + colQtyW / 2, rowTop + rowH - 6, { align: "center" });
    }
    if (item.desc) {
      doc.text(String(item.desc), colDescX + 8, rowTop + rowH - 6);
    }
    if (item.price) {
      doc.text(String(item.price), colPriceX + colPriceW / 2, rowTop + rowH - 6, { align: "center" });
    }
  });

  doc.setTextColor(...BLACK);

  // Total row — right-aligned in description cell, blank price cell
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("Total:", colPriceX - 10, totalRowY + 14, { align: "right" });

  if (total) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLUE);
    doc.text(String(total), colPriceX + colPriceW / 2, totalRowY + 14, { align: "center" });
    doc.setTextColor(...BLACK);
  }

  y = tableBottom + 25;

  // ---- Signature section ----
  const sigLeftCenter = marginX + 126;
  const sigRightCenter = pageW / 2 + 126;
  const sigLineWidth = 190;

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("Signed for Issuing Department:", sigLeftCenter, y, { align: "center" });
  doc.text("Signed for Receiving Department:", sigRightCenter, y, { align: "center" });

  y += 35;
  doc.setLineDashPattern([4, 4], 0);
  doc.setLineWidth(0.6);
  doc.line(sigLeftCenter - sigLineWidth / 2, y, sigLeftCenter + sigLineWidth / 2, y);
  doc.line(sigRightCenter - sigLineWidth / 2, y, sigRightCenter + sigLineWidth / 2, y);
  doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.2);

  return doc;
}

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = "/usc.png";
  });
}

export function buildVoucherPDF(data = {}, logoImg = null) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawVoucher(doc, data, logoImg);
  return doc;
}

export async function generateVoucherPDF(data = {}, filename = "USC_Inter-Department_Transfer_Voucher.pdf") {
  const logoImg = await loadLogo();
  const doc = buildVoucherPDF(data, logoImg);
  doc.save(filename);
  return doc;
}

export default generateVoucherPDF;
