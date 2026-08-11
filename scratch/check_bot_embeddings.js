const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = envText.split('\n').reduce((acc, line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    acc[key] = value.trim();
  }
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: bots, error } = await supabase
    .from('accounts')
    .select('id, display_name, is_ai, persona_prompt, persona_embedding')
    .eq('is_ai', true);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total AI Bots count: ${bots.length}`);
  bots.forEach((b, idx) => {
    const hasPrompt = Boolean(b.persona_prompt);
    const hasEmbedding = Boolean(b.persona_embedding);
    console.log(`[${idx+1}] ${b.display_name} | Prompt: ${hasPrompt} | Embedding: ${hasEmbedding}`);
  });
})();
