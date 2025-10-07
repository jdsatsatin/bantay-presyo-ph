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

export const priceService = {
  getPrices: async () => {
    try {
      // Always use today's date
      const targetDate = new Date();
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // JS months are 0-based
      const day = targetDate.getDate();

      // Format month and day as two digits
      const monthStr = month.toString().padStart(2, "0");
      const dayStr = day.toString().padStart(2, "0");
      const monthName = getMonthName(month);

      // Build PDF URL
      const pdfUrl = `https://www.da.gov.ph/wp-content/uploads/${year}/${monthStr}/Daily-Price-Index-${monthName}-${day}-${year}.pdf`;

      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch the PDF file.");
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
