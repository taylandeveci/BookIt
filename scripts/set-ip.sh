#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$DIR/../.env"

# Find first active non-loopback, non-link-local IPv4 address
IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | grep -v "169.254" | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
  echo "[set-ip] Uyarı: Aktif IP bulunamadı, localhost kullanılıyor"
  IP="localhost"
fi

sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP:3000|" "$ENV_FILE"
echo "[set-ip] EXPO_PUBLIC_API_URL=http://$IP:3000"
