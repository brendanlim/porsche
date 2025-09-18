// Test script to check if GT4 analytics still returns 987 generation

async function testGT4Analytics() {
  try {
    console.log('Testing GT4 analytics API...');
    
    const response = await fetch('http://localhost:3003/api/analytics/718-cayman/gt4?range=2y');
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      const text = await response.text();
      console.error('Error response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('Generations found:', data.generations);
    
    if (data.generations?.includes('987')) {
      console.error('❌ PROBLEM: 987 generation still appears in GT4 analytics!');
    } else {
      console.log('✅ SUCCESS: No 987 generation in GT4 analytics');
    }
    
    console.log('Full response generations:', data.generations);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGT4Analytics();