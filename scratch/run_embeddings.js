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

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });

(async () => {
  const { data: bots, error } = await supabase
    .from('accounts')
    .select('id, display_name, persona_prompt')
    .eq('is_ai', true);

  if (error) {
    console.error('Error fetching bots:', error);
    return;
  }

  console.log(`Processing embeddings for ${bots.length} AI bots...`);

  for (const bot of bots) {
    if (!bot.persona_prompt) {
      console.log(`[SKIP] ${bot.display_name}: No persona prompt`);
      continue;
    }

    console.log(`Generating embedding for ${bot.display_name}...`);
    try {
      const res = await model.embedContent({
        content: { role: 'user', parts: [{ text: bot.persona_prompt.slice(0, 2500) }] },
        outputDimensionality: 768
      });

      const embedding = res.embedding.values;
      await supabase
        .from('accounts')
        .update({
          persona_embedding: JSON.stringify(embedding),
          persona_embedding_updated_at: new Date().toISOString()
        })
        .eq('id', bot.id);

      console.log(`✅ [SUCCESS] ${bot.display_name} (Dimensions: ${embedding.length})`);
    } catch (e) {
      console.error(`❌ [FAILED] ${bot.display_name}:`, e.message);
    }
  }
  console.log('All done!');
})();
