/**
 * Porsche VIN Decoder
 * Decodes Porsche-specific VIN information including model, year, generation, and basic specifications
 */

export interface DecodedVIN {
  valid: boolean;
  vin: string;
  worldManufacturerIdentifier: string;
  manufacturer: string;
  region: string;
  vehicleType: string;
  model: string;
  modelCode: string;
  generation?: string;
  bodyStyle?: string;
  engineType?: string;
  checkDigit: string;
  modelYear: number;
  plantCode: string;
  sequentialNumber: string;
  errorMessages?: string[];
}

// Porsche model codes (Position 4-6 for modern Porsches, position 7-8 for some)
const PORSCHE_MODELS: Record<string, { name: string; generation?: string }> = {
  // 911 Models
  '911': { name: '911' },
  '991': { name: '911', generation: '991' },
  '992': { name: '911', generation: '992' },
  '997': { name: '911', generation: '997' },
  '996': { name: '911', generation: '996' },
  '993': { name: '911', generation: '993' },
  '964': { name: '911', generation: '964' },

  // 718 Models
  '981': { name: '718', generation: '981' }, // Boxster/Cayman 2013-2016
  '982': { name: '718', generation: '982' }, // Boxster/Cayman 2016+
  '987': { name: '718', generation: '987' }, // Boxster/Cayman 2005-2012
  'AE2': { name: '718', generation: '982' }, // GT4 RS specific code

  // Cayenne
  '92A': { name: 'Cayenne', generation: 'E1' }, // First gen
  '958': { name: 'Cayenne', generation: 'E2' }, // Second gen
  '9YA': { name: 'Cayenne', generation: 'E3' }, // Third gen

  // Macan
  '95B': { name: 'Macan', generation: '95B' },

  // Panamera
  '970': { name: 'Panamera', generation: '970' }, // First gen
  '971': { name: 'Panamera', generation: '971' }, // Second gen

  // Taycan
  'Y1A': { name: 'Taycan', generation: 'Y1A' },
};

// WMI codes for Porsche
const PORSCHE_WMI: Record<string, { manufacturer: string; region: string }> = {
  'WP0': { manufacturer: 'Porsche', region: 'Germany' },
  'WP1': { manufacturer: 'Porsche SUV', region: 'Germany' },
  'WPO': { manufacturer: 'Porsche', region: 'Germany' }, // Older variant
  'VWV': { manufacturer: 'Porsche', region: 'Germany' }, // Volkswagen-Porsche
};

// Model year encoding (Position 10)
const MODEL_YEAR_CODES: Record<string, number> = {
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
  'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
  'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
  'Y': 2030, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
  '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

// Plant codes (Position 11)
const PLANT_CODES: Record<string, string> = {
  'S': 'Stuttgart-Zuffenhausen',
  'U': 'Uusikaupunki, Finland (Boxster/Cayman)',
  'L': 'Leipzig',
  'N': 'Neckarsulm',
  'O': 'Osnabrück (contracted)',
  'K': 'Osnabrück, Germany (718 overflow production)',
  '0': 'Various/Special',
  '1': 'Various/Special',
};

// Position 7-8: Body/Engine type codes for 911/718
const BODY_ENGINE_CODES: Record<string, { bodyStyle: string; engineType?: string }> = {
  // 911 codes
  'AA': { bodyStyle: 'Coupe', engineType: 'Base' },
  'AB': { bodyStyle: 'Coupe', engineType: 'S' },
  'BA': { bodyStyle: 'Cabriolet', engineType: 'Base' },
  'BB': { bodyStyle: 'Cabriolet', engineType: 'S' },
  'CA': { bodyStyle: 'Targa', engineType: 'Base' },
  'CB': { bodyStyle: 'Targa', engineType: 'S' },
  'DA': { bodyStyle: 'Turbo Coupe', engineType: 'Turbo' },
  'DB': { bodyStyle: 'Turbo Cabriolet', engineType: 'Turbo' },
  'EA': { bodyStyle: 'Turbo S Coupe', engineType: 'Turbo S' },
  'EB': { bodyStyle: 'Turbo S Cabriolet', engineType: 'Turbo S' },
  'ZA': { bodyStyle: 'GT3', engineType: 'GT3' },
  'ZB': { bodyStyle: 'GT3 RS', engineType: 'GT3 RS' },
  'ZR': { bodyStyle: 'GT2 RS', engineType: 'GT2 RS' },

  // 718 codes
  'PA': { bodyStyle: 'Boxster', engineType: 'Base' },
  'PB': { bodyStyle: 'Boxster S', engineType: 'S' },
  'PC': { bodyStyle: 'Boxster GTS', engineType: 'GTS' },
  'PD': { bodyStyle: 'Boxster Spyder', engineType: 'Spyder' },
  'XA': { bodyStyle: 'Cayman', engineType: 'Base' },
  'XB': { bodyStyle: 'Cayman S', engineType: 'S' },
  'XC': { bodyStyle: 'Cayman GTS', engineType: 'GTS' },
  'XD': { bodyStyle: 'Cayman GT4', engineType: 'GT4' },
  'XE': { bodyStyle: 'Cayman GT4 RS', engineType: 'GT4 RS' },
  'A8': { bodyStyle: 'Cayman GT4 RS', engineType: 'GT4 RS' }, // GT4 RS specific code
};

/**
 * Validates and decodes a Porsche VIN
 * @param vin The VIN to decode
 * @returns Decoded VIN information
 */
export function decodePorscheVIN(vin: string): DecodedVIN {
  const errors: string[] = [];

  // Clean and validate VIN
  const cleanVIN = vin.toUpperCase().trim();

  if (cleanVIN.length !== 17) {
    return {
      valid: false,
      vin: cleanVIN,
      worldManufacturerIdentifier: '',
      manufacturer: '',
      region: '',
      vehicleType: '',
      model: 'Unknown',
      modelCode: '',
      checkDigit: '',
      modelYear: 0,
      plantCode: '',
      sequentialNumber: '',
      errorMessages: [`Invalid VIN length: ${cleanVIN.length} (must be 17 characters)`]
    };
  }

  // Extract VIN components
  const wmi = cleanVIN.substring(0, 3);
  const vds = cleanVIN.substring(3, 9); // Vehicle descriptor section
  const checkDigit = cleanVIN.charAt(8);
  const vis = cleanVIN.substring(9, 17); // Vehicle identifier section
  const modelYearCode = cleanVIN.charAt(9);
  const plantCode = cleanVIN.charAt(10);
  const sequentialNumber = cleanVIN.substring(11, 17);

  // Validate WMI (World Manufacturer Identifier)
  const wmiInfo = PORSCHE_WMI[wmi];
  if (!wmiInfo) {
    errors.push(`Unknown manufacturer code: ${wmi}`);
  }

  // Decode model year
  const modelYear = MODEL_YEAR_CODES[modelYearCode];
  if (!modelYear) {
    errors.push(`Invalid model year code: ${modelYearCode}`);
  }

  // Decode plant
  const plantName = PLANT_CODES[plantCode] || 'Unknown plant';

  // Try to identify model from VDS
  let model = 'Unknown';
  let modelCode = '';
  let generation = '';
  let bodyStyle = '';
  let engineType = '';
  let vehicleType = '';

  // Check positions 4-6 for model code
  const positions456 = cleanVIN.substring(3, 6);
  const positions78 = cleanVIN.substring(6, 8);

  // Try to match known Porsche model codes
  if (PORSCHE_MODELS[positions456]) {
    const modelInfo = PORSCHE_MODELS[positions456];
    model = modelInfo.name;
    modelCode = positions456;
    generation = modelInfo.generation || '';

    // For 911 and 718, positions 7-8 often indicate body/engine
    if (model === '911' || model === '718') {
      const bodyEngineInfo = BODY_ENGINE_CODES[positions78];
      if (bodyEngineInfo) {
        bodyStyle = bodyEngineInfo.bodyStyle;
        engineType = bodyEngineInfo.engineType || '';
      }
    }
  } else {
    // Try alternative patterns
    const position7 = cleanVIN.charAt(6);

    // Position 4 often indicates vehicle type
    const position4 = cleanVIN.charAt(3);
    switch (position4) {
      case 'A':
      case 'B':
      case 'C':
        vehicleType = 'Passenger Car';
        model = '911'; // Most common for these codes
        break;
      case 'Z':
        vehicleType = 'Sports Car';
        model = position7 === 'A' || position7 === 'B' ? '718' : '911';
        break;
      case '9':
        vehicleType = 'SUV';
        model = positions456.startsWith('92') ? 'Cayenne' : 'Macan';
        break;
    }
  }

  // Validate check digit (simplified - real algorithm is more complex)
  const isValid = wmiInfo !== undefined && modelYear !== undefined;

  return {
    valid: isValid && errors.length === 0,
    vin: cleanVIN,
    worldManufacturerIdentifier: wmi,
    manufacturer: wmiInfo?.manufacturer || 'Unknown',
    region: wmiInfo?.region || 'Unknown',
    vehicleType: vehicleType || (wmi === 'WP1' ? 'SUV' : 'Sports Car'),
    model,
    modelCode,
    generation,
    bodyStyle,
    engineType,
    checkDigit,
    modelYear: modelYear || 0,
    plantCode: plantName,
    sequentialNumber,
    errorMessages: errors.length > 0 ? errors : undefined
  };
}

/**
 * Formats decoded VIN data for display
 * @param decoded The decoded VIN data
 * @returns Formatted string for display
 */
export function formatDecodedVIN(decoded: DecodedVIN): string {
  if (!decoded.valid) {
    return 'Invalid VIN';
  }

  const parts = [
    decoded.modelYear,
    decoded.manufacturer,
    decoded.model,
    decoded.generation,
    decoded.bodyStyle,
    decoded.engineType
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Gets a display-friendly model name from decoded VIN
 * @param decoded The decoded VIN data
 * @returns Display model name
 */
export function getModelDisplay(decoded: DecodedVIN): string {
  if (!decoded.valid || decoded.model === 'Unknown') {
    return '';
  }

  // Special formatting for certain models
  if (decoded.model === '718' && decoded.bodyStyle) {
    return `718 ${decoded.bodyStyle}`;
  }

  if (decoded.model === '911' && decoded.generation) {
    return `911 (${decoded.generation})`;
  }

  return decoded.model;
}

/**
 * Gets the trim level from decoded VIN
 * @param decoded The decoded VIN data
 * @returns Trim level or empty string
 */
export function getTrimFromVIN(decoded: DecodedVIN): string {
  if (!decoded.valid) {
    return '';
  }

  // For 911 and 718, engine type often indicates trim
  if (decoded.engineType) {
    return decoded.engineType;
  }

  // For other models, body style might indicate trim
  if (decoded.bodyStyle && !['Coupe', 'Cabriolet', 'Targa'].includes(decoded.bodyStyle)) {
    return decoded.bodyStyle;
  }

  return '';
}