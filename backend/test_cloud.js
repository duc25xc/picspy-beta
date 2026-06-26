// backend/test_cloud.js - TEST CLOUDINARY API

import { v2 as cloudinary } from 'cloudinary'

// Cấu hình bằng chính Key bạn vừa cung cấp
cloudinary.config({
  cloud_name: 'dnwb81zej',
  api_key: '382932449769444',
  api_secret: 'Kf5MzroFEP1mAlcW0pdpRm2C3o8',
})

async function getAccountInfo() {
  try {
    // Gọi API hệ thống của Cloudinary để lấy thông tin usage và account
    const result = await cloudinary.api.usage()
    console.log('=== KẾT QUẢ ĐÂY RỒI ===')
    console.log(result)
  } catch (error) {
    console.error('Lỗi rồi bạn ơi:', error)
  }
}

getAccountInfo()

// node test_cloud.js
