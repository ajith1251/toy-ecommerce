export * from './order';
export * from './checkout';

export type AgeGroup = 'kids' | 'teens' | 'adults';

export type ToyCategory =
  | 'action-figures'
  | 'board-games'
  | 'stem-toys'
  | 'plush'
  | 'outdoor'
  | 'arts-crafts'
  | 'toy-guns'
  | 'toy-cars'
  | 'dolls'
  | 'trains'
  | 'instruments'
  | 'stem-robotics'
  | 'water-toys'
  | 'sand-beach'
  | 'play-dough'
  | 'bubbles'
  | 'puppets'
  | 'magnetic-tiles'
  | 'walkie-talkies'
  | 'science-lab'
  | 'collectibles'
  | 'building-sets'
  | 'remote-control'
  | 'puzzles'
  | 'airsoft'
  | 'die-cast'
  | 'rc-vehicles'
  | 'model-kits'
  | 'home-automation'
  | 'vintage-retro'
  | 'chess-strategy'
  | 'camping'
  | 'photography'
  | 'smart-home'
  | 'headphones'
  | 'keyboards'
  | 'fitness'
  | 'projectors'
  | 'fidget'
  | 'wine-bar'
  | 'tech-gadgets'
  | 'war-games'
  | 'skate-sports'
  | 'diy-electronics'
  | 'sneaker-customs'
  | 'drone-racing'
  | 'martial-arts'
  | 'beat-making'
  | 'coding-kits'
  | 'parkour-gear'
  | 'magic-tricks'
  | 'art-supplies-pro';

export interface Toy {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: ToyCategory;
  ageGroup: AgeGroup;
  ageRange: string;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  isNew?: boolean;
  isBestseller?: boolean;
  inStock: boolean;
  brand: string;
}

export interface CartItem extends Toy {
  quantity: number;
}

export interface CategoryInfo {
  id: ToyCategory;
  name: string;
  icon: string;
  ageGroup: AgeGroup;
  color: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Present for admins — drives the /admin area guard and nav link. */
  role?: 'customer' | 'admin';
  createdAt: string;
}

export interface Address {
  id: number;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}
