const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[match[1]] = value.trim();
  }
});

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('Available models:', data.models?.map(m => ({ name: m.name, supportedGenerationMethods: m.supportedGenerationMethods })));
}

listModels();
