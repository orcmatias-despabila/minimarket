import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const migrationFiles = [
  'supabase/migrations/20260406_business_workspace.sql',
  'supabase/migrations/20260406_business_invitations_stage4.sql',
  'supabase/migrations/20260406_roles_and_policies_stage5.sql',
  'supabase/migrations/20260406_granular_permissions_stage6.sql',
  'supabase/migrations/20260406_audit_logs_stage7.sql',
  'supabase/migrations/20260406_operational_security_stage8.sql',
  'supabase/migrations/20260407_profiles_and_onboarding_fix.sql',
]

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

try {
  await client.connect()

  for (const file of migrationFiles) {
    const fullPath = path.resolve(file)
    const sql = await readFile(fullPath, 'utf8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
  }

  const profileCheck = await client.query(
    `
      select id, email
      from public.profiles
      where lower(email) = lower($1)
    `,
    ['orcmatias@gmail.com'],
  )

  console.log('Profiles found:', profileCheck.rows.length)
  if (profileCheck.rows[0]) {
    console.log(`Profile OK for ${profileCheck.rows[0].email}`)
  }
} finally {
  await client.end()
}
