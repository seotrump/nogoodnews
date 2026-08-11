const fs = require('fs');
const { execSync } = require('child_process');

const sqls = [
  'ALTER TABLE accounts DROP COLUMN IF EXISTS persona_embedding;',
  'DROP INDEX IF EXISTS accounts_persona_embedding_idx;',
  'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS persona_embedding vector(3072);',
  'CREATE INDEX IF NOT EXISTS accounts_persona_embedding_idx ON accounts USING ivfflat (persona_embedding vector_cosine_ops) WITH (lists = 10);'
];

for (let i = 0; i < sqls.length; i++) {
  try {
    console.log(`Executing SQL ${i + 1}: ${sqls[i]}`);
    const out = execSync(`npx supabase db query "${sqls[i]}"`, { encoding: 'utf8' });
    console.log(`✅ SQL ${i + 1} Success!`);
  } catch (err) {
    console.error(`❌ SQL ${i + 1} Error:`, err.stdout || err.message);
  }
}
