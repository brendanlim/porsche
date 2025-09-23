/**
 * Maps clean model names to source-specific URL slugs
 */

export type CleanModelName = '911' | 'cayman' | 'boxster';
export type DataSource = 'bat' | 'classic.com' | 'cars.com' | 'edmunds' | 'carsandbids' | 'autotrader' | 'cargurus';

const MODEL_SLUG_MAP: Record<DataSource, Record<CleanModelName, string>> = {
  'bat': {
    '911': 'porsche-911',
    'cayman': 'porsche-718-cayman',  // Includes both 718 and pre-718 Caymans
    'boxster': 'porsche-boxster'      // Includes both 718 and pre-718 Boxsters
  },
  'classic.com': {
    '911': '911',
    'cayman': 'cayman',
    'boxster': 'boxster'
  },
  'cars.com': {
    '911': 'porsche-911',
    'cayman': 'porsche-cayman',
    'boxster': 'porsche-boxster'
  },
  'edmunds': {
    '911': '911',
    'cayman': 'cayman',
    'boxster': 'boxster'
  },
  'carsandbids': {
    '911': 'porsche-911',
    'cayman': 'porsche-cayman',
    'boxster': 'porsche-718-boxster'
  },
  'autotrader': {
    '911': '911',
    'cayman': 'cayman',
    'boxster': 'boxster'
  },
  'cargurus': {
    '911': 'porsche-911',
    'cayman': 'porsche-cayman',
    'boxster': 'porsche-boxster'
  }
};

/**
 * Get the source-specific slug for a clean model name
 */
export function getModelSlug(model: CleanModelName, source: DataSource): string {
  const sourceMap = MODEL_SLUG_MAP[source];
  if (!sourceMap) {
    throw new Error(`Unknown source: ${source}`);
  }

  const slug = sourceMap[model];
  if (!slug) {
    throw new Error(`Unknown model ${model} for source ${source}`);
  }

  return slug;
}

/**
 * Check if a string is a valid clean model name
 */
export function isCleanModelName(model: string): model is CleanModelName {
  return model === '911' || model === 'cayman' || model === 'boxster';
}

/**
 * Get all clean model names
 */
export function getAllCleanModels(): CleanModelName[] {
  return ['911', 'cayman', 'boxster'];
}

/**
 * Convert source-specific slug back to clean model name (if possible)
 */
export function slugToCleanModel(slug: string, source: DataSource): CleanModelName | null {
  const sourceMap = MODEL_SLUG_MAP[source];
  if (!sourceMap) return null;

  for (const [model, sourceSlug] of Object.entries(sourceMap)) {
    if (sourceSlug === slug) {
      return model as CleanModelName;
    }
  }

  return null;
}