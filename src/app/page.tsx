import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { priceService } from "@/services/price-service";

type CommodityItem = {
  specification: string;
  price: number | null;
};

type Commodity = {
  commodity: string;
  description?: string;
  items: CommodityItem[];
};

export default async function Home() {
  const commodities: Commodity[] = await priceService.getPrices();

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Bantay Presyo PH</h1>
        <p className="text-muted-foreground mt-2">
          Daily retail prices of agricultural commodities in Metro Manila.
        </p>
        {commodities.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {commodities[0].description}
          </p>
        )}
      </header>
      <main>
        {commodities.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {commodities.map((commodity, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-lg font-semibold capitalize">
                  {commodity.commodity.toLowerCase()}
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Specification</TableHead>
                        <TableHead className="text-right">
                          Price (PHP)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commodity.items.map((item, itemIndex) => (
                        <TableRow key={itemIndex}>
                          <TableCell>{item.specification}</TableCell>
                          <TableCell className="text-right font-mono">
                            {item.price !== null
                              ? `₱${item.price.toFixed(2)}`
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">
              Could not load price data. Please try again later.
            </p>
          </div>
        )}
      </main>
      <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>
          Data sourced from the Department of Agriculture. Prices are subject to
          change.
        </p>
      </footer>
    </div>
  );
}
