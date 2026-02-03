import { action } from "./_generated/server";
import { v } from "convex/values";
import { searchEbayItems } from "./ebay";

export const getExploreItems = action({
  args: {
    section: v.optional(v.string()), // "trending" | "new"
    categoryId: v.optional(v.string()),
    subCategoryId: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const fallbackQuery =
      args.q?.trim() || args.categoryName?.trim() || "trending products";
    let query = fallbackQuery;

    if (args.categoryId) {
      query = args.categoryName?.trim() || args.q?.trim() || "trending products";
    } else if (args.section === "trending") {
      query = "trending technology gadgets";
    } else if (args.section === "new") {
      query = "new arrivals home decor";
    }

    // Reuse existing efficient eBay search helper
    const items = await searchEbayItems(query, {
      limit: args.limit ?? 60,
      categoryId: args.categoryId,
    });

    return items.map(
      (item: {
        id: string;
        title: string;
        image: string;
        sellerName?: string;
        price: string;
        url: string;
      }) => ({
        id: item.id,
        title: item.title,
        image: item.image,
        brand: item.sellerName || "eBay Seller",
        rating: Math.random() * 1.5 + 3.5,
        price: item.price,
        url: item.url,
      }),
    );
  },
});
