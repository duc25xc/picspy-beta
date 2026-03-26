# Bước 1: Tạo thư mục tổng cho dự án

### Tạo folder frontend bằng Vite (chọn React, sau đó chọn Javascript hoặc Typescript tùy bạn)

`npm create vite@latest frontend -- --template react`

# Bước 2: Khởi tạo Frontend với Vite

### Đi vào thư mục frontend và cài đặt thư viện

`cd frontend`

`npm install`

# Bước 3: Khởi tạo Backend (Node.js & Express)

### Quay lại thư mục my-mern-app

`cd ..`

### Tạo thư mục backend

`mkdir backend`

`cd backend`

### Khởi tạo node project

`npm init -y`

### Cài đặt các thư viện "phải có" cho MERN

`npm install express mongoose cors dotenv`

`npm install --save-dev nodemon`

### sửa file \backend\package.json > script

### backend/frontend

`npm run dev`

# BƯỚC 4: THIẾT LẬP ESLINT & PRETTIER (CHO FRONTEND)

`cd frontend`

`npm install -D eslint-config-prettier eslint-plugin-prettier prettier`

### Tạo file cấu hình Prettier: Tạo file .prettierrc (ni .prettierrc) trong thư mục frontend với nội dung:

> {
> "singleQuote": true,
> "semi": false,
> "tabWidth": 2,
> "trailingComma": "es5"
> }

### Cấu hình ESLint (Flat Config): Mở file eslint.config.js trong frontend, import plugin và thêm vào mảng cấu hình:

`import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'`

# BƯỚC 5: CẤU HÌNH TỰ ĐỘNG FIX TRÊN VS CODE (GỐC DỰ ÁN)

Tạo thư mục cấu hình: Tại thư mục gốc (ducowo-mern-base), tạo folder .vscode (mkdir .vscode)
