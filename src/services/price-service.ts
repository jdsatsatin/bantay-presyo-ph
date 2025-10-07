import { pdf } from "pdf-parse";

function getMonthName(month: number) {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][month - 1];
}

async function fetchAndParsePDF(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthStr = month.toString().padStart(2, "0");
  const dayStr = day.toString().padStart(2, "0");
  const monthName = getMonthName(month);
  const pdfUrl = `https://www.da.gov.ph/wp-content/uploads/${year}/${monthStr}/Daily-Price-Index-${monthName}-${day}-${year}.pdf`;

  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch the PDF file.");
  }
  const arrayBuffer = await response.arrayBuffer();
  const pdfData = await pdf(Buffer.from(arrayBuffer));
  return pdfData.text;
}

export const priceService = {
  getPrices: async () => {
    try {
      // Always use today's date
      const today = new Date();
      let text: string;
      try {
        text = await fetchAndParsePDF(today);
      } catch (error) {
        // If today's fetch fails, try yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        text = await fetchAndParsePDF(yesterday);
      }

      // Parse structured data from the extracted text
      type CommodityItem = { specification: string; price: number | null };
      type Commodity = { commodity: string; items: CommodityItem[] };
      function parseCommodityData(text: string): Commodity[] {
        const lines = text.split(/\r?\n/);
        const commodities: Commodity[] = [];
        let currentCommodity: Commodity | null = null;
        const commodityRegex = /^[A-Z][A-Z\s\-\/]+$/;
        const itemRegex = /^(.+?)\s+(\d+(?:\.\d+)?|n\/a)$/;
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
      const filteredData = structuredData.filter(
        (commodity) => commodity.items.length > 0
      );
      return filteredData;
    } catch (error) {
      throw new Error("Error fetching prices", { cause: error });
    }
  },
};
