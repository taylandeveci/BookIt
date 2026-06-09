# BookIT — Proje Durum Raporu
**Tarih:** 12 Nisan 2026  
**Dizin:** `/Users/taylandeveci/BookIt/olddemo` (frontend) · `/Users/taylandeveci/BookIT-backend` (backend)

---

## 1. Genel Bakış

BookIT, güzellik salonları, berberler ve benzeri hizmet işletmeleri için geliştirilmiş bir **randevu ve rezervasyon platformudur**. Tek bir React Native uygulaması; müşteri, çalışan ve işletme sahibi olmak üzere üç farklı rolü destekler. Kullanıcının rolüne göre navigasyon ve ekranlar tamamen ayrışır.

**Sistem iki parçadan oluşur:**

| Parça | Teknoloji | Port |
|---|---|---|
| Frontend | React Native + Expo | 8081 |
| Backend | Node.js + Express + Prisma + PostgreSQL | 3000 |

**Tek komutla başlatma:** `npm run demo:full`

---

## 2. Sistem Mimarisi

### Roller

| Rol | Açıklama |
|---|---|
| `USER` | Müşteri — işletme arar, randevu alır, yorum bırakır |
| `EMPLOYEE` | Çalışan — kendi takvimine bakar, randevuları yönetir |
| `OWNER` | İşletme sahibi — dashboard, çalışan ve hizmet yönetimi |

### Navigasyon Ağacı

```
RootNavigator
├── AuthStack (giriş yapılmamış)
│   ├── LoginScreen
│   ├── RegisterScreen (rol seçimi: Müşteri / Çalışan / İşletme Sahibi)
│   ├── EmployeePendingScreen  ← çalışan onay bekliyor
│   └── (EmployeeRejectedScreen bilgisi login'de gösterilir)
│
├── UserTabs (role === USER)
│   ├── Home
│   ├── Search (harita modali dahil)
│   ├── Appointments
│   └── Profile
│       └── EditProfile (ayrı stack ekranı)
│           ChangePassword
│           Review
│           BusinessDetail
│           BusinessReviews
│
├── EmployeeTabs (role === EMPLOYEE && status === ACTIVE)
│   ├── Dashboard (bugünkü randevular)
│   ├── Calendar (haftalık takvim görünümü)
│   ├── Services (kendi hizmet yönetimi)
│   ├── Schedule (çalışma saatleri)
│   └── Profile
│       └── EmployeeEditProfile (ayrı stack ekranı)
│
└── OwnerTabs (role === OWNER)
    ├── Dashboard (metrikler, grafik, bekleyen çalışanlar)
    ├── Requests (randevu istekleri)
    ├── Employees (çalışan CRUD)
    ├── Services (hizmet CRUD)
    └── OwnerProfile (işletme ayarları, joinCode, logo)
```

---

## 3. Veritabanı Modeli

PostgreSQL + Prisma ORM üzerinde aşağıdaki tablolar bulunur:

| Tablo | Açıklama |
|---|---|
| `users` | Tüm kullanıcılar (role: USER / EMPLOYEE / OWNER) |
| `businesses` | İşletme profili, joinCode, ayarlar |
| `employees` | Çalışan kaydı — userId ile User'a bağlanır, status: PENDING/ACTIVE/REJECTED |
| `services` | İşletmeye ait hizmetler (isim, fiyat, süre) |
| `employee_services` | Çalışan ↔ hizmet many-to-many ilişkisi |
| `employee_schedules` | Çalışanın haftalık program (dayOfWeek, startTime, endTime) |
| `reservations` | Randevular — actualStartTime/actualEndTime ile gerçek süre takibi |
| `business_media` | İşletme fotoğrafları |
| `reviews` | Müşteri yorumları (PENDING/APPROVED/REJECTED) |
| `notifications` | Bildirim kayıtları |

### Kritik Alan: Çift Rezervasyon Koruması

```prisma
@@unique([employeeId, startTime])  // Aynı çalışana aynı saatte iki rezervasyon açılmaz
```

### Erken Tamamlama (Early Completion)

`actualEndTime` set edildiği anda slot serbest kalır. Timeslot sorgusunda `actualEndTime ?? endTime` (COALESCE) kullanılır — ek bir "serbest bırak" işlemine gerek yoktur.

---

## 4. Backend API

### Auth (`/auth`)

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/register-user` | Müşteri kaydı |
| POST | `/register-owner` | İşletme sahibi kaydı — Business otomatik oluşur, joinCode üretilir |
| POST | `/register-employee` | Çalışan kaydı — joinCode doğrulama, PENDING Employee oluşturma |
| POST | `/login` | Giriş — JWT döner |
| GET | `/me` | Oturum bilgisi (EMPLOYEE ise `employee{status}` include edilir) |
| POST | `/verify-join-code` | JoinCode geçerliliği kontrol (`{ businessId, businessName, isValid }`) |
| PUT | `/profile/:userId` | Profil güncelleme (ad, email, avatarUrl) |
| POST | `/change-password/:userId` | Şifre değiştirme |
| POST | `/logout` | Oturum kapatma |

### Businesses (`/businesses`)

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/` | İşletme listesi (filtreli arama) |
| GET | `/recommended` | Önerilen işletmeler (anasayfa) |
| GET | `/:id` | İşletme detayı |
| GET | `/:id/employees` | İşletme çalışanları (employeeServices dahil) |
| GET | `/:id/services` | Hizmetler (`?employeeId` ile sadece o çalışana ait hizmetler) |
| GET | `/:id/reviews` | Yorumlar |
| GET | `/:id/time-slots` | Müsait slot listesi (`?date&employeeId&serviceId`) |

### Owner (`/owner`)

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/business` | İşletme bilgisi |
| PUT/PATCH | `/business` | İşletme güncelleme / joinCode & releaseOnEarlyCompletion |
| GET | `/appointments` | Tüm randevular |
| POST | `/appointments/:id/approve` | Randevu onayla |
| POST | `/appointments/:id/reject` | Randevu reddet |
| POST | `/appointments/:id/complete` | Randevu tamamla |
| GET | `/employees` | Çalışan listesi |
| POST | `/employees` | Yeni çalışan ekle |
| PUT/DELETE | `/employees/:id` | Çalışan güncelle/sil (`requireOwnerOverEmployee` middleware) |
| GET | `/pending-employees` | PENDING çalışan başvuruları |
| PUT | `/employees/:id/approve` | Çalışan onayla → status = ACTIVE |
| PUT | `/employees/:id/reject` | Çalışan reddet → status = REJECTED |
| GET | `/services` | Hizmet listesi |
| POST | `/services` | Hizmet ekle |
| PUT/DELETE | `/services/:id` | Hizmet güncelle/sil |
| GET | `/reviews` | Yorum listesi |
| POST | `/reviews/:id/approve` | Yorumu onayla |
| POST | `/reviews/:id/reject` | Yorumu reddet |

### Employee (`/employee`)

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/appointments` | Bugünkü randevular (sıralı) |
| GET | `/appointments?all=true` | Tüm randevular |
| POST | `/appointments/:id/start` | Randevuyu başlat — `actualStartTime = now`, status = IN_PROGRESS |
| POST | `/appointments/:id/complete` | Randevuyu tamamla — `actualEndTime = now`, status = COMPLETED |
| POST | `/appointments/:id/approve` | Çalışan randevu onayı |
| POST | `/appointments/:id/decline` | Çalışan randevu reddi |
| GET | `/services` | Bu çalışana atanmış hizmetler |
| POST | `/services/:serviceId` | Hizmet ekle (EmployeeService oluştur) |
| DELETE | `/services/:serviceId` | Hizmet çıkar |
| GET | `/schedule` | Haftalık program (7 gün) |
| PUT | `/schedule` | Program upsert (`[{dayOfWeek, startTime, endTime}]`) |
| POST | `/join-business` | JoinCode ile işletmeye katılma isteği gönder |
| DELETE | `/leave-business` | İşletmeden ayrıl (Employee.userId = null) |

---

## 5. Timeslot (Müsaitlik) Motoru

`GET /businesses/:id/time-slots?employeeId=&date=&serviceId=` endpoint'i gerçek bir müsaitlik hesaplama algoritması çalıştırır:

1. `EmployeeSchedule`'dan o gün çalışıyor mu kontrol et — yoksa `[]` dön.
2. `workStart → workEnd` arasında `durationMin` adımlı slot listesi üret.
3. O gün `PENDING + APPROVED + IN_PROGRESS` rezervasyonları **tek Prisma sorgusuyla** çek.
4. Her rezervasyon için meşgul aralık: `busyStart = startTime`, `busyEnd = actualEndTime ?? endTime` **(COALESCE — erken tamamlama)**
5. Overlap kontrolü: `slotStart < busyEnd && slotEnd > busyStart`
6. Geçmiş slotları filtrele.

**Sonuç:** `{ slots: [{ time: ISO, available: boolean }] }`

---

## 6. Frontend — Ekranlar ve Özellikler

### USER (Müşteri)

**HomeScreen**
- Önerilen işletmeler + aktif randevu sayısı kartı
- Pull-to-refresh, skeleton loading

**SearchScreen**
- İşletme arama (isim/şehir filtreleme)
- **Harita Modali** — `react-native-maps` ile tüm işletmelerin pin'leri, `SafeAreaInset` aware kapatma butonu, `pointerEvents="box-none"` overlay (harita touch geçirgen, buton tıklanabilir)

**BusinessDetailScreen**
- İşletme profili, fotoğraflar, hizmet listesi, çalışan seçimi
- Randevu akışı: tarih → saat seçimi (gerçek slot motoru) → onay

**AppointmentsScreen**
- Aktif ve geçmiş randevular, iptal, yorum yazma

**ProfileScreen**
- Profil düzenleme (ad, email, avatar — ayrı `EditProfile` ekranı)
- Şifre değiştirme, dil seçimi (TR/EN), dark mode toggle, logout

**BusinessReviewsScreen**
- Ortalama puan, puan dağılımı, yorum listesi

---

### EMPLOYEE (Çalışan)

**EmployeeDashboardScreen**
- Bugünkü randevu listesi (sıralı)
- "Başlat" butonu → `actualStartTime` set, status = IN_PROGRESS
- "Tamamla" butonu → `actualEndTime` set, status = COMPLETED
- Randevu onaylama/reddetme

**EmployeeCalendarScreen**
- Haftalık takvim görünümü (`react-native-calendars`)
- Seçili güne ait randevular

**EmployeeServicesScreen**
- İşletmenin tüm hizmetleri listelenir
- Toggle ile ekle/çıkar — işlem sonrası TanStack Query cache invalidation → müşteri tarafında anlık güncelleme

**EmployeeScheduleScreen**
- 7 günlük haftalık program
- Her gün için startTime/endTime seçimi, kapalı gün toggle
- Kaydet → `PUT /employee/schedule`

**EmployeeProfileScreen**
- Avatar, ad, email, rol badge
- "Profili Düzenle" butonu → `EmployeeEditProfile` stack ekranı
- **Workplace Kartı:**
  - State A (atanmamış): JoinCode input + "Send Join Request" butonu → PENDING göstergesi
  - State B (atanmış): İşletme adı/adresi + "Leave Business" butonu (Alert onayı ile)
  - PENDING state: saat ikonu + bekliyor mesajı
- Dark mode, dil seçimi, bildirimler, logout

**EmployeeEditProfileScreen** *(yeni — customer profil düzenleme ile aynı yapı)*
- Avatar değiştirme (expo-image-picker, base64, 1:1 crop)
- Ad ve email düzenleme (react-hook-form + zod validasyon)
- Kaydet → `PUT /auth/profile/:userId`

---

### OWNER (İşletme Sahibi)

**DashboardScreen**
- İşletme adı + Day/Month/Year filtre
- **Bekleyen Çalışanlar Bölümü:** PENDING başvurular, Onayla/Reddet butonları, otomatik liste yenileme
- **Ortalama Puan Kartı:** ortalama puan (büyük), yıldız satırı, yorum sayısı — tamamen merkezli
- **Randevu Line Chart (`react-native-gifted-charts`):**
  - 4 seri: Completed · Confirmed · No Show · Cancelled (ayrı renkler)
  - Day: 8am–6pm 2'şer saatlik dilimler
  - Month: W1–W4 haftalık gruplar
  - Year: yalnızca rezervasyonu olan aylar gösterilir
  - Y-ekseni: `niceStep()` ile temiz grid çizgileri
- **2×2 Stat Grid:** Completed / Confirmed / No Show / Cancelled sayım kartları (bölücü çizgilerle)
- **Toplam Gelir Kartı:** tamamlanan randevu gelirleri, önceki dönemle trend badge (yüzde, yukarı/aşağı ok)
- **Çalışan Performans Listesi:** kişi başı gelir, alfabetik baş harf avatar

**RequestsScreen**
- Tüm randevu istekleri (PENDING/APPROVED/REJECTED/COMPLETED/CANCELLED)
- Onayla, Reddet, Tamamla aksiyonları

**EmployeesScreen**
- Çalışan CRUD (ekle, düzenle, sil)
- Status badge: ACTIVE / PENDING / REJECTED

**ServicesScreen**
- Hizmet CRUD (isim, fiyat, süre, açıklama)

**OwnerProfileScreen**
- İşletme profil düzenleme (ad, adres, açıklama, şehir, telefon)
- İşletme fotoğrafları yönetimi (ekle, sil)
- `joinCode` göster + kopyala (Expo Clipboard)
- `joinCodeEnabled` toggle
- `releaseOnEarlyCompletion` toggle

---

## 7. Çapraz Kesit Özellikler

### Lokalizasyon (TR / EN)

`i18next` + `react-i18next` tabanlı tam çift dil desteği:
- `src/localization/locales/tr.json` ve `en.json`
- Tüm UI metinleri, hata mesajları, buton etiketleri çevrilmiş
- Dil seçimi uygulama içinden yapılabilir (Profile ekranı), tercih `AsyncStorage`'da saklanır

### Tema (Dark / Light)

`Zustand` store ile global dark/light mode toggle. Tüm ekranlar `useTheme()` hook'u üzerinden renk tokenlarına bağlıdır — theme switch anında tüm arayüz güncellenir.

### API Katmanı

Merkezi `apiClient` (Axios):
- JWT token her isteğe otomatik eklenir (`request interceptor`)
- 401 → token refresh denenir, başarısızsa logout
- Response envelope unwrap: `{ success, data, message }` → `data` döner
- Dev ortamında rate limit: 1000 istek/IP (prod: 100)

### TanStack Query

Tüm server state TanStack Query ile yönetilir:
- `staleTime`, `gcTime` optimize edilmiş
- Ekran focus'unda otomatik invalidation (`useFocusEffect`)
- Çalışan hizmet ekle/çıkar → müşteri taraf cache anlık invalidate edilir

### Yetkilendirme

Backend'de `requireOwnerOverEmployee` middleware: owner yalnızca kendi işletmesine ait çalışanlara müdahale edebilir.

---

## 8. Çalışan Kayıt Akışı (Uçtan Uca)

```
1. Kayıt ekranında "Çalışan" seçilir
2. 6 haneli joinCode girilir
3. POST /auth/verify-join-code → işletme adı doğrulanır, ekranda gösterilir
4. Ad, email, şifre doldurulur
5. POST /auth/register-employee → User(EMPLOYEE) + Employee(PENDING) oluşur
6. EmployeePendingScreen gösterilir
7. Owner dashboard'unda "Bekleyen Çalışanlar" listesinde görünür
8. Owner "Onayla" → Employee.status = ACTIVE
9. Çalışan tekrar login → EmployeeTabs'e yönlendirilir
```

**Alternatif akış (uygulama içinden):** Çalışan, EmployeeProfileScreen'deki Workplace kartına joinCode girerek de işletmeye katılabilir.

---

## 9. Demo Sunum Sırası (Önerilen)

### Bölüm 1 — Müşteri Deneyimi
1. Kayıt → HomeScreen
2. SearchScreen + harita açma, pin'e basma → BusinessDetail
3. Randevu al (hizmet seç → çalışan seç → tarih/saat → onayla)
4. AppointmentsScreen'de randevuyu gör

### Bölüm 2 — Çalışan Akışı
1. Yeni çalışan kaydı (joinCode ile)
2. EmployeePendingScreen göster
3. Owner'dan onay ver → tekrar login → EmployeeTabs
4. Dashboard'da randevuyu gör → Başlat → Tamamla
5. Services: hizmet ekle/çıkar
6. Schedule: çalışma saatlerini ayarla

### Bölüm 3 — Owner Dashboard
1. Dashboard: grafik (Day/Month/Year filtrele), stat grid, gelir, çalışan performans
2. Requests: randevu onayla
3. Employees: bekleyen başvuru onayla
4. Services: yeni hizmet ekle
5. OwnerProfile: joinCode göster/kopyala, toggle'lar

---

## 10. Çalıştırma

```bash
# Tüm sistem
cd /Users/taylandeveci/BookIt/olddemo
npm run demo:full

# Ayrı ayrı
npm run dev:backend   # Backend :3000
npm run dev:expo      # Expo :8081
```

**Backend ortam değişkenleri:** `/Users/taylandeveci/BookIT-backend/.env`  
**Veritabanı:** PostgreSQL (Supabase)  
**Seed verisi:** Mevcut demo verisine dokunmayın

---

## 11. Teknik Borçlar (Kalan)

| Öncelik | Konu |
|---|---|
| Orta | Zod/Joi ile backend request body validation |
| Orta | Employee calendar'da randevu detay modalı |
| Düşük | Pagination (limit/offset) — reservations, businesses |
| Düşük | Axios retry (timeout/bağlantı kopması) |
| Düşük | Push notification entegrasyonu (Expo Notifications altyapısı hazır) |
