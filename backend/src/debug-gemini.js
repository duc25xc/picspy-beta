/**
 * Debug script: List tất cả models đang available với API key hiện tại
 * Chạy: node src/debug-gemini.js
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.GEMINI_API_KEY
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}` : '❌ KHÔNG TÌM THẤY KEY')
console.log('')

if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('❌ GEMINI_API_KEY chưa được set trong .env!')
  process.exit(1)
}

// Test 1: List available models qua REST API
console.log('📋 Đang lấy danh sách models...\n')
try {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )
  const data = await res.json()

  if (data.error) {
    console.error('❌ Lỗi khi list models:')
    console.error(JSON.stringify(data.error, null, 2))
  } else {
    const flashModels = (data.models || []).filter(m =>
      m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent')
    )
    console.log(`✅ Tìm thấy ${flashModels.length} flash model hỗ trợ generateContent:\n`)
    flashModels.forEach(m => {
      console.log(`  • ${m.name.replace('models/', '')}`)
      console.log(`    Display: ${m.displayName}`)
      console.log(`    Version: ${m.version}`)
      console.log('')
    })
  }
} catch (err) {
  console.error('❌ Lỗi fetch list models:', err.message)
}

// Test 2: Quick test từng model với prompt nhỏ (không dùng ảnh để tiết kiệm token)
const TEST_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
]

console.log('\n🧪 Test từng model với prompt nhỏ...\n')
const genAI = new GoogleGenerativeAI(apiKey)

for (const modelName of TEST_MODELS) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent('Trả lời đúng 1 từ: Gemini')
    const text = result.response.text().trim()
    console.log(`  ✅ ${modelName} → OK (response: "${text.substring(0, 30)}")`)
  } catch (err) {
    const msg = err.message || ''
    if (msg.includes('429') || msg.includes('quota')) {
      console.log(`  ⏱️  ${modelName} → RATE LIMITED (quota hết)`)
    } else if (msg.includes('404')) {
      console.log(`  ❌ ${modelName} → 404 (model không tồn tại hoặc bị tắt)`)
    } else {
      console.log(`  ❌ ${modelName} → ${msg.substring(0, 80)}`)
    }
  }
}
