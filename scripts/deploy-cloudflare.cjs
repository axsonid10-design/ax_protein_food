const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const rootDir = path.resolve(__dirname, '..')

let env = { ...process.env }
const credPath = path.join(os.homedir(), '.gemini', 'antigravity', 'cloudflare_creds.json')
let zoneId = '0dd86559ec5e4085d682d08892f5fe83'
let apiToken = ''
let accountId = 'cb2cbce9c005b6719994cfbeefdc5da8'

if (fs.existsSync(credPath)) {
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'))
    if (creds.api_token) apiToken = creds.api_token
    if (creds.account_id) accountId = creds.account_id
    if (creds.zone_id) zoneId = creds.zone_id
  } catch {}
}

env.CLOUDFLARE_API_TOKEN = apiToken
env.CLOUDFLARE_ACCOUNT_ID = accountId

async function deploy() {
  try {
    console.log('[PROTEIN_FOOD] Deploying to Cloudflare Pages (protein-food)...')
    execSync('npx wrangler pages deploy dist --project-name protein-food --branch main --commit-dirty=true', {
      stdio: 'inherit',
      cwd: rootDir,
      env,
    })
    console.log('[PROTEIN_FOOD] Live deployment complete: https://protein-food.axsonid.com')

    // Purge cache on axsonid.com zone so the update reflects instantly
    console.log('[PROTEIN_FOOD] Purging Cloudflare CDN Edge Cache...')
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
  } catch (err) {
    console.error('[PROTEIN_FOOD] Deployment failed:', err.message)
    process.exit(1)
  }
}

deploy()
