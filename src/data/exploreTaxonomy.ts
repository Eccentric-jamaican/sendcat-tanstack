export type TaxonomyCategory = {
  categoryId: string;
  categoryName: string;
  path?: string;
};

const GRADIENTS = [
  "from-[#f6d365] via-[#fda085] to-[#fbc2eb]",
  "from-[#a1c4fd] via-[#c2e9fb] to-[#d4fc79]",
  "from-[#fbc2eb] via-[#a6c1ee] to-[#84fab0]",
  "from-[#fccb90] via-[#d57eeb] to-[#a18cd1]",
  "from-[#84fab0] via-[#8fd3f4] to-[#a6c1ee]",
  "from-[#ff9a9e] via-[#fad0c4] to-[#fbc2eb]",
  "from-[#cfd9df] via-[#e2ebf0] to-[#fbc2eb]",
  "from-[#fddb92] via-[#d1fdff] to-[#a1c4fd]",
  "from-[#ffecd2] via-[#fcb69f] to-[#f5f7fa]",
  "from-[#c2e9fb] via-[#a1c4fd] to-[#d4fc79]",
];

const CURATED_CATEGORY_PRIORITY = [
  "clothing shoes accessories",
  "consumer electronics",
  "computers tablets networking",
  "cell phones accessories",
  "home garden",
  "health beauty",
  "jewelry watches",
  "sporting goods",
  "toys hobbies",
  "business industrial",
  "automotive",
  "collectibles",
];

function normalizeCategoryName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getGradientForCategory(name: string) {
  const normalized = normalizeCategoryName(name);
  const hash = normalized
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function selectCuratedCategories(categories: TaxonomyCategory[]) {
  const enriched = categories.map((category) => ({
    ...category,
    normalizedName: normalizeCategoryName(category.categoryName),
  }));

  const selected: TaxonomyCategory[] = [];
  for (const target of CURATED_CATEGORY_PRIORITY) {
    const match = enriched.find(
      (entry) =>
        entry.normalizedName === target ||
        entry.normalizedName.includes(target),
    );
    if (match && !selected.find((entry) => entry.categoryId === match.categoryId)) {
      selected.push(match);
    }
  }

  if (selected.length >= 6) return selected;

  for (const entry of enriched) {
    if (!selected.find((item) => item.categoryId === entry.categoryId)) {
      selected.push(entry);
    }
    if (selected.length >= 12) break;
  }

  return selected;
}

export const DEFAULT_SUBCATEGORY_LIMIT = 12;
