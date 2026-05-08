import { MuseumMineral, MuseumModifier } from '../types';

const TREASURED_ALLOWED_MINERALS = new Set([
  'Copper',
  'Seashell',
  'Obsidian',
  'Gold',
  'Platinum',
  'Pearl',
  'Topaz',
  'Malachite',
  'Electrum',
  'Zircon',
  'Silver',
  'Blue Ice',
  'Neodymium',
  'Smoky Quartz',
  'Coral',
  'Titanium',
  'Sapphire',
  'Ruby',
  'Peridot',
  'Silver Clamshell',
  'Onyx',
  'Diopside',
  'Meteoric Iron',
  'Lapis Lazuli',
  'Jade',
  'Ammonite Fossil',
  'Glacial Quartz',
  'Osmium',
  'Opal',
  'Aurorite',
  'Bone',
  'Mercury',
  'Pyronium',
  'Iridium',
  'Emerald',
  'Moonstone',
  'Golden Pearl',
  'Cobalt',
  'Borealite',
  'Rose Gold',
  'Bismuth',
  'Specterite',
  'Dragon Bone',
  'Cinnabar',
  'Fire Opal',
  'Uranium',
  'Palladium',
  'Catseye',
  'Aetherite',
  'Diamond',
  'Tourmaline',
  'Aquamarine',
  'Vortessence',
  'Mythril',
  'Pink Diamond',
  'Inferlume',
  'Flarebloom',
  'Painite',
  'Chrysoberyl',
  'Star Garnet',
  'Bloodstone'
]);

export function isTreasuredModifier(modifier?: Pick<MuseumModifier, 'id' | 'name'> | null): boolean {
  return modifier?.id === 'treasured' || modifier?.name.toLowerCase() === 'treasured';
}

export function canUseMuseumModifier(
  mineral?: Pick<MuseumMineral, 'name'> | null,
  modifier?: Pick<MuseumModifier, 'id' | 'name'> | null
): boolean {
  if (!modifier || !isTreasuredModifier(modifier)) return true;
  if (!mineral) return false;

  return TREASURED_ALLOWED_MINERALS.has(mineral.name);
}

export function filterValidMuseumModifiers<T extends Pick<MuseumModifier, 'id' | 'name'>>(
  mineral: Pick<MuseumMineral, 'name'> | null | undefined,
  modifiers: T[]
): T[] {
  return modifiers.filter((modifier) => canUseMuseumModifier(mineral, modifier));
}
