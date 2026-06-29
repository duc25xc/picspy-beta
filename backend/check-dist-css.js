import fs from 'fs'
import path from 'path'

const assetsDir = 'd:/DataOfDevelopers/Projects/2026/picspy/frontend/dist/assets'
const files = fs.readdirSync(assetsDir)
const cssFile = files.find(f => f.endsWith('.css'))

if (!cssFile) {
  console.log('No CSS file found!')
  process.exit(1)
}

const cssPath = path.join(assetsDir, cssFile)
const content = fs.readFileSync(cssPath, 'utf8')

console.log('File size:', content.length)
console.log('Contains --color-brand-600:', content.includes('--color-brand-600'))
console.log('Contains var(--color-brand-600):', content.includes('var(--color-brand-600)'))

// Find where var(--color-brand-600) is used in the CSS
const index = content.indexOf('var(--color-brand-600)')
if (index !== -1) {
  console.log('Snippet around usage:', content.substring(index - 100, index + 100))
} else {
  console.log('Not found!')
}

// Find all var(--color-brand- gradient usages
const indexGrad = content.indexOf('var(--color-brand-gradient-end)')
if (indexGrad !== -1) {
  console.log('Gradient usage:', content.substring(indexGrad - 100, indexGrad + 100))
}

process.exit(0)
