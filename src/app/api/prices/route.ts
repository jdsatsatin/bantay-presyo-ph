import { pdf } from "pdf-parse";
import { NextResponse } from "next/server";

export async function GET() {
  const response = await fetch(
    "https://www.da.gov.ph/wp-content/uploads/2025/10/Daily-Price-Index-October-6-2025.pdf"
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch the PDF file." },
      { status: 500 }
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const pdfData = await pdf(Buffer.from(arrayBuffer));
  const text = pdfData.text;

  // Parse structured data from the extracted text
  type CommodityItem = { specification: string; price: number | null };
  type Commodity = { commodity: string; items: CommodityItem[] };
  function parseCommodityData(text: string): Commodity[] {
    const lines = text.split(/\r?\n/);
    const commodities: Commodity[] = [];
    let currentCommodity: Commodity | null = null;
    let commodityRegex = /^[A-Z][A-Z\s\-\/]+$/;
    let itemRegex = /^(.+?)\s+(\d+(?:\.\d+)?|n\/a)$/;
    const unwantedCommodities = [
      "DAILY PRICE INDEX",
      "PREVAILING",
      "RETAIL PRICE PER",
      "OTHER LIVESTOCK MEAT",
    ];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      // Detect commodity section
      if (
        commodityRegex.test(line) &&
        !line.includes("Page") &&
        !line.includes("SPECIFICATION") &&
        !line.includes("UNIT") &&
        !unwantedCommodities.includes(line)
      ) {
        if (currentCommodity) commodities.push(currentCommodity);
        currentCommodity = { commodity: line, items: [] };
        continue;
      }
      // Detect item line
      const itemMatch = itemRegex.exec(line);
      if (currentCommodity && itemMatch && !itemMatch[1].includes("Page")) {
        (currentCommodity.items as CommodityItem[]).push({
          specification: itemMatch[1].trim(),
          price: itemMatch[2] === "n/a" ? null : parseFloat(itemMatch[2]),
        });
      }
    }
    if (currentCommodity) commodities.push(currentCommodity);
    return commodities;
  }

  const structuredData = parseCommodityData(text);
  return NextResponse.json({ data: structuredData });
}
