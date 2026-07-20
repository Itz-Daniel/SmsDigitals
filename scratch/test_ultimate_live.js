require('dotenv').config({ path: '.env.local' });

async function testMarketplace() {
  const API_KEY = process.env.ULTIMATE_LOGS_API_KEY;
  console.log("API Key found:", !!API_KEY);

  try {
    const res = await fetch('https://ultimatelogsmarketplace.com/api/v1/products', {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json'
      }
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text.substring(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

testMarketplace();
