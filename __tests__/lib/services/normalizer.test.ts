import { describe, expect, test } from '@jest/globals';

// Model/Trim normalization functions
function normalizeModel(rawModel: string): string | null {
  if (!rawModel) return null;
  
  const modelMap: Record<string, string> = {
    '718': '718 Cayman',
    '718 cayman': '718 Cayman',
    '718 boxster': '718 Boxster',
    '718 spyder': '718 Boxster',
    'cayman': '718 Cayman',
    'boxster': '718 Boxster',
    '911': '911',
    'nine eleven': '911',
    'carrera': '911',
    'turbo': '911',
    'gt3': '911',
    'gt2': '911'
  };

  const normalized = rawModel.toLowerCase().trim();
  for (const [pattern, model] of Object.entries(modelMap)) {
    if (normalized.includes(pattern)) {
      return model;
    }
  }
  return null;
}

function normalizeTrim(rawTrim: string, model: string): string | null {
  if (!rawTrim) return null;
  
  const trim = rawTrim.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  
  // GT4 RS specific
  if (trim.includes('gt4') && trim.includes('rs')) {
    return 'GT4 RS';
  }
  
  // GT3 variants
  if (trim.includes('gt3')) {
    if (trim.includes('rs')) return 'GT3 RS';
    if (trim.includes('touring')) return 'GT3 Touring';
    return 'GT3';
  }
  
  // GT2 RS
  if (trim.includes('gt2') && trim.includes('rs')) {
    return 'GT2 RS';
  }
  
  // Turbo variants
  if (trim.includes('turbo')) {
    if (trim.includes('s')) return 'Turbo S';
    return 'Turbo';
  }
  
  // 718 specific
  if (model.includes('718')) {
    if (trim.includes('gts') && trim.includes('4')) return 'GTS 4.0';
    if (trim.includes('gts')) return 'GTS';
    if (trim.includes('gt4')) return 'GT4';
    if (trim.includes('spyder') && trim.includes('rs')) return 'Spyder RS';
    if (trim.includes('spyder')) return 'Spyder';
    if (trim.includes('s')) return 'S';
    if (trim.includes('t')) return 'T';
    return 'Base';
  }
  
  // 911 Carrera variants
  if (trim.includes('carrera')) {
    if (trim.includes('gts')) return 'Carrera GTS';
    if (trim.includes('4s')) return 'Carrera 4S';
    if (trim.includes('s')) return 'Carrera S';
    if (trim.includes('4')) return 'Carrera 4';
    if (trim.includes('t')) return 'Carrera T';
    return 'Carrera';
  }
  
  return null;
}

describe('Model and Trim Normalization', () => {
  describe('normalizeModel', () => {
    test('normalizes 718 variants correctly', () => {
      expect(normalizeModel('718')).toBe('718 Cayman');
      expect(normalizeModel('718 Cayman')).toBe('718 Cayman');
      expect(normalizeModel('718 Boxster')).toBe('718 Boxster');
      expect(normalizeModel('Cayman')).toBe('718 Cayman');
      expect(normalizeModel('Boxster')).toBe('718 Boxster');
      expect(normalizeModel('718 Spyder')).toBe('718 Boxster');
    });

    test('normalizes 911 variants correctly', () => {
      expect(normalizeModel('911')).toBe('911');
      expect(normalizeModel('Nine Eleven')).toBe('911');
      expect(normalizeModel('Carrera')).toBe('911');
      expect(normalizeModel('911 Turbo')).toBe('911');
      expect(normalizeModel('GT3')).toBe('911');
      expect(normalizeModel('GT2 RS')).toBe('911');
    });

    test('handles case insensitivity', () => {
      expect(normalizeModel('CAYMAN')).toBe('718 Cayman');
      expect(normalizeModel('BoXsTeR')).toBe('718 Boxster');
      expect(normalizeModel('GT3')).toBe('911');
    });

    test('handles invalid models', () => {
      expect(normalizeModel('')).toBe(null);
      expect(normalizeModel('Cayenne')).toBe(null); // SUV not allowed
      expect(normalizeModel('Macan')).toBe(null);   // SUV not allowed
      expect(normalizeModel('Panamera')).toBe(null); // Sedan not allowed
    });
  });

  describe('normalizeTrim', () => {
    test('normalizes GT4 RS correctly', () => {
      expect(normalizeTrim('GT4 RS', '718 Cayman')).toBe('GT4 RS');
      expect(normalizeTrim('GT4RS', '718 Cayman')).toBe('GT4 RS');
      expect(normalizeTrim('gt4 rs', '718 Cayman')).toBe('GT4 RS');
      expect(normalizeTrim('GT4-RS', '718 Cayman')).toBe('GT4 RS');
    });

    test('normalizes GT3 variants correctly', () => {
      expect(normalizeTrim('GT3', '911')).toBe('GT3');
      expect(normalizeTrim('GT3 RS', '911')).toBe('GT3 RS');
      expect(normalizeTrim('GT3RS', '911')).toBe('GT3 RS');
      expect(normalizeTrim('GT3 Touring', '911')).toBe('GT3 Touring');
    });

    test('normalizes Turbo variants correctly', () => {
      expect(normalizeTrim('Turbo', '911')).toBe('Turbo');
      expect(normalizeTrim('Turbo S', '911')).toBe('Turbo S');
      expect(normalizeTrim('911 Turbo S', '911')).toBe('Turbo S');
    });

    test('normalizes 718 trims correctly', () => {
      expect(normalizeTrim('Base', '718 Cayman')).toBe('Base');
      expect(normalizeTrim('S', '718 Cayman')).toBe('S');
      expect(normalizeTrim('GTS', '718 Cayman')).toBe('GTS');
      expect(normalizeTrim('GTS 4.0', '718 Cayman')).toBe('GTS 4.0');
      expect(normalizeTrim('GT4', '718 Cayman')).toBe('GT4');
      expect(normalizeTrim('T', '718 Cayman')).toBe('T');
    });

    test('normalizes Boxster Spyder variants correctly', () => {
      expect(normalizeTrim('Spyder', '718 Boxster')).toBe('Spyder');
      expect(normalizeTrim('Spyder RS', '718 Boxster')).toBe('Spyder RS');
      expect(normalizeTrim('718 Spyder RS', '718 Boxster')).toBe('Spyder RS');
    });

    test('normalizes 911 Carrera variants correctly', () => {
      expect(normalizeTrim('Carrera', '911')).toBe('Carrera');
      expect(normalizeTrim('Carrera S', '911')).toBe('Carrera S');
      expect(normalizeTrim('Carrera 4S', '911')).toBe('Carrera 4S');
      expect(normalizeTrim('Carrera GTS', '911')).toBe('Carrera GTS');
      expect(normalizeTrim('Carrera T', '911')).toBe('Carrera T');
    });

    test('handles special characters and spacing', () => {
      expect(normalizeTrim('GT4-RS', '718 Cayman')).toBe('GT4 RS');
      expect(normalizeTrim('GT3  RS', '911')).toBe('GT3 RS');
      expect(normalizeTrim('  Turbo   S  ', '911')).toBe('Turbo S');
    });
  });

  describe('Real-world edge cases', () => {
    test('handles BaT listing variations', () => {
      expect(normalizeModel('2022 Porsche 718 Cayman GT4 RS')).toBe('718 Cayman');
      expect(normalizeModel('911 Carrera GTS')).toBe('911');
      expect(normalizeModel('718 Boxster Spyder RS')).toBe('718 Boxster');
    });

    test('preserves important distinctions', () => {
      // GT4 vs GT4 RS are different
      expect(normalizeTrim('GT4', '718 Cayman')).toBe('GT4');
      expect(normalizeTrim('GT4 RS', '718 Cayman')).toBe('GT4 RS');
      
      // GT3 vs GT3 RS are different
      expect(normalizeTrim('GT3', '911')).toBe('GT3');
      expect(normalizeTrim('GT3 RS', '911')).toBe('GT3 RS');
      
      // Spyder vs Spyder RS are different
      expect(normalizeTrim('Spyder', '718 Boxster')).toBe('Spyder');
      expect(normalizeTrim('Spyder RS', '718 Boxster')).toBe('Spyder RS');
    });
  });
});