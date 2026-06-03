import fetch from 'node-fetch';

async function test() {
    const today = new Date().toISOString().split('T')[0];
    const url = `http://localhost:3000/api/prescriptions?date=${today}`;
    console.log('Fetching:', url);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
