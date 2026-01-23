export interface ExploreCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export const featuredCards: ExploreCard[] = [
  {
    id: '1',
    title: 'Spring Fashion 2024',
    subtitle: 'Trending Now',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '2',
    title: 'Modern Interior Design',
    subtitle: 'Home Decor',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: '3',
    title: 'Gourmet Recipes',
    subtitle: 'Culinary Arts',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800',
  },
];

export const categories: Category[] = [
  { id: 'c1', name: 'Nature', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400' },
  { id: 'c2', name: 'Travel', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=400' },
  { id: 'c3', name: 'Architecture', image: 'https://images.unsplash.com/photo-1487958449913-d9279906c275?auto=format&fit=crop&q=80&w=400' },
  { id: 'c4', name: 'Art', image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=400' },
  { id: 'c5', name: 'Tech', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400' },
  { id: 'c6', name: 'Fitness', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=400' },
  { id: 'c7', name: 'Movies', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400' },
  { id: 'c8', name: 'Music', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=400' },
];

export interface ShopItem {
  id: string;
  title: string;
  image: string;
  brand: string;
  rating: number;
}

export interface ShopSection {
  id: string;
  title: string;
  items: ShopItem[];
}

export const shopSections: ShopSection[] = [
  {
    id: 'trending',
    title: 'Trending',
    items: [
      { id: 't1', title: 'Minimalist Setup', image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&q=80&w=400', brand: 'TechSpace', rating: 4.8 },
      { id: 't2', title: 'Ergonomic Chair', image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&q=80&w=400', brand: 'ComfortPlus', rating: 4.9 },
      { id: 't3', title: 'Wireless Buds', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400', brand: 'AudioPro', rating: 4.7 },
      { id: 't4', title: 'Smart Watch', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=400', brand: 'WristTech', rating: 4.6 },
      { id: 't5', title: 'Mechanical Keeb', image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=400', brand: 'KeyMaster', rating: 4.9 },
    ]
  },
  {
    id: 'new',
    title: 'New Arrivals',
    items: [
      { id: 'n1', title: 'Abstract Art', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=400', brand: 'GalleryOne', rating: 4.5 },
      { id: 'n2', title: 'Ceramic Vase', image: 'https://images.unsplash.com/photo-1578749556935-ef887c462ead?auto=format&fit=crop&q=80&w=400', brand: 'HomeDeco', rating: 4.8 },
      { id: 'n3', title: 'Travel Bag', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=400', brand: 'Wanderlust', rating: 4.7 },
      { id: 'n4', title: 'Desk Lamp', image: 'https://images.unsplash.com/photo-1507473888900-52a11b6d8d66?auto=format&fit=crop&q=80&w=400', brand: 'Lumina', rating: 4.6 },
      { id: 'n5', title: 'Coffee Maker', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=400', brand: 'BrewMaster', rating: 4.9 },
    ]
  }
];
