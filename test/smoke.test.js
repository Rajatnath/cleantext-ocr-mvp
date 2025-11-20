// Simple smoke test for the API
// Run with: node test/smoke.test.js

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/gemini-vision',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', data);
        try {
            const json = JSON.parse(data);
            if (json.error || json.text || json.name === 'Placeholder') {
                console.log('PASS: Response is valid JSON with expected fields.');
            } else {
                console.error('FAIL: Unexpected JSON structure.');
                process.exit(1);
            }
        } catch (e) {
            console.error('FAIL: Response is not valid JSON.');
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

// Write data to request body
req.write(JSON.stringify({
    imageBase64: 'test',
    prompt: 'test',
    forceFallback: false
}));

req.end();
