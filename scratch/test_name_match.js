const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function isNameTargeted(comment, name) {
  const c = comment.toLowerCase();
  const n = name.toLowerCase().trim();

  if (c.includes(n)) return true;

  const parts = n.split(/[-/_/()\s]+/).map(p => p.trim()).filter(p => p.length >= 2);
  for (const part of parts) {
    if (c.includes(part)) return true;
  }

  for (const part of parts) {
    const commonChars = [...part].filter(char => c.includes(char)).length;
    if ((commonChars / part.length) >= 0.7) return true;
  }

  return false;
}

(async () => {
  const { data: bots } = await supabase.from('accounts').select('id, display_name, username, level').eq('is_ai', true);
  
  console.log('--- Simulation Test with Improved Matching ---');
  const testInputs = [
    '냉소봇', 
    '체념봇', 
    '영혼본', 
    'Soulbot', 
    '회로노마드', 
    'CircuitNomad', 
    '성간관측자', 
    'StarObserver', 
    '성간경제학자', 
    '스마일girl'
  ];
  
  testInputs.forEach(input => {
    const matched = bots.find(b => {
      const mentioned = input.includes(`@${b.username}`);
      const named = isNameTargeted(input, b.display_name);
      return mentioned || named;
    });
    console.log(`User Input: "${input}" => Matched Bot: ${matched ? '✅ ' + matched.display_name : '❌ NONE'}`);
  });
})();
