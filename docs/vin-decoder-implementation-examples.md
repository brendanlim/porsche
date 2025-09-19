# Porsche VIN Decoder Implementation Examples

This document provides detailed code examples and implementation patterns for integrating Porsche VIN decoding into the PorscheStats platform.

## Core VIN Validation and Parsing

### Basic VIN Decoder Class

```typescript
export class PorscheVINDecoder {
  // VIN validation regex - 17 characters, no I, O, or Q
  private static readonly VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

  // Check digit weights for VIN validation
  private static readonly CHECK_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  private static readonly CHECK_VALUES = '0123456789X';

  /**
   * Validate VIN format and check digit
   */
  static validateVIN(vin: string): { isValid: boolean; error?: string } {
    if (!vin || vin.length !== 17) {
      return { isValid: false, error: 'VIN must be exactly 17 characters' };
    }

    if (!this.VIN_REGEX.test(vin)) {
      return { isValid: false, error: 'VIN contains invalid characters (I, O, Q not allowed)' };
    }

    // Verify check digit (position 9)
    const checkDigit = this.calculateCheckDigit(vin);
    if (checkDigit !== vin[8]) {
      return { isValid: false, error: 'VIN check digit is invalid' };
    }

    // Verify it's a Porsche VIN (WP0 or WP1)
    if (!vin.startsWith('WP0') && !vin.startsWith('WP1')) {
      return { isValid: false, error: 'VIN is not for a Porsche vehicle' };
    }

    return { isValid: true };
  }

  /**
   * Calculate VIN check digit
   */
  private static calculateCheckDigit(vin: string): string {
    let sum = 0;

    for (let i = 0; i < 17; i++) {
      if (i === 8) continue; // Skip check digit position

      const char = vin[i];
      const value = this.getCharacterValue(char);
      sum += value * this.CHECK_WEIGHTS[i];
    }

    const remainder = sum % 11;
    return this.CHECK_VALUES[remainder];
  }

  /**
   * Convert VIN character to numeric value for check digit calculation
   */
  private static getCharacterValue(char: string): number {
    if (char >= '0' && char <= '9') {
      return parseInt(char);
    }

    const letterValues: Record<string, number> = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
      'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
      'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
    };

    return letterValues[char] || 0;
  }

  /**
   * Parse basic information from VIN
   */
  static parseBasicInfo(vin: string): BasicVINData {
    const validation = this.validateVIN(vin);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return {
      isValid: true,
      make: 'Porsche',
      model: this.extractModel(vin),
      generation: this.extractGeneration(vin),
      modelYear: this.extractModelYear(vin),
      productionPlant: this.extractProductionPlant(vin),
      region: this.extractRegion(vin),
      vehicleType: this.extractVehicleType(vin),
      sequenceNumber: vin.substring(11, 17)
    };
  }

  /**
   * Extract model from VIN positions 7, 8, 12
   */
  private static extractModel(vin: string): string {
    const pos7 = vin[6];
    const pos8 = vin[7];
    const pos12 = vin[11];

    // 911 variants
    if (pos7 === '9' && pos8 === '9') {
      return '911';
    }

    // 718 variants (Boxster/Cayman)
    if (pos7 === '9' && pos8 === '8') {
      return '718';
    }

    // Cayenne variants
    if (pos7 === '9' && (pos8 === 'P' || pos8 === 'Y')) {
      return 'Cayenne';
    }

    // Panamera variants
    if (pos7 === '9' && pos8 === '7') {
      return 'Panamera';
    }

    // Macan variants
    if (pos7 === '9' && pos8 === '5') {
      return 'Macan';
    }

    // Taycan variants
    if (pos7 === '9' && pos8 === 'J') {
      return 'Taycan';
    }

    return 'Unknown';
  }

  /**
   * Extract generation from VIN
   */
  private static extractGeneration(vin: string): string {
    const model = this.extractModel(vin);
    const pos7 = vin[6];
    const pos8 = vin[7];
    const pos12 = vin[11];

    switch (model) {
      case '911':
        if (pos12 === '6') return '996';
        if (pos12 === '7') return '997';
        if (pos12 === '1') return '991';
        if (pos12 === '2') return '992';
        break;

      case '718':
        if (pos8 === '8' && pos12 === '6') return '986'; // Boxster
        if (pos8 === '8' && pos12 === '7') return '987'; // Boxster/Cayman
        if (pos8 === '8' && pos12 === '1') return '981'; // Boxster/Cayman
        if (pos8 === '8' && pos12 === '2') return '982'; // 718 Boxster/Cayman
        break;

      case 'Cayenne':
        if (pos8 === 'P') return '9PA'; // First generation
        if (pos8 === '2') return '92A'; // Second generation
        if (pos8 === 'Y') return '9YA'; // Third generation
        break;
    }

    return 'Unknown';
  }

  /**
   * Extract model year from position 10
   */
  private static extractModelYear(vin: string): number {
    const yearCode = vin[9];
    const yearMap: Record<string, number> = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027,
      'W': 2028, 'X': 2029, 'Y': 2030, 'Z': 2031,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
      '6': 2006, '7': 2007, '8': 2008, '9': 2009
    };

    return yearMap[yearCode] || 0;
  }

  /**
   * Extract production plant from position 11
   */
  private static extractProductionPlant(vin: string): string {
    const plantCode = vin[10];
    const plantMap: Record<string, string> = {
      'S': 'Stuttgart-Zuffenhausen',
      'L': 'Leipzig',
      'N': 'Neckarsulm',
      'U': 'Uusikaupunki, Finland'
    };

    return plantMap[plantCode] || 'Unknown';
  }

  /**
   * Extract region from VIN structure
   */
  private static extractRegion(vin: string): string {
    // Check positions 4-6 for region indicators
    const positions456 = vin.substring(3, 6);

    if (positions456 === 'ZZZ') {
      return 'RoW'; // Rest of World
    } else {
      return 'USA'; // USA/Canada/Japan/Switzerland
    }
  }

  /**
   * Extract vehicle type from position 3
   */
  private static extractVehicleType(vin: string): string {
    const typeCode = vin[2];
    return typeCode === '0' ? 'Passenger Car' : 'SUV';
  }
}
```

### TypeScript Interfaces

```typescript
export interface BasicVINData {
  isValid: boolean;
  make: string;
  model: string;
  generation: string;
  modelYear: number;
  productionPlant: string;
  region: string;
  vehicleType: string;
  sequenceNumber: string;
}

export interface VehicleSpecs extends BasicVINData {
  trim?: string;
  engine?: EngineSpecs;
  transmission?: string;
  driveType?: string;
  bodyStyle?: string;
  doors?: number;
  fuelType?: string;
  displacement?: number;
  horsepower?: number;
  torque?: number;
  options?: OptionCode[];
  colors?: {
    exterior?: string;
    interior?: string;
  };
  buildDate?: Date;
  msrp?: number;
  source: 'basic_parsing' | 'api' | 'database';
  decodedAt: Date;
}

export interface EngineSpecs {
  code: string;
  displacement: number;
  cylinders: number;
  configuration: string; // 'Flat-6', 'V8', 'Turbo 4', etc.
  aspiration: string; // 'Naturally Aspirated', 'Turbo', 'Twin-Turbo'
  horsepower: number;
  torque: number;
  fuelType: string;
}

export interface OptionCode {
  code: string;
  description: string;
  category: string;
  msrpPrice?: number;
}
```

## API Integration Examples

### VIN Analytics Service Integration

```typescript
export class VINAnalyticsService {
  private apiKey: string;
  private baseURL = 'https://api.vinanalytics.com/v1';
  private cache = new Map<string, CachedVINData>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async decodeVIN(vin: string): Promise<VehicleSpecs> {
    // Check cache first
    const cached = this.cache.get(vin);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseURL}/decode/${vin}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new APIError(`API request failed: ${response.status}`, response.status);
      }

      const apiData = await response.json();
      const specs = this.transformAPIResponse(apiData, vin);

      // Cache the result
      this.cache.set(vin, {
        data: specs,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      });

      return specs;
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        // VIN not found in API, fall back to basic parsing
        return this.fallbackToBasicParsing(vin);
      }
      throw error;
    }
  }

  private transformAPIResponse(apiData: any, vin: string): VehicleSpecs {
    const basicInfo = PorscheVINDecoder.parseBasicInfo(vin);

    return {
      ...basicInfo,
      trim: apiData.trim,
      engine: {
        code: apiData.engine?.code,
        displacement: apiData.engine?.displacement,
        cylinders: apiData.engine?.cylinders,
        configuration: apiData.engine?.configuration,
        aspiration: apiData.engine?.aspiration,
        horsepower: apiData.engine?.horsepower,
        torque: apiData.engine?.torque,
        fuelType: apiData.engine?.fuelType
      },
      transmission: apiData.transmission,
      driveType: apiData.driveType,
      bodyStyle: apiData.bodyStyle,
      doors: apiData.doors,
      fuelType: apiData.fuelType,
      options: apiData.options?.map((opt: any) => ({
        code: opt.code,
        description: opt.description,
        category: opt.category,
        msrpPrice: opt.price
      })) || [],
      colors: {
        exterior: apiData.colors?.exterior,
        interior: apiData.colors?.interior
      },
      buildDate: apiData.buildDate ? new Date(apiData.buildDate) : undefined,
      msrp: apiData.msrp,
      source: 'api',
      decodedAt: new Date()
    };
  }

  private fallbackToBasicParsing(vin: string): VehicleSpecs {
    const basicInfo = PorscheVINDecoder.parseBasicInfo(vin);
    return {
      ...basicInfo,
      source: 'basic_parsing',
      decodedAt: new Date()
    };
  }

  private isCacheExpired(cached: CachedVINData): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }
}

interface CachedVINData {
  data: VehicleSpecs;
  timestamp: number;
  ttl: number;
}

class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'APIError';
  }
}
```

### Fallback Service Implementation

```typescript
export class VINDecodingService {
  private primaryService: VINAnalyticsService;
  private fallbackService: NHTSAService;
  private database: Database;

  constructor(
    primaryService: VINAnalyticsService,
    fallbackService: NHTSAService,
    database: Database
  ) {
    this.primaryService = primaryService;
    this.fallbackService = fallbackService;
    this.database = database;
  }

  async decodeVIN(vin: string): Promise<VehicleSpecs> {
    // Basic validation first
    const validation = PorscheVINDecoder.validateVIN(vin);
    if (!validation.isValid) {
      throw new ValidationError(validation.error!);
    }

    // Check database cache
    const cached = await this.getCachedResult(vin);
    if (cached) {
      return cached;
    }

    let result: VehicleSpecs;
    let attempts = [];

    try {
      // Try primary service
      result = await this.primaryService.decodeVIN(vin);
      attempts.push({ service: 'primary', success: true });
    } catch (error) {
      attempts.push({ service: 'primary', success: false, error: error.message });

      try {
        // Try fallback service
        result = await this.fallbackService.decodeVIN(vin);
        attempts.push({ service: 'fallback', success: true });
      } catch (fallbackError) {
        attempts.push({ service: 'fallback', success: false, error: fallbackError.message });

        // Final fallback to basic parsing
        result = PorscheVINDecoder.parseBasicInfo(vin) as VehicleSpecs;
        result.source = 'basic_parsing';
        result.decodedAt = new Date();
        attempts.push({ service: 'basic_parsing', success: true });
      }
    }

    // Cache the result
    await this.cacheResult(vin, result);

    // Log attempts for monitoring
    await this.logDecodingAttempts(vin, attempts);

    return result;
  }

  private async getCachedResult(vin: string): Promise<VehicleSpecs | null> {
    try {
      const cached = await this.database.query(
        'SELECT * FROM vin_decode_cache WHERE vin = $1 AND expires_at > NOW()',
        [vin]
      );

      if (cached.rows.length > 0) {
        return cached.rows[0].decoded_data;
      }
    } catch (error) {
      console.error('Cache lookup failed:', error);
    }

    return null;
  }

  private async cacheResult(vin: string, result: VehicleSpecs): Promise<void> {
    try {
      await this.database.query(
        `INSERT INTO vin_decode_cache (vin, decoded_data, source, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
         ON CONFLICT (vin) DO UPDATE SET
         decoded_data = $2, source = $3, decoded_at = NOW(), expires_at = NOW() + INTERVAL '24 hours'`,
        [vin, JSON.stringify(result), result.source]
      );
    } catch (error) {
      console.error('Failed to cache result:', error);
    }
  }

  private async logDecodingAttempts(vin: string, attempts: any[]): Promise<void> {
    for (const attempt of attempts) {
      try {
        await this.database.query(
          `INSERT INTO vin_api_usage (vin, api_service, success, called_at)
           VALUES ($1, $2, $3, NOW())`,
          [vin, attempt.service, attempt.success]
        );
      } catch (error) {
        console.error('Failed to log attempt:', error);
      }
    }
  }
}
```

## React Component Examples

### VIN Input Component with Real-time Validation

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { PorscheVINDecoder, VehicleSpecs } from '../lib/vin-decoder';

interface VINInputProps {
  onVINDecoded: (specs: VehicleSpecs) => void;
  onValidationError: (error: string) => void;
  onClearData: () => void;
}

export const VINInput: React.FC<VINInputProps> = ({
  onVINDecoded,
  onValidationError,
  onClearData
}) => {
  const [vin, setVIN] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid?: boolean;
    error?: string;
    specs?: VehicleSpecs;
  }>({});

  // Debounced VIN validation and decoding
  const debouncedDecode = useMemo(
    () => debounce(async (vinValue: string) => {
      if (vinValue.length < 17) {
        setValidationState({});
        return;
      }

      if (vinValue.length === 17) {
        setIsValidating(true);

        try {
          // First validate format
          const validation = PorscheVINDecoder.validateVIN(vinValue);

          if (!validation.isValid) {
            setValidationState({ isValid: false, error: validation.error });
            onValidationError(validation.error!);
            return;
          }

          // Then decode basic info
          const basicSpecs = PorscheVINDecoder.parseBasicInfo(vinValue);
          const specs: VehicleSpecs = {
            ...basicSpecs,
            source: 'basic_parsing',
            decodedAt: new Date()
          };

          setValidationState({ isValid: true, specs });
          onVINDecoded(specs);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid VIN';
          setValidationState({ isValid: false, error: errorMessage });
          onValidationError(errorMessage);
        } finally {
          setIsValidating(false);
        }
      }
    }, 500),
    [onVINDecoded, onValidationError]
  );

  // Handle VIN input changes
  const handleVINChange = (value: string) => {
    const cleanValue = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');

    if (cleanValue.length <= 17) {
      setVIN(cleanValue);

      if (cleanValue.length === 0) {
        setValidationState({});
        onClearData();
      } else {
        debouncedDecode(cleanValue);
      }
    }
  };

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedDecode.cancel();
    };
  }, [debouncedDecode]);

  const getInputClassName = () => {
    const baseClass = 'vin-input';
    if (vin.length === 0) return baseClass;
    if (isValidating) return `${baseClass} validating`;
    if (validationState.isValid === true) return `${baseClass} valid`;
    if (validationState.isValid === false) return `${baseClass} invalid`;
    return baseClass;
  };

  return (
    <div className="vin-input-container">
      <div className="input-wrapper">
        <input
          type="text"
          value={vin}
          onChange={(e) => handleVINChange(e.target.value)}
          placeholder="Enter 17-character VIN"
          className={getInputClassName()}
          maxLength={17}
          autoComplete="off"
          spellCheck={false}
        />

        {isValidating && (
          <div className="validation-spinner">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
            </svg>
          </div>
        )}

        {validationState.isValid === true && (
          <div className="validation-success">
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {validationState.isValid === false && (
          <div className="validation-error">
            <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Character count indicator */}
      <div className="character-count">
        <span className={vin.length === 17 ? 'complete' : ''}>
          {vin.length}/17
        </span>
      </div>

      {/* Validation message */}
      {validationState.error && (
        <div className="validation-message error">
          {validationState.error}
        </div>
      )}

      {/* VIN breakdown display */}
      {validationState.specs && (
        <VINBreakdown specs={validationState.specs} />
      )}
    </div>
  );
};

// VIN breakdown display component
const VINBreakdown: React.FC<{ specs: VehicleSpecs }> = ({ specs }) => {
  return (
    <div className="vin-breakdown">
      <h4>Decoded Information</h4>
      <div className="breakdown-grid">
        <div className="breakdown-item">
          <label>Make:</label>
          <span>{specs.make}</span>
        </div>
        <div className="breakdown-item">
          <label>Model:</label>
          <span>{specs.model}</span>
        </div>
        <div className="breakdown-item">
          <label>Generation:</label>
          <span>{specs.generation}</span>
        </div>
        <div className="breakdown-item">
          <label>Year:</label>
          <span>{specs.modelYear}</span>
        </div>
        <div className="breakdown-item">
          <label>Plant:</label>
          <span>{specs.productionPlant}</span>
        </div>
        <div className="breakdown-item">
          <label>Region:</label>
          <span>{specs.region}</span>
        </div>
      </div>
    </div>
  );
};
```

### Enhanced Car Form with VIN Integration

```typescript
import React, { useState, useEffect } from 'react';
import { VINInput } from './VINInput';
import { VehicleSpecs } from '../lib/vin-decoder';

interface CarFormData {
  vin?: string;
  make: string;
  model: string;
  year: number;
  generation?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  mileage?: number;
  color?: string;
  price?: number;
  // ... other fields
}

export const EnhancedCarForm: React.FC = () => {
  const [formData, setFormData] = useState<CarFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear()
  });

  const [vinDecoded, setVinDecoded] = useState(false);
  const [showManualFields, setShowManualFields] = useState(true);

  const handleVINDecoded = (specs: VehicleSpecs) => {
    // Auto-populate form fields from VIN
    setFormData(prev => ({
      ...prev,
      vin: specs.sequenceNumber, // Store full VIN
      make: specs.make,
      model: specs.model,
      year: specs.modelYear,
      generation: specs.generation,
      trim: specs.trim,
      engine: specs.engine?.code,
      transmission: specs.transmission
    }));

    setVinDecoded(true);
    setShowManualFields(false); // Hide manual fields since we have VIN data
  };

  const handleVINError = (error: string) => {
    console.error('VIN validation error:', error);
    setVinDecoded(false);
  };

  const handleClearVIN = () => {
    setFormData(prev => ({
      ...prev,
      vin: undefined,
      make: '',
      model: '',
      year: new Date().getFullYear(),
      generation: undefined,
      trim: undefined,
      engine: undefined,
      transmission: undefined
    }));

    setVinDecoded(false);
    setShowManualFields(true);
  };

  const toggleManualEntry = () => {
    setShowManualFields(!showManualFields);
  };

  return (
    <form className="enhanced-car-form">
      <div className="form-section">
        <h3>Vehicle Identification</h3>

        {/* VIN Input */}
        <div className="field-group">
          <label htmlFor="vin">VIN (Optional)</label>
          <VINInput
            onVINDecoded={handleVINDecoded}
            onValidationError={handleVINError}
            onClearData={handleClearVIN}
          />
          <p className="field-help">
            Enter the 17-character VIN for automatic vehicle identification
          </p>
        </div>

        {/* Toggle for manual entry */}
        {vinDecoded && (
          <div className="manual-entry-toggle">
            <button
              type="button"
              onClick={toggleManualEntry}
              className="toggle-button"
            >
              {showManualFields ? 'Hide Manual Fields' : 'Show Manual Fields'}
            </button>
          </div>
        )}

        {/* Manual entry fields */}
        {showManualFields && (
          <div className="manual-fields">
            <div className="field-group">
              <label htmlFor="make">Make *</label>
              <input
                type="text"
                id="make"
                value={formData.make}
                onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                disabled={vinDecoded}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="model">Model *</label>
              <select
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                disabled={vinDecoded}
                required
              >
                <option value="">Select Model</option>
                <option value="911">911</option>
                <option value="718">718 (Boxster/Cayman)</option>
                <option value="Cayenne">Cayenne</option>
                <option value="Panamera">Panamera</option>
                <option value="Macan">Macan</option>
                <option value="Taycan">Taycan</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="year">Year *</label>
              <input
                type="number"
                id="year"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                disabled={vinDecoded}
                min="1948"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>

            {formData.model && (
              <div className="field-group">
                <label htmlFor="generation">Generation</label>
                <GenerationSelect
                  model={formData.model}
                  year={formData.year}
                  value={formData.generation}
                  onChange={(gen) => setFormData(prev => ({ ...prev, generation: gen }))}
                  disabled={vinDecoded}
                />
              </div>
            )}
          </div>
        )}

        {/* VIN-populated data display */}
        {vinDecoded && (
          <div className="vin-data-display">
            <h4>From VIN:</h4>
            <div className="data-grid">
              <div><strong>Make:</strong> {formData.make}</div>
              <div><strong>Model:</strong> {formData.model}</div>
              <div><strong>Year:</strong> {formData.year}</div>
              {formData.generation && <div><strong>Generation:</strong> {formData.generation}</div>}
              {formData.trim && <div><strong>Trim:</strong> {formData.trim}</div>}
              {formData.engine && <div><strong>Engine:</strong> {formData.engine}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Additional form fields */}
      <div className="form-section">
        <h3>Additional Details</h3>

        <div className="field-group">
          <label htmlFor="mileage">Mileage *</label>
          <input
            type="number"
            id="mileage"
            value={formData.mileage || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
            min="0"
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="price">Price *</label>
          <input
            type="number"
            id="price"
            value={formData.price || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) }))}
            min="0"
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="color">Exterior Color</label>
          <input
            type="text"
            id="color"
            value={formData.color || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-button">
          Add Vehicle
        </button>
      </div>
    </form>
  );
};
```

## Database Integration Examples

### Database Schema

```sql
-- VIN decoding cache table
CREATE TABLE vin_decode_cache (
  vin VARCHAR(17) PRIMARY KEY,
  decoded_data JSONB NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'basic_parsing', 'api', 'database'
  decoded_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient expiry cleanup
CREATE INDEX idx_vin_cache_expires ON vin_decode_cache (expires_at);

-- API usage tracking for cost monitoring
CREATE TABLE vin_api_usage (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) NOT NULL,
  api_service VARCHAR(50) NOT NULL,
  cost_cents INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  called_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_api_usage_service ON vin_api_usage (api_service);
CREATE INDEX idx_api_usage_date ON vin_api_usage (called_at);
CREATE INDEX idx_api_usage_success ON vin_api_usage (success);

-- Update listings table to include VIN-decoded fields
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_decoded_model VARCHAR(10);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_decoded_generation VARCHAR(10);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_decoded_year INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_decoded_plant VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vin_decoded_at TIMESTAMP;

-- Create function to update listing from VIN
CREATE OR REPLACE FUNCTION update_listing_from_vin(
  p_listing_id INTEGER,
  p_vin VARCHAR(17)
) RETURNS BOOLEAN AS $$
DECLARE
  vin_data JSONB;
  success BOOLEAN := FALSE;
BEGIN
  -- Get cached VIN data
  SELECT decoded_data INTO vin_data
  FROM vin_decode_cache
  WHERE vin = p_vin AND expires_at > NOW();

  IF vin_data IS NOT NULL THEN
    -- Update listing with VIN data
    UPDATE listings SET
      vin = p_vin,
      vin_decoded_model = vin_data->>'model',
      vin_decoded_generation = vin_data->>'generation',
      vin_decoded_year = (vin_data->>'modelYear')::INTEGER,
      vin_decoded_plant = vin_data->>'productionPlant',
      vin_source = vin_data->>'source',
      vin_decoded_at = NOW()
    WHERE id = p_listing_id;

    success := FOUND;
  END IF;

  RETURN success;
END;
$$ LANGUAGE plpgsql;
```

### Database Service Class

```typescript
export class VINDatabaseService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getCachedVINData(vin: string): Promise<VehicleSpecs | null> {
    try {
      const result = await this.db.query(
        `SELECT decoded_data FROM vin_decode_cache
         WHERE vin = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [vin]
      );

      if (result.rows.length > 0) {
        return result.rows[0].decoded_data;
      }
    } catch (error) {
      console.error('Failed to get cached VIN data:', error);
    }

    return null;
  }

  async cacheVINData(vin: string, specs: VehicleSpecs, ttlHours = 24): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO vin_decode_cache (vin, decoded_data, source, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '${ttlHours} hours')
         ON CONFLICT (vin) DO UPDATE SET
         decoded_data = $2,
         source = $3,
         decoded_at = NOW(),
         expires_at = NOW() + INTERVAL '${ttlHours} hours',
         updated_at = NOW()`,
        [vin, JSON.stringify(specs), specs.source]
      );
    } catch (error) {
      console.error('Failed to cache VIN data:', error);
      throw error;
    }
  }

  async logAPIUsage(
    vin: string,
    service: string,
    success: boolean,
    costCents?: number,
    responseTimeMs?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO vin_api_usage (vin, api_service, success, cost_cents, response_time_ms, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vin, service, success, costCents, responseTimeMs, errorMessage]
      );
    } catch (error) {
      console.error('Failed to log API usage:', error);
    }
  }

  async updateListingFromVIN(listingId: number, vin: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        'SELECT update_listing_from_vin($1, $2) as success',
        [listingId, vin]
      );

      return result.rows[0]?.success || false;
    } catch (error) {
      console.error('Failed to update listing from VIN:', error);
      return false;
    }
  }

  async getAPIUsageStats(days = 30): Promise<APIUsageStats> {
    try {
      const result = await this.db.query(
        `SELECT
           api_service,
           COUNT(*) as total_calls,
           COUNT(*) FILTER (WHERE success = true) as successful_calls,
           COALESCE(SUM(cost_cents), 0) as total_cost_cents,
           COALESCE(AVG(response_time_ms), 0) as avg_response_time
         FROM vin_api_usage
         WHERE called_at > NOW() - INTERVAL '${days} days'
         GROUP BY api_service`,
        []
      );

      return result.rows.reduce((stats, row) => {
        stats[row.api_service] = {
          totalCalls: parseInt(row.total_calls),
          successfulCalls: parseInt(row.successful_calls),
          successRate: row.successful_calls / row.total_calls,
          totalCostCents: parseInt(row.total_cost_cents),
          avgResponseTimeMs: parseFloat(row.avg_response_time)
        };
        return stats;
      }, {});

    } catch (error) {
      console.error('Failed to get API usage stats:', error);
      return {};
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.db.query(
        'DELETE FROM vin_decode_cache WHERE expires_at <= NOW()',
        []
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return 0;
    }
  }
}

interface APIUsageStats {
  [service: string]: {
    totalCalls: number;
    successfulCalls: number;
    successRate: number;
    totalCostCents: number;
    avgResponseTimeMs: number;
  };
}
```

This implementation provides a robust foundation for integrating Porsche VIN decoding into the PorscheStats platform, with proper error handling, caching, fallback strategies, and comprehensive monitoring capabilities.