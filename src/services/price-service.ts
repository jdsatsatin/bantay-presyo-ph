export const priceService = {
  getPrices: async () => {
    try {
      const apiUrl = "/api/prices";
      const res = await fetch(apiUrl);

      if (!res.ok) {
        throw new Error("Failed to fetch prices");
      }

      const { data } = await res.json();
      return data;
    } catch (error) {
      throw new Error("Error fetching prices");
    }
  },
};
