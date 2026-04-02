import bcrypt from 'bcryptjs'

const password = 'conmeocute123'
const saltRounds = 12

bcrypt.hash(password, saltRounds).then((hash) => {
  console.log('Mật khẩu đã hash là:', hash)
})
