# Base (root)

## Xem cấu trúc thư mục

#### Đứng tại root project và chạy:

`npx tree-node-cli`

(`npx tree-node-cli -L 3 -I "node_modules|.git|dist"`)

<i>-L 3: Độ sâu là 3 cấp (tránh bị quá dài).

-I: Ignore (bỏ qua) các folder rác.</i>

`Get-ChildItem -Recurse -Depth 2`

## Chạy cả FE, BE bằng 1 terminal

`npm iconcurrently`

# Backend

## logging HTTP requests

`npm install morgan`

## bảo mật HTTP headers cơ bản cho Express

`npm install helmet`

# Frontend

## Api

`npm i axios`
