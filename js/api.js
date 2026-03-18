// js/api.js
const API_URL = "https://script.google.com/macros/s/AKfycbzfVOOpusjTaKDMhkeojGRNa5ix4WqVM8UL7mrHZ8t6ubpQGA6MeeyPGfZF3ReGbcNJ/exec";

async function callAPI(payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            // ส่งแบบ text/plain ป้องกันปัญหา CORS Block จาก Browser
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        return result.data || result.message;
    } catch (error) {
        console.error("API Communication Error:", error);
        throw error;
    }
}
