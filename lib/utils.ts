import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatMileage(mileage: number): string {
  return new Intl.NumberFormat('en-US').format(mileage)
}

export function validateVIN(vin: string): boolean {
  // Basic VIN validation - 17 characters, alphanumeric
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i
  return vinRegex.test(vin)
}

export function validateModelYear(modelName: string, trimName: string, year: number): boolean {
  // GT4 RS only exists 2022+
  if (trimName === 'GT4 RS' && year < 2022) {
    return false
  }
  
  // Spyder RS only exists 2024+
  if (trimName === 'Spyder RS' && year < 2024) {
    return false
  }
  
  // 718 models don't exist before 2017
  if (modelName.includes('718') && year < 2017) {
    return false
  }
  
  // 992 generation started in 2020
  if (modelName === '911' && trimName.includes('992') && year < 2020) {
    return false
  }
  
  return true
}

export function validatePrice(price: number, trimName?: string): boolean {
  // Basic sanity check
  if (price < 15000) return false // No Porsche should be under $15k
  if (price > 5000000) return false // Even the most expensive shouldn't exceed $5M
  
  // Trim-specific validation
  if (trimName) {
    const minPrices: Record<string, number> = {
      'GT3': 150000,
      'GT3 RS': 250000,
      'GT4 RS': 180000,
      'Spyder RS': 200000,
      'Turbo S': 180000,
    }
    
    for (const [key, minPrice] of Object.entries(minPrices)) {
      if (trimName.includes(key) && price < minPrice) {
        return false
      }
    }
  }
  
  return true
}

export function detectPaintToSample(colorName: string): { cleanName: string; isPTS: boolean } {
  // PTS indicators in color names
  const ptsIndicators = ['PTS', 'Paint to Sample', 'Paint-to-Sample']
  let cleanName = colorName
  let isPTS = false
  
  // Check for explicit PTS indicators
  for (const indicator of ptsIndicators) {
    if (colorName.toLowerCase().includes(indicator.toLowerCase())) {
      isPTS = true
      // Remove the indicator from the name
      cleanName = colorName.replace(new RegExp(indicator, 'gi'), '').trim()
      cleanName = cleanName.replace(/^-\s*/, '').replace(/\s*-$/, '').trim()
    }
  }
  
  // Known PTS colors even without explicit mention
  const knownPTSColors = [
    'Granite Green', 'Dark Sea Blue', 'Oslo Blue', 'Mexico Blue', 'Voodoo Blue',
    'Nardo Grey', 'Fashion Grey', 'Slate Grey', 'Signal Yellow', 'Signal Green',
    'Acid Green', 'Lizard Green', 'Ruby Star', 'Python Green'
  ]
  
  if (knownPTSColors.some(pts => cleanName.toLowerCase().includes(pts.toLowerCase()))) {
    isPTS = true
  }
  
  return { cleanName, isPTS }
}

export function normalizeColor(color: string): string {
  // Remove duplicate formats like "Black [Black]"
  const cleaned = color.replace(/\[.*?\]/g, '').trim()
  
  // Detect and clean PTS
  const { cleanName } = detectPaintToSample(cleaned)
  
  return cleanName
}

export function getGenerationFromYear(model: string, year: number): string | null {
  if (model === '911') {
    if (year >= 2024) return '992.2'
    if (year >= 2020) return '992.1'
    if (year >= 2016) return '991.2'
    if (year >= 2012) return '991.1'
  }
  
  if (model.includes('718')) {
    if (year >= 2020) return '982'
    if (year >= 2016) return '981'
  }
  
  return null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}