# BookIT

Appointment booking platform for service businesses.

---

## Running the app (Simulator)

The standard development workflow uses the iOS simulator:

```
npm run demo:full
```

This starts both the backend (port 3000) and the Expo bundler
pointed at the simulator. Nothing else is required.

---

## Testing on Physical Device (QR Code)

### Fiziksel Cihazda Test (QR Kod) / Testing on Physical Device

**Turkce:**

1. Telefona App Store veya Google Play'den **Expo Go** uygulamasini yukleyin.

2. Ag secenekleri:
   - **Tunnel modu** (farkli aglar icin): `npm run dev:qr`
     Telefon ve bilgisayarin ayni Wi-Fi aginda olmasi gerekmez.
     Expo'nun tunnel altyapisi baglantiya aracililik eder.
   - **LAN modu** (ayni Wi-Fi): `npm run dev:qr:lan`
     Telefon ve bilgisayar ayni Wi-Fi aginda olmalidir.

3. LAN modunu kullananlar icin:
   Calistirmadan once `.env.qr` dosyasini acin ve
   `EXPO_PUBLIC_API_URL` degerindeki IP adresini kendi
   makinenizin yerel IP adresiyle degistirin.
   - Mac/Linux: `ifconfig | grep "inet "` komutuyla bulunur
   - Windows: `ipconfig` komutuyla bulunur
   Ardından uygulamayi `.env.qr` ile baslatmak icin scripti
   `--env-file .env.qr` parametresiyle calistirin ya da
   `.env` dosyasindaki URL'yi gecici olarak guncelleyin.

4. Terminal'de gorunen QR kodu:
   - iOS: Kamera uygulamasiyla tarayin
   - Android: Expo Go uygulamasi icinde tarayin

5. Mevcut `npm run demo:full` komutu degismeden calismaya devam eder.

---

**English:**

1. Install **Expo Go** on your phone from the App Store (iOS) or
   Google Play (Android).

2. Choose a connection mode:
   - **Tunnel mode** (works across different networks): `npm run dev:qr`
     The phone and computer do not need to be on the same Wi-Fi.
     Expo's tunnel service handles the connection.
   - **LAN mode** (same Wi-Fi only): `npm run dev:qr:lan`
     The phone and computer must be on the same Wi-Fi network.

3. For LAN mode only:
   Before running, open `.env.qr` and replace the IP address in
   `EXPO_PUBLIC_API_URL` with your machine's local IP address.
   - Mac/Linux: find it with `ifconfig | grep "inet "`
   - Windows: find it with `ipconfig`
   Then start the app using `.env.qr` by passing `--env-file .env.qr`
   to the script, or temporarily update the URL in `.env`.

4. Scan the QR code shown in the terminal:
   - iOS: use the Camera app
   - Android: use the Expo Go app

5. The existing `npm run demo:full` command is unchanged and still works.

---

### Expo Go version compatibility

If the Expo SDK version in `app.json` does not match the Expo Go
app version installed on the device, a compatibility warning will
appear. In that case:

- Use tunnel mode (`npm run dev:qr`) which handles version differences
  more gracefully, or
- Update Expo Go to the latest version from the app store.

The current SDK version is `52` (see `app.json`).

---

## Available scripts

| Script | Description |
|---|---|
| `npm run demo:full` | Start backend + Expo for iOS simulator (existing workflow) |
| `npm run demo:sim` | Open simulator first, then start demo:full |
| `npm run dev:qr` | Start backend + Expo with tunnel for physical device |
| `npm run dev:qr:lan` | Start Expo on local network (LAN mode, no backend) |
| `npm run dev:expo:qr` | Start only Expo with tunnel (no backend) |
| `npm run dev:backend` | Start only the backend server |
| `npm run dev:all` | Start backend + Expo for simulator |

---

## Backend

The backend runs on port 3000. Source: `/Users/taylandeveci/BookIT-backend`
