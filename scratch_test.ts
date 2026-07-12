import { config } from 'dotenv';
config({ path: '.env' });

const API_KEY = process.env.BUYACCS_API_KEY;
console.log("API KEY starts with:", API_KEY ? API_KEY.slice(0, 5) : "MISSING");

async function run() {
    const res = await fetch(`https://buy-accs.net/api/goods?api_key=${API_KEY}&currency=usd`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data).slice(0, 200));
    console.log("Goods length:", data.goods ? data.goods.length : "undefined");
}

run().catch(console.error);
