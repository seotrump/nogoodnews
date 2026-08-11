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

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testEmbedding() {
  console.log('Testing gemini-embedding-2...');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
    const res = await model.embedContent('테스트 페르소나 문구입니다.');
    console.log('Embedding Success! Vector length:', res.embedding.values.length);
  } catch (err) {
    console.error('Embedding Failed:', err);
  }
}

testEmbedding();
