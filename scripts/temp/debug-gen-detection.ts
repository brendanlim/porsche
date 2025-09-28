// Test the generation detection logic
const getGenerationFromYear = (model: string, year: number): string => {
  const normalizedModel = model.toLowerCase();

  if (normalizedModel === '911') {
    if (year >= 2019) return '992';
    if (year >= 2012) return '991';
    if (year >= 2005) return '997';
    if (year >= 1999) return '996';
    if (year >= 1995) return '993';
    if (year >= 1989) return '964';
  }

  // Handle all Cayman/Boxster variants including 718-prefixed ones
  if (normalizedModel === 'cayman' || normalizedModel === 'boxster' ||
      normalizedModel === '718-cayman' || normalizedModel === '718-boxster' ||
      normalizedModel.includes('718')) {

    // 982 generation (718) - 2017+
    if (year >= 2017) return '982';

    // 981 generation - 2013-2016
    if (year >= 2013 && year <= 2016) return '981';

    // 987 generation - Cayman 2006-2012, Boxster 2005-2012
    if (year >= 2005 && year <= 2012) return '987';

    // 986 generation - Boxster only 1997-2004
    if (year >= 1997 && year <= 2004 && (normalizedModel === 'boxster' || normalizedModel === '718-boxster')) return '986';
  }

  return '';
};

// Test with different years for Cayman
console.log('=== Cayman Generation Detection ===');
const caymanYears = [
  2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, // Should be 982
  2016, 2015, 2014, 2013, // Should be 981
  2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005 // Should be 987
];

caymanYears.forEach(year => {
  const gen = getGenerationFromYear('cayman', year);
  console.log(`Cayman ${year}: ${gen}`);
});

console.log('\n=== Testing different model variants ===');
const models = ['cayman', '718-cayman', 'boxster', '718-boxster'];
const testYears = [2020, 2015, 2010];

models.forEach(model => {
  console.log(`\n${model}:`);
  testYears.forEach(year => {
    const gen = getGenerationFromYear(model, year);
    console.log(`  ${year}: ${gen}`);
  });
});