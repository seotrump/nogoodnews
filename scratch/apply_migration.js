const fs = require('fs');
const { execSync } = require('child_process');

const sqlContent = fs.readFileSync('supabase/migrations/20260811000001_add_persona_embedding.sql', 'utf8');

// 주석제거
const cleanSql = sqlContent
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

const statements = cleanSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Executing ${statements.length} SQL statements via Supabase CLI...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  console.log(`Running statement ${i + 1}/${statements.length}:`);
  console.log(stmt);
  try {
    // 쿼리 내 개행을 공백으로 치환하여 CLI 전달
    const querySingleLine = stmt.replace(/\s+/g, ' ');
    // Windows powershell / cmd escaping
    const out = execSync(`npx supabase db query "${querySingleLine.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
    console.log(`✅ Statement ${i + 1} Success!`);
  } catch (err) {
    console.error(`❌ Statement ${i + 1} Error:`, err.stdout || err.message);
  }
}
