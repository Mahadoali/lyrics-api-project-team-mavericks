
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let targetUrl;
    const path = event.path.replace('/.netlify/functions/proxy', ''); 

    if (path.startsWith('/deezer-search')) {
      
        const queryString = event.rawQuery; 
        targetUrl = `https://api.deezer.com/search?${queryString}`;
    } else if (path.startsWith('/deezer-album')) {
        targetUrl = `https://api.deezer.com/album${path.replace('/deezer-album','')}`;
    } else if (path.startsWith('/deezer-artist')) {
        targetUrl = `https://api.deezer.com/artist${path.replace('/deezer-artist','')}`;
    } else if (path.startsWith('/deezer-track')) {
       
        targetUrl = `https://api.deezer.com/track${path.replace('/deezer-track','')}`;
    } else if (path.startsWith('/')) {
        
        targetUrl = `https://api.lyrics.ovh/v1${path}`;
    } else {
        return { statusCode: 400, body: 'Invalid API path.' };
    }

    console.log(`Proxying request to: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl);

        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': response.headers.get('content-type') || 'application/json'
        };

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`Upstream API Error ${response.status}:`, errorBody);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify(errorBody),
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Proxy function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Internal Server Error during proxy request.', error: error.message }),
        };
    }
};