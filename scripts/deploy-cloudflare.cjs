const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const rootDir = path.resolve(__dirname, '..')

function getEnvVars() {
  const envFile = path.join(rootDir, '.env')
  const vars = {}
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf-8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        vars[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
      }
    }
  }
  return { ...vars, ...process.env }
}

const parsedEnv = getEnvVars()
let env = { ...parsedEnv }
// Locked Cloudflare account for AX_PROTEIN_FOOD
const zoneId = '0dd86559ec5e4085d682d08892f5fe83'
const apiToken = env.CLOUDFLARE_API_TOKEN || ''
const accountId = 'cb2cbce9c005b6719994cfbeefdc5da8'

env.CLOUDFLARE_API_TOKEN = apiToken
env.CLOUDFLARE_ACCOUNT_ID = accountId

async function deploy() {
  try {
    console.log('[PROTEIN_FOOD] Building production bundle (vite build)...')
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: rootDir,
      env,
    })

    console.log('[PROTEIN_FOOD] Deploying to Cloudflare Pages (protein-food)...')
    execSync('npx wrangler@4.158.0 pages deploy dist --project-name protein-food --branch main --commit-dirty=true', {
      stdio: 'inherit',
      cwd: rootDir,
      env,
    })
    console.log('[PROTEIN_FOOD] Live deployment complete: https://protein-food.axsonid.com')

    // Purge cache on axsonid.com zone so the update reflects instantly
    console.log('[PROTEIN_FOOD] Purging Cloudflare CDN Edge Cache...')
    try {
      const purgeRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      })
      const purgeData = await purgeRes.json()
      console.log('[PROTEIN_FOOD] Cache purge result:', purgeData.success ? 'Success' : purgeData)
    } catch (purgeErr) {
      console.warn('[PROTEIN_FOOD] Cache purge warning:', purgeErr.message)
    }

    // Broadcast Web Push release notification to all devices 24/7
    console.log('[PROTEIN_FOOD] Broadcasting Web Push release notification...')
    try {
      const verPath = path.join(rootDir, 'public', 'version.json')
      const ver = fs.existsSync(verPath) ? JSON.parse(fs.readFileSync(verPath, 'utf-8')) : { version: '1.8.6' }
      const sbUrl = parsedEnv.VITE_SUPABASE_URL
      const sbKey = parsedEnv.VITE_SUPABASE_ANON_KEY
      if (sbUrl && sbKey) {
        const notifRes = await fetch(`${sbUrl}/rest/v1/ax_notifications`, {
          method: 'POST',
          headers: {
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: `release-${ver.version}-${Date.now()}`,
            title: `تحديث جديد للمنظومة (v${ver.version})`,
            message: ver.releaseNotes || `تم إطلاق الإصدار ${ver.version} للمنظومة بنجاح.`,
            type: 'system',
            target_tab: '/',
            target_user_id: 'all'
          })
        })
        console.log('[PROTEIN_FOOD] Web Push notification broadcast sent:', notifRes.ok ? 'Success' : notifRes.status)
      }
    } catch (pushErr) {
      console.warn('[PROTEIN_FOOD] Push notification broadcast error:', pushErr.message)
    }
  } catch (err) {
    console.error('[PROTEIN_FOOD] Deployment failed:', err.message)
    process.exit(1)
  }
}

deploy()
