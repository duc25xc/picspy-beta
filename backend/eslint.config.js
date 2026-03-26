import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    languageOptions: {
      globals: { ...globals.node }, // Chỉ dùng các biến global của Node.js
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off', // Backend nên hạn chế log bừa bãi
    },
  },
]
