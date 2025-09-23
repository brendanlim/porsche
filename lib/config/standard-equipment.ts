/**
 * Standard Equipment Configuration
 *
 * This file defines what equipment comes STANDARD on each model/trim/generation combination.
 * These should NOT be shown as "high-value options" since they're included in the base price.
 */

export interface StandardEquipment {
  model: string;
  trim: string;
  generation?: string; // Optional - if not specified, applies to all generations
  yearRange?: { start: number; end?: number }; // Optional year range
  standardFeatures: string[];
}

export const STANDARD_EQUIPMENT: StandardEquipment[] = [
  // ============ 911 GT3 ============
  {
    model: '911',
    trim: 'GT3',
    generation: '996',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Leather Seats',
      'Coil-over Suspension',
      '2-Seat Configuration'
    ]
  },
  {
    model: '911',
    trim: 'GT3',
    generation: '997.1',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats',
      'PASM',
      'Porsche Active Suspension Management'
    ]
  },
  {
    model: '911',
    trim: 'GT3',
    generation: '997.2',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats',
      'PASM',
      'Porsche Active Suspension Management'
    ]
  },
  {
    model: '911',
    trim: 'GT3',
    generation: '991.1',
    standardFeatures: [
      'PDK', // PDK ONLY - no manual option
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes',
      'Full Bucket Seats',
      'Carbon Fiber Racing Seats',
      'Rear-Wheel Steering',
      'Rear-Axle Steering'
    ]
  },
  {
    model: '911',
    trim: 'GT3',
    generation: '991.2',
    standardFeatures: [
      // Both manual and PDK offered, neither is "standard" - customer choice
      'Steel Brakes',
      'Full Bucket Seats',
      'Carbon Fiber Racing Seats',
      'Rear-Wheel Steering',
      'Rear-Axle Steering'
    ]
  },
  {
    model: '911',
    trim: 'GT3',
    generation: '992',
    standardFeatures: [
      // Both manual and PDK offered as no-cost options
      'PCCB', // STANDARD for first time ever
      'Porsche Ceramic Composite Brakes',
      'Sport Chrono Package', // STANDARD for first time
      'Sport Chrono',
      'Full Bucket Seats',
      'CFRP Bucket Seats',
      'Rear-Wheel Steering',
      'Rear-Axle Steering',
      'Front Axle Lift',
      'Front Lift System',
      'LED Headlights',
      'PDLS Plus',
      'Titanium Exhaust',
      'Double-Wishbone Front Suspension'
    ]
  },

  // ============ 911 GT3 RS ============
  {
    model: '911',
    trim: 'GT3 RS',
    generation: '997.1',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes', // PCCB was optional
      'Lightweight Bucket Seats',
      'PASM',
      'Porsche Active Suspension Management'
    ]
  },
  {
    model: '911',
    trim: 'GT3 RS',
    generation: '997.2',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes', // PCCB was optional
      'Lightweight Bucket Seats',
      'PASM',
      'Porsche Active Suspension Management'
    ]
  },
  {
    model: '911',
    trim: 'GT3 RS',
    generation: '991.1',
    standardFeatures: [
      'PDK', // PDK ONLY
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes', // PCCB was optional
      'Full Bucket Seats',
      'Carbon Fiber Racing Seats',
      'Rear-Wheel Steering',
      'Rear-Axle Steering'
    ]
  },
  {
    model: '911',
    trim: 'GT3 RS',
    generation: '991.2',
    standardFeatures: [
      'PDK', // PDK ONLY
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes', // PCCB was optional
      'Full Bucket Seats',
      'Carbon Fiber Racing Seats',
      'Rear-Wheel Steering',
      'Rear-Axle Steering',
      'Magnesium Roof'
    ]
  },
  {
    model: '911',
    trim: 'GT3 RS',
    generation: '992',
    standardFeatures: [
      'PDK', // PDK ONLY
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes', // PCCB was optional but very common
      'Full Bucket Seats',
      'CFRP Bucket Seats',
      'Sport Chrono Package',
      'Sport Chrono',
      'Rear-Wheel Steering',
      'Rear-Axle Steering',
      'Front Axle Lift',
      'Front Lift System',
      'DRS System',
      'Active Aerodynamics'
    ]
  },

  // ============ 718 Cayman GT4 ============
  {
    model: '718 Cayman',
    trim: 'GT4',
    generation: '981',
    yearRange: { start: 2015, end: 2016 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats',
      'PASM'
    ]
  },
  {
    model: '718 Cayman',
    trim: 'GT4',
    generation: '982',
    yearRange: { start: 2019, end: 2024 },
    standardFeatures: [
      'Manual', // PDK became optional in 2021
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats',
      'PASM',
      'GT4 Aero Kit'
    ]
  },
  {
    model: 'Cayman',
    trim: 'GT4',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats',
      'PASM'
    ]
  },

  // ============ 718 Cayman GT4 RS ============
  {
    model: '718 Cayman',
    trim: 'GT4 RS',
    generation: '982',
    yearRange: { start: 2021 },
    standardFeatures: [
      'PDK', // PDK ONLY - no manual option
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes', // PCCB was optional
      'Sport Seats',
      'PASM',
      'GT4 RS Aero Kit'
    ]
  },
  {
    model: 'Cayman',
    trim: 'GT4 RS',
    standardFeatures: [
      'PDK',
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Steel Brakes',
      'Sport Seats',
      'PASM'
    ]
  },

  // ============ 718 Spyder RS ============
  {
    model: '718 Spyder',
    trim: 'RS',
    standardFeatures: [
      'PDK', // PDK only
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Bucket Seats',
      'PCCB',
      'Porsche Ceramic Composite Brakes',
      'Sport Chrono Package',
      'PASM',
      'Front Lift System'
    ]
  },
  {
    model: 'Boxster',
    trim: 'Spyder RS',
    standardFeatures: [
      'PDK',
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Bucket Seats',
      'PCCB',
      'Porsche Ceramic Composite Brakes',
      'Sport Chrono Package',
      'PASM'
    ]
  },

  // ============ 911 Turbo/Turbo S ============
  {
    model: '911',
    trim: 'Turbo',
    generation: '991',
    standardFeatures: [
      'PDK',
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'All-Wheel Drive',
      'AWD',
      'Sport Chrono Package',
      'PASM',
      'Steel Brakes'
    ]
  },
  {
    model: '911',
    trim: 'Turbo',
    generation: '992',
    standardFeatures: [
      'PDK',
      '8-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'All-Wheel Drive',
      'AWD',
      'Sport Chrono Package',
      'PASM',
      'Steel Brakes',
      'Rear-Axle Steering',
      'Rear-Wheel Steering'
    ]
  },
  {
    model: '911',
    trim: 'Turbo S',
    generation: '991',
    standardFeatures: [
      'PDK',
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'All-Wheel Drive',
      'AWD',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'PCCB', // Standard on Turbo S
      'Porsche Ceramic Composite Brakes',
      'Sport Exhaust',
      'Dynamic Engine Mounts'
    ]
  },
  {
    model: '911',
    trim: 'Turbo S',
    generation: '992',
    standardFeatures: [
      'PDK',
      '8-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'All-Wheel Drive',
      'AWD',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'PCCB', // Standard on Turbo S
      'Porsche Ceramic Composite Brakes',
      'Sport Exhaust',
      'Rear-Axle Steering',
      'Rear-Wheel Steering',
      'Dynamic Engine Mounts',
      'Adaptive Sport Seats'
    ]
  },

  // ============ 911 GT2 RS ============
  {
    model: '911',
    trim: 'GT2 RS',
    generation: '991',
    standardFeatures: [
      'PDK',
      '7-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Full Bucket Seats',
      'CFRP Bucket Seats',
      'Steel Brakes', // PCCB was optional but very common
      'Sport Chrono Package',
      'Sport Chrono',
      'Rear-Axle Steering',
      'Rear-Wheel Steering'
    ]
  },

  // ============ 911 Carrera GTS ============
  {
    model: '911',
    trim: 'Carrera GTS',
    generation: '997',
    yearRange: { start: 2011, end: 2012 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'PASM',
      'Porsche Active Suspension Management',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Porsche Torque Vectoring',
      'PTV',
      'Steel Brakes',
      'Sport Seats',
      'Alcantara Trim',
      'LED Taillights'
    ]
  },
  {
    model: '911',
    trim: 'Carrera GTS',
    generation: '991',
    yearRange: { start: 2014, end: 2019 },
    standardFeatures: [
      'Manual',
      '7-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Dynamic Engine Mounts',
      'PASM',
      'Porsche Active Suspension Management',
      'Porsche Torque Vectoring',
      'PTV',
      'Steel Brakes',
      'PDLS',
      'Porsche Dynamic Lighting System'
    ]
  },
  {
    model: '911',
    trim: 'Carrera GTS',
    generation: '992.1',
    yearRange: { start: 2021, end: 2024 },
    standardFeatures: [
      'PDK', // PDK became standard, manual optional
      '8-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'PASM',
      'Porsche Active Suspension Management',
      'Rear-Axle Steering',
      'Rear-Wheel Steering',
      'Porsche Torque Vectoring Plus',
      'PTV Plus',
      'Steel Brakes',
      'SportDesign Package'
    ]
  },
  {
    model: '911',
    trim: 'Carrera GTS',
    generation: '992.2',
    yearRange: { start: 2024 },
    standardFeatures: [
      'PDK', // PDK ONLY - T-Hybrid system
      '8-Speed PDK',
      'Porsche Doppelkupplung (PDK)',
      'T-Hybrid System',
      'Electric Turbocharger',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'PASM',
      'Porsche Active Suspension Management',
      'Rear-Axle Steering',
      'Rear-Wheel Steering',
      'Porsche Torque Vectoring Plus',
      'PTV Plus',
      'Steel Brakes'
    ]
  },

  // ============ 911 Carrera T ============
  {
    model: '911',
    trim: 'Carrera T',
    generation: '991.2',
    yearRange: { start: 2018, end: 2019 },
    standardFeatures: [
      'Manual', // Manual ONLY
      '7-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'PASM',
      'Porsche Active Suspension Management',
      'Mechanical Limited Slip Differential',
      'LSD',
      'Steel Brakes',
      'Sport-Tex Seats',
      'Rear Seat Delete',
      'Lightweight Glass'
    ]
  },
  {
    model: '911',
    trim: 'Carrera T',
    generation: '992',
    yearRange: { start: 2023 },
    standardFeatures: [
      'Manual', // Manual ONLY
      '7-Speed Manual', // 992.1
      '6-Speed Manual', // 992.2
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'Rear-Wheel Steering',
      'Rear-Axle Steering',
      'PASM',
      'Porsche Active Suspension Management',
      'Torque Vectoring',
      'Steel Brakes',
      'Lightweight Glass'
    ]
  },

  // ============ 718 Cayman/Boxster GTS ============
  {
    model: '718 Cayman',
    trim: 'GTS',
    generation: '981',
    yearRange: { start: 2014, end: 2016 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'PASM',
      'Porsche Active Suspension Management',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'PDLS',
      'Porsche Dynamic Lighting System',
      'Steel Brakes'
    ]
  },
  {
    model: '718 Boxster',
    trim: 'GTS',
    generation: '981',
    yearRange: { start: 2014, end: 2016 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'PASM',
      'Porsche Active Suspension Management',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'PDLS',
      'Porsche Dynamic Lighting System',
      'Steel Brakes'
    ]
  },
  {
    model: '718 Cayman',
    trim: 'GTS',
    generation: '982',
    yearRange: { start: 2017, end: 2019 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'Porsche Active Suspension Management',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Steel Brakes'
    ]
  },
  {
    model: '718 Boxster',
    trim: 'GTS',
    generation: '982',
    yearRange: { start: 2017, end: 2019 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'Porsche Active Suspension Management',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Steel Brakes'
    ]
  },
  {
    model: '718 Cayman',
    trim: 'GTS 4.0',
    generation: '982',
    yearRange: { start: 2020 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'PASM',
      'Porsche Active Suspension Management',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Porsche Torque Vectoring',
      'PTV',
      'Mechanical Limited Slip Differential',
      'LSD',
      'Steel Brakes',
      'Alcantara Trim',
      'Carbon Fiber Accents'
    ]
  },
  {
    model: '718 Boxster',
    trim: 'GTS 4.0',
    generation: '982',
    yearRange: { start: 2020 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'PASM',
      'Porsche Active Suspension Management',
      'Sport Chrono Package',
      'Sport Chrono',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Porsche Torque Vectoring',
      'PTV',
      'Mechanical Limited Slip Differential',
      'LSD',
      'Steel Brakes',
      'Alcantara Trim',
      'Carbon Fiber Accents'
    ]
  },

  // ============ 718 Cayman T ============
  {
    model: '718 Cayman',
    trim: 'T',
    generation: '982',
    yearRange: { start: 2020 },
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Steel Brakes',
      'Sport Seats'
    ]
  },

  // Generic fallbacks for model name variations
  {
    model: 'Cayman',
    trim: 'GTS',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Steel Brakes'
    ]
  },
  {
    model: 'Boxster',
    trim: 'GTS',
    standardFeatures: [
      'Manual',
      '6-Speed Manual',
      'Manual Transmission',
      'Sport Chrono Package',
      'Sport Chrono',
      'PASM',
      'Sports Exhaust System',
      'Sport Exhaust',
      'Steel Brakes'
    ]
  }
];

/**
 * Check if an option is standard equipment for a given configuration
 */
export function isStandardEquipment(
  option: string,
  model: string,
  trim: string,
  generation?: string,
  year?: number
): boolean {
  // Normalize the option string for comparison
  const normalizedOption = option.toLowerCase().trim();

  // Find matching standard equipment configurations
  const matches = STANDARD_EQUIPMENT.filter(config => {
    // Check model match (case-insensitive)
    if (config.model.toLowerCase() !== model.toLowerCase()) {
      return false;
    }

    // Check trim match (case-insensitive)
    if (config.trim.toLowerCase() !== trim.toLowerCase()) {
      return false;
    }

    // Check generation if specified
    if (config.generation && generation) {
      if (config.generation.toLowerCase() !== generation.toLowerCase()) {
        return false;
      }
    }

    // Check year range if specified
    if (config.yearRange && year) {
      if (year < config.yearRange.start) {
        return false;
      }
      if (config.yearRange.end && year > config.yearRange.end) {
        return false;
      }
    }

    return true;
  });

  // Check if the option is in any matching configuration's standard features
  for (const config of matches) {
    for (const standardFeature of config.standardFeatures) {
      if (standardFeature.toLowerCase() === normalizedOption) {
        return true;
      }
      // Also check for partial matches (e.g., "PDK" matches "7-Speed PDK")
      if (normalizedOption.includes(standardFeature.toLowerCase()) ||
          standardFeature.toLowerCase().includes(normalizedOption)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter out standard equipment from a list of options
 */
export function filterOutStandardEquipment(
  options: string[],
  model: string,
  trim: string,
  generation?: string,
  year?: number
): string[] {
  return options.filter(option =>
    !isStandardEquipment(option, model, trim, generation, year)
  );
}

/**
 * Get all standard equipment for a configuration
 */
export function getStandardEquipment(
  model: string,
  trim: string,
  generation?: string,
  year?: number
): string[] {
  const allStandard = new Set<string>();

  STANDARD_EQUIPMENT.forEach(config => {
    // Check if this config matches
    if (config.model.toLowerCase() !== model.toLowerCase()) return;
    if (config.trim.toLowerCase() !== trim.toLowerCase()) return;

    if (config.generation && generation) {
      if (config.generation.toLowerCase() !== generation.toLowerCase()) return;
    }

    if (config.yearRange && year) {
      if (year < config.yearRange.start) return;
      if (config.yearRange.end && year > config.yearRange.end) return;
    }

    // Add all standard features from this config
    config.standardFeatures.forEach(feature => allStandard.add(feature));
  });

  return Array.from(allStandard);
}