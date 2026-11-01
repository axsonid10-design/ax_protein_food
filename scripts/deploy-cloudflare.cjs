const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const rootDir = path.resolve(__dirname, '..')

let env = { ...process.env }
const credPath = path.join(os.homedir(), '.gemini', 'antigravity', 'cloudflare_creds.json')
if (fs.existsSync(credPath)) {
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'))
    if (creds.api_token) env.CLOUDFLARE_API_TOKEN = creds.api_token
    if (creds.account_id) env.CLOUDFLARE_ACCOUNT_ID = creds.account_id
  } catch {}
}

try {
  console.log('[PROTEIN_FOOD] Deploying to Cloudflare Pages (ax-protein-food)...')
  execSync('npx wrangler pages deploy dist --project-name ax-protein-food --branch main --commit-dirty=true', {
    stdio: 'inherit',
    cwd: rootDir,
    env,
  })
  console.log('[PROTEIN_FOOD] Live deployment complete: https://ax-protein-food.pages.dev')
} catch (err) {
  console.error('[PROTEIN_FOOD] Deployment failed:', err.message)
  process.exit(1)
}
