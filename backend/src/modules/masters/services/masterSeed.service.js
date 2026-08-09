import { companyRepository } from '../repositories/company.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { unitRepository } from '../repositories/unit.repository.js';
import { logger } from '../../../config/logger.config.js';

const DEFAULT_COMPANIES = [
  { name: 'Coromandel', shortName: 'CORO' },
  { name: 'IFFCO', shortName: 'IFFCO' },
  { name: 'Bayer', shortName: 'BAYER' },
  { name: 'UPL', shortName: 'UPL' },
  { name: 'FMC', shortName: 'FMC' },
  { name: 'Rallis', shortName: 'RALLIS' },
  { name: 'PI Industries', shortName: 'PI' },
  { name: 'Syngenta', shortName: 'SYNG' },
  { name: 'BASF', shortName: 'BASF' },
  { name: 'Godrej Agrovet', shortName: 'GODREJ' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Fertilizers', slug: 'fertilizers', icon: 'Layers', color: 'emerald', description: 'Chemical and organic fertilizers' },
  { name: 'Seeds', slug: 'seeds', icon: 'Sprout', color: 'emerald', description: 'High yield agri seeds' },
  { name: 'Pesticides', slug: 'pesticides', icon: 'ShieldAlert', color: 'purple', description: 'Insecticides, Fungicides, Herbicides' },
  { name: 'Plant Growth Regulators', slug: 'plant-growth-regulators', icon: 'Sparkles', color: 'amber', description: 'Hormones and growth stimulants' },
  { name: 'Organic', slug: 'organic', icon: 'Leaf', color: 'emerald', description: 'Organic bio-fertilizers and manure' },
  { name: 'Micronutrients', slug: 'micronutrients', icon: 'Sparkles', color: 'blue', description: 'Zinc, Boron, Sulphur, Iron' },
  { name: 'Animal Feed', slug: 'animal-feed', icon: 'Grid', color: 'orange', description: 'Cattle & poultry feed' },
  { name: 'Others', slug: 'others', icon: 'Grid', color: 'orange', description: 'Miscellaneous agri products' },
];

const DEFAULT_UNITS = [
  { name: 'Bag', shortName: 'bag', allowDecimals: false },
  { name: 'Bottle', shortName: 'btl', allowDecimals: false },
  { name: 'Kg', shortName: 'kg', allowDecimals: true },
  { name: 'Gram', shortName: 'g', allowDecimals: true },
  { name: 'Litre', shortName: 'l', allowDecimals: true },
  { name: 'ML', shortName: 'ml', allowDecimals: true },
  { name: 'Packet', shortName: 'pkt', allowDecimals: false },
  { name: 'Piece', shortName: 'pc', allowDecimals: false },
  { name: 'Box', shortName: 'box', allowDecimals: false },
  { name: 'Tin', shortName: 'tin', allowDecimals: false },
];

export const masterSeedService = {
  async seedAllMasters() {
    // No automatic data creation
    return;
  },
};
