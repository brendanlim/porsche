// Porsche color normalization mapping
// Maps various color input strings to standardized Porsche color names

const colorMappings: Record<string, string> = {
  // White variations
  'white': 'Carrara White',
  'White': 'Carrara White',
  'carrara white': 'Carrara White',
  'Carrara White': 'Carrara White',
  'Carrara White Metallic': 'Carrara White',
  'Pure White': 'Carrara White',
  'pure white': 'Carrara White',

  // Black variations
  'black': 'Jet Black',
  'Black': 'Jet Black',
  'jet black': 'Jet Black',
  'Jet Black': 'Jet Black',
  'Jet Black Metallic': 'Jet Black',
  'Grey Black Finish': 'Jet Black',

  // GT Silver variations
  'GT Silver': 'GT Silver',
  'gt silver': 'GT Silver',
  'GT Silver Metallic': 'GT Silver',
  'gt silver metallic': 'GT Silver',

  // Rhodium Silver variations
  'Rhodium Silver': 'Rhodium Silver',
  'rhodium silver': 'Rhodium Silver',
  'Rhodium Silver Metallic': 'Rhodium Silver',
  'rhodium silver metallic': 'Rhodium Silver',
  'silver': 'Rhodium Silver',
  'Silver': 'Rhodium Silver',

  // Gray variations
  'Arctic Gray': 'Arctic Gray',
  'arctic gray': 'Arctic Gray',
  'Arctic Grey': 'Arctic Gray',
  'arctic grey': 'Arctic Gray',

  'Agate Gray': 'Agate Gray',
  'agate gray': 'Agate Gray',
  'Agate Grey': 'Agate Gray',
  'agate grey': 'Agate Gray',
  'Agate Gray Metallic': 'Agate Gray',
  'Agate Grey Metallic': 'Agate Gray',

  'Chalk': 'Chalk',
  'chalk': 'Chalk',

  'Carbon Steel Gray': 'Carbon Steel Gray',
  'carbon steel gray': 'Carbon Steel Gray',

  'PTS Slate Grey': 'Slate Grey',
  'Slate Grey': 'Slate Grey',
  'Slate Gray': 'Slate Grey',

  // Red variations
  'Carmine Red': 'Carmine Red',
  'carmine red': 'Carmine Red',

  'Guards Red': 'Guards Red',
  'guards red': 'Guards Red',

  // Blue variations
  'Sapphire Blue': 'Sapphire Blue',
  'sapphire blue': 'Sapphire Blue',
  'Sapphire Blue Metallic': 'Sapphire Blue',

  'Gentian Blue': 'Gentian Blue',
  'gentian blue': 'Gentian Blue',
  'Gentian Blue Metallic': 'Gentian Blue',

  'Miami Blue': 'Miami Blue',
  'miami blue': 'Miami Blue',

  'Blue': 'Sapphire Blue', // Default generic blue to Sapphire Blue
  'blue': 'Sapphire Blue',

  'Dark Blue': 'Dark Blue Metallic',
  'dark blue': 'Dark Blue Metallic',
  'Dark Blue Metallic': 'Dark Blue Metallic',

  'Gemini Blue': 'Gentian Blue', // Likely a typo/variant
  'Shark Blue': 'Shark Blue',
  'shark blue': 'Shark Blue',

  // Yellow variations
  'Racing Yellow': 'Racing Yellow',
  'racing yellow': 'Racing Yellow',
  'Signal Yellow': 'Racing Yellow',
  'signal yellow': 'Racing Yellow',
  'Yellow': 'Racing Yellow',
  'yellow': 'Racing Yellow',

  // Orange variations
  'Gulf Orange': 'Gulf Orange',
  'gulf orange': 'Gulf Orange',
  'Pastel Orange': 'Pastel Orange',
  'pastel orange': 'Pastel Orange',

  // Green variations
  'Python Green': 'Python Green',
  'python green': 'Python Green',
  'Signal Green': 'Signal Green',
  'signal green': 'Signal Green',

  // Purple variations
  'Purple': 'Ultraviolet',
  'purple': 'Ultraviolet',
  'Frozen Berry': 'Frozen Berry',
  'frozen berry': 'Frozen Berry',
};

/**
 * Normalizes a color string to a standardized Porsche color name
 * @param color - The raw color string from scraping
 * @returns The normalized Porsche color name, or the original if no mapping exists
 */
export function normalizeColor(color: string | null | undefined): string | null {
  if (!color) return null;

  // Trim whitespace
  const trimmedColor = color.trim();

  // Check for wrapped/modified cars (these should be filtered out or handled specially)
  if (trimmedColor.toLowerCase().includes('wrap') ||
      trimmedColor.toLowerCase().includes('vinyl') ||
      trimmedColor.toLowerCase().includes('graphics') ||
      trimmedColor.toLowerCase().includes('mounted')) {
    return null; // Return null for wrapped/modified cars
  }

  // Look up in mappings
  const normalizedColor = colorMappings[trimmedColor];

  // If we have a mapping, use it
  if (normalizedColor) {
    return normalizedColor;
  }

  // If no mapping found, check if it's already a proper color name
  // (starts with capital letter and doesn't contain weird phrases)
  if (/^[A-Z][a-zA-Z\s]+$/.test(trimmedColor) && trimmedColor.split(' ').length <= 4) {
    return trimmedColor;
  }

  // Otherwise return null (invalid color)
  return null;
}

/**
 * Get all standardized Porsche colors
 * @returns Array of unique standardized color names
 */
export function getStandardColors(): string[] {
  const uniqueColors = new Set(Object.values(colorMappings));
  return Array.from(uniqueColors).sort();
}

/**
 * Check if a color needs normalization
 * @param color - The color string to check
 * @returns true if the color is different after normalization
 */
export function needsNormalization(color: string | null | undefined): boolean {
  if (!color) return false;
  const normalized = normalizeColor(color);
  return normalized !== null && normalized !== color.trim();
}