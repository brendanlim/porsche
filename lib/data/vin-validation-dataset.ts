/**
 * Porsche VIN Validation Dataset
 * Generated: 2025-09-24T15:52:51.486Z
 * Total Combinations: 40
 * Total VINs: 29
 *
 * This dataset contains high-confidence VIN samples for validating
 * and improving the Porsche VIN decoder accuracy.
 */

export interface ModelTrimCombination {
  year: number;
  model: string;
  trim: string;
  generation?: string;
  count: number;
  avgPrice: number;
  avgMileage: number;
}

export interface VinSample {
  vin: string;
  year: number;
  model: string;
  trim: string;
  generation?: string;
  price: number;
  mileage?: number;
  source: string;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  decodedData?: {
    model: string;
    generation?: string;
    bodyStyle?: string;
    engineType?: string;
  };
}

export const VIN_VALIDATION_DATASET = {
  "metadata": {
    "generatedAt": "2025-09-24T15:52:51.486Z",
    "totalCombinations": 40,
    "totalVins": 29,
    "selectionCriteria": [
      "Sports cars only (no SUVs or sedans)",
      "Valid 17-character VINs",
      "Reasonable price (>$10,000)",
      "Mileage validation based on car age and type",
      "Up to 5 samples per year/model/trim combination",
      "Prioritized samples with complete data and typical characteristics"
    ]
  },
  "combinations": [
    {
      "year": 2001,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 3,
      "avgPrice": 15900,
      "avgMileage": 19666.666666666668
    },
    {
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 98,
      "avgPrice": 31891.26530612245,
      "avgMileage": 46926.12244897959
    },
    {
      "year": 2001,
      "model": "911",
      "trim": "GT3 R",
      "generation": "997",
      "count": 1,
      "avgPrice": 31250,
      "avgMileage": 11488
    },
    {
      "year": 2002,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 4,
      "avgPrice": 19562.5,
      "avgMileage": 31000
    },
    {
      "year": 2002,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 132,
      "avgPrice": 33149.227272727265,
      "avgMileage": 56859.924242424226
    },
    {
      "year": 2003,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 3,
      "avgPrice": 23833.333333333332,
      "avgMileage": 54666.666666666664
    },
    {
      "year": 2003,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 86,
      "avgPrice": 34137.604651162794,
      "avgMileage": 48598.174418604656
    },
    {
      "year": 2004,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 4,
      "avgPrice": 19875.25,
      "avgMileage": 30750
    },
    {
      "year": 2004,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 94,
      "avgPrice": 36238.521276595755,
      "avgMileage": 48725.31876899696
    },
    {
      "year": 2005,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 5,
      "avgPrice": 25249.4,
      "avgMileage": 25800
    },
    {
      "year": 2005,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 62,
      "avgPrice": 38425.54838709676,
      "avgMileage": 50233.290322580644
    },
    {
      "year": 2006,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 8,
      "avgPrice": 24635.875,
      "avgMileage": 44875
    },
    {
      "year": 2006,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 78,
      "avgPrice": 39127.48717948719,
      "avgMileage": 58982.46153846154
    },
    {
      "year": 2007,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 2,
      "avgPrice": 18499.5,
      "avgMileage": 40000
    },
    {
      "year": 2007,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 46,
      "avgPrice": 39502.413043478264,
      "avgMileage": 42431.8695652174
    },
    {
      "year": 2008,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 11,
      "avgPrice": 31283.727272727272,
      "avgMileage": 35800.92592592593
    },
    {
      "year": 2008,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 26,
      "avgPrice": 39754.153846153844,
      "avgMileage": 64357.3076923077
    },
    {
      "year": 2009,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 19,
      "avgPrice": 41055.73684210526,
      "avgMileage": 67789.47368421052
    },
    {
      "year": 2010,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 2,
      "avgPrice": 29875,
      "avgMileage": 75000
    },
    {
      "year": 2010,
      "model": "911",
      "trim": "GT3 RS",
      "generation": "",
      "count": 3,
      "avgPrice": 38291.666666666664,
      "avgMileage": 111000
    },
    {
      "year": 2011,
      "model": "911",
      "trim": "GT3 RS",
      "generation": "",
      "count": 2,
      "avgPrice": 39154.5,
      "avgMileage": 126500
    },
    {
      "year": 2011,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 1,
      "avgPrice": 42750,
      "avgMileage": 41000
    },
    {
      "year": 2012,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 1,
      "avgPrice": 33000,
      "avgMileage": 20000
    },
    {
      "year": 2012,
      "model": "911",
      "trim": "GT3 RS",
      "generation": "",
      "count": 4,
      "avgPrice": 38003,
      "avgMileage": 35095.25
    },
    {
      "year": 2013,
      "model": "911",
      "trim": "Base",
      "generation": "Race",
      "count": 1,
      "avgPrice": 17500,
      "avgMileage": 63000
    },
    {
      "year": 2013,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 7,
      "avgPrice": 35826.42857142857,
      "avgMileage": 48285.71428571428
    },
    {
      "year": 2013,
      "model": "911",
      "trim": "GT3 RS",
      "generation": "",
      "count": 3,
      "avgPrice": 42356.333333333336,
      "avgMileage": 27676.666666666668
    },
    {
      "year": 2014,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 23,
      "avgPrice": 36011.86956521739,
      "avgMileage": 43386.60869565216
    },
    {
      "year": 2014,
      "model": "911",
      "trim": "GT3 RS",
      "generation": "",
      "count": 1,
      "avgPrice": 44000,
      "avgMileage": 99000
    },
    {
      "year": 2015,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 6,
      "avgPrice": 38448.5,
      "avgMileage": 47600
    },
    {
      "year": 2016,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 4,
      "avgPrice": 38771.25,
      "avgMileage": 42750
    },
    {
      "year": 2017,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 3,
      "avgPrice": 43166.666666666664,
      "avgMileage": 28333.333333333332
    },
    {
      "year": 2018,
      "model": "911",
      "trim": "GT4",
      "generation": "",
      "count": 6,
      "avgPrice": 40458.333333333336,
      "avgMileage": 40933.333333333336
    },
    {
      "year": 2027,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 1,
      "avgPrice": 16000,
      "avgMileage": 0
    },
    {
      "year": 2028,
      "model": "911",
      "trim": "GT3 R",
      "generation": "992",
      "count": 1,
      "avgPrice": 22995,
      "avgMileage": 54000
    },
    {
      "year": 2028,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 1,
      "avgPrice": 31000,
      "avgMileage": 0
    },
    {
      "year": 2029,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 3,
      "avgPrice": 15000,
      "avgMileage": 23000
    },
    {
      "year": 2029,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 142,
      "avgPrice": 28529.119718309852,
      "avgMileage": 49895.09154929577
    },
    {
      "year": 2030,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "count": 101,
      "avgPrice": 28291.237623762376,
      "avgMileage": 54758.0495049505
    },
    {
      "year": 2030,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "count": 2,
      "avgPrice": 22525,
      "avgMileage": 35500
    }
  ],
  "vinSamples": [
    {
      "vin": "WP0CA29881U626856",
      "year": 2001,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 15000,
      "mileage": 15000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CB29851U660590",
      "year": 2001,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 17700,
      "mileage": 44000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CB29871U663281",
      "year": 2001,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 15000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29911S654356",
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 16475,
      "mileage": 74000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0AA29941S621519",
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 16800,
      "mileage": 159000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0AA29981S622897",
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18113,
      "mileage": 123000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0AA29951S622372",
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18250,
      "mileage": 111000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0AA29931S622984",
      "year": 2001,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18638,
      "mileage": 12000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29832U625762",
      "year": 2002,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 16000,
      "mileage": 40000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29812U621483",
      "year": 2002,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 15000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29962S653768",
      "year": 2002,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18250,
      "mileage": 75000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0AA29992S623428",
      "year": 2002,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 16500,
      "mileage": 174000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CB29853U660835",
      "year": 2003,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 16500,
      "mileage": 38000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29973S650086",
      "year": 2003,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18600,
      "mileage": 101000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29953S653133",
      "year": 2003,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 18900,
      "mileage": 125000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29983S651960",
      "year": 2003,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 19011,
      "mileage": 500,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29884S620359",
      "year": 2004,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 17000,
      "mileage": 41000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CB29804U661358",
      "year": 2004,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 15501,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29994S650642",
      "year": 2004,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 16475,
      "mileage": 77000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29954S653196",
      "year": 2004,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 17250,
      "mileage": 100000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29875U710236",
      "year": 2005,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 19250,
      "mileage": 39000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29856U713041",
      "year": 2006,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 16600,
      "mileage": 79000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29866U711301",
      "year": 2006,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 18250,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA299X6S755161",
      "year": 2006,
      "model": "911",
      "trim": "GT3",
      "generation": "",
      "price": 17997,
      "mileage": 148000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT3",
        "engineType": "GT3"
      }
    },
    {
      "vin": "WP0CA29897U710905",
      "year": 2007,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 18000,
      "mileage": 40000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA29877U710952",
      "year": 2007,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 18999,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0ZZZ93ZDS000342",
      "year": 2013,
      "model": "911",
      "trim": "Base",
      "generation": "Race",
      "price": 17500,
      "mileage": 63000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "Race",
        "bodyStyle": "",
        "engineType": ""
      }
    },
    {
      "vin": "WP0CA298XVS620607",
      "year": 2027,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 16000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    },
    {
      "vin": "WP0CA298XXU632280",
      "year": 2029,
      "model": "911",
      "trim": "GT4 Clubsport",
      "generation": "",
      "price": 15000,
      "source": "bring-a-trailer",
      "isValid": true,
      "confidence": "high",
      "decodedData": {
        "model": "911",
        "generation": "",
        "bodyStyle": "GT4 Clubsport",
        "engineType": "GT4 Clubsport"
      }
    }
  ],
  "summaryStats": {
    "modelBreakdown": {
      "911": 29
    },
    "yearRange": {
      "min": 2001,
      "max": 2029
    },
    "confidenceBreakdown": {
      "high": 29
    }
  }
} as const;

// High confidence samples only (for core validation)
export const HIGH_CONFIDENCE_VINS = VIN_VALIDATION_DATASET.vinSamples
  .filter(sample => sample.confidence === 'high');

// VIN patterns by model for pattern recognition
export const VIN_PATTERNS_BY_MODEL = VIN_VALIDATION_DATASET.vinSamples
  .reduce((patterns, sample) => {
    if (!patterns[sample.model]) {
      patterns[sample.model] = [];
    }
    patterns[sample.model].push({
      vin: sample.vin,
      year: sample.year,
      trim: sample.trim,
      generation: sample.generation
    });
    return patterns;
  }, {} as Record<string, Array<{vin: string; year: number; trim: string; generation?: string}>>);
