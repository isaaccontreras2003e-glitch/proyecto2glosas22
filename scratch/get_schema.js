const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').filter(Boolean).forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getSchema() {
    const url = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(url, {
        headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        }
    });
    const schema = await response.json();
    console.log(schema);
}

getSchema().catch(console.error);
