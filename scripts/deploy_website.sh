#!/usr/bin/env bash
set -euo pipefail

# 1. 定位项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBSITE_DIR="$ROOT_DIR/website"

# 2. 部署目标服务器信息
REMOTE_USER="root"
REMOTE_HOST="43.119.88.83"
REMOTE_DEST="/var/www/web-test"

echo "------------------------------------------------------"
echo "🚀 开始打包并部署官网到测试服务器 ($REMOTE_HOST)..."
echo "------------------------------------------------------"

# 检查 website 目录是否存在
if [[ ! -d "$WEBSITE_DIR" ]]; then
  echo "❌ 错误: 未能在 $WEBSITE_DIR 找到官网文件夹。"
  exit 1
fi

echo "⏳ 1/3 正在压缩本地网站资源..."
cd "$ROOT_DIR"
tar -czf website.tar.gz website

echo "📤 2/3 正在上传压缩包至远端服务器..."
scp -o StrictHostKeyChecking=no website.tar.gz "$REMOTE_USER@$REMOTE_HOST:/tmp/"

echo "⚙️  3/3 正在解压并替换服务器 Nginx 目录文件..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << EOF
  # 确保目录存在
  mkdir -p $REMOTE_DEST
  
  # 直接将压缩包解压倒覆盖现有目录
  tar -xzf /tmp/website.tar.gz -C $REMOTE_DEST --strip-components=1
  
  # 将文件所有权赋给 Nginx (www-data) 处理者
  chown -R www-data:www-data $REMOTE_DEST
  
  # 扫清远端战场
  rm -f /tmp/website.tar.gz
EOF

echo "🧹 扫清本地战场..."
rm -f website.tar.gz

echo "------------------------------------------------------"
echo "✅ 闪电部署完成！"
echo "🎉 线上门面已更新: https://web-t.chuya.wang/"
echo "------------------------------------------------------"
