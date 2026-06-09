
# CLAUDE.md — Bookit Project Context

Bu dosya Claude Code'un projeyi anlayıp doğrudan kodlamaya geçebilmesi için hazırlanmıştır.
Her yeni oturumda bu dosyayı oku, sonra göreve başla.

---

## Proje Özeti

**Bookit** — güzellik salonları, berberler ve benzeri hizmet işletmeleri için çok kullanıcılı randevu ve rezervasyon platformu.

**Dizin:** `/Users/taylandeveci/BookIt/olddemo`

**Portlar:**
- Backend: `3000` (0.0.0.0 bind, tüm yerel ağdan erişilebilir)
- Frontend: `8081` (Expo)

**Tek komutla ayağa kaldır:** `npm run demo:full`

---

## Tech Stack

| Katman | Teknoloji |c
|---|---|
| Frontend | React Native (Expo) |
| State | Zustand |
| Navigasyon | @react-navigation/native-stack + bottom-tabs |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Veritabanı | PostgreSQL |
| HTTP | Axios (merkezi apiClient, interceptor'lı) |
| API Formatı | Envelope pattern: `{ success: boolean, data: any }` |

---

## Roller ve İş Mantığı

Sistem üç role sahiptir. `Role` enum: `USER`, `EMPLOYEE`, `OWNER`.

### USER — Müşteri
- HomeScreen (öneriler) ve SearchScreen (filtreli arama) ile işletme keşfeder.
- BusinessDetailScreen'den hizmet + çalışan + saat seçerek `Appointment` oluşturur.
- AppointmentsScreen'den randevularını görür, iptal edebilir.
- İşletmelere 1-5 puan ile `Review` bırakabilir.

### EMPLOYEE — Çalışan _(yeni rol)_
- Kayıt akışı: işletmenin 6 haneli `joinCode`'unu girer → `PENDING` olarak sisteme düşer → işletme sahibi onaylar → `ACTIVE` olur.
- Kendi randevularını görür (bugün, sıralı).
- Randevuyu "Başlat" → `actualStartTime` set eder.
- Randevuyu "Tamamla" → `actualEndTime` set eder → slot otomatik serbest kalır.
- Kendi verebileceği hizmetleri (`EmployeeService`) yönetir.
- Haftalık çalışma saatlerini (`EmployeeSchedule`) ayarlar.

### OWNER — İşletme Sahibi
- Kayıt sırasında `Business` entity'si otomatik oluşur (`/auth/register-owner`).
- Dashboard'da gelen `Appointment` isteklerini onaylar / reddeder / tamamlar.
- Çalışanlarını (`Employee` CRUD) ve hizmetlerini (`Service` CRUD) yönetir.
- Bekleyen çalışan başvurularını (`PENDING` Employee) onaylar veya reddeder.
- `joinCode` yönetimi: göster, kopyala, etkinleştir/devre dışı bırak.
- İşletme ayarları: `releaseOnEarlyCompletion` toggle.

---

## Veritabanı Modelleri

### Mevcut + değişenler

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash
  name      String
  role      Role     @default(USER)
  employee  Employee? // EMPLOYEE rolündeyse ilişki
  // ... diğer alanlar
}

enum Role {
  USER
  EMPLOYEE   // yeni
  OWNER
}

model Business {
  id                        String    @id @default(cuid())
  ownerId                   String
  name                      String
  joinCode                  String    @unique  // 6 haneli uppercase alphanumeric
  joinCodeEnabled           Boolean   @default(true)
  releaseOnEarlyCompletion  Boolean   @default(true)
  // ... mevcut alanlar (category, averageRating, vb.)
}

model Employee {
  id             String          @id @default(cuid())
  businessId     String
  userId         String?         @unique  // onay sonrası dolar, PENDING'de null
  name           String
  specialization String?
  status         EmployeeStatus  @default(PENDING)
  business       Business        @relation(...)
  user           User?           @relation(...)
  schedules      EmployeeSchedule[]
  services       EmployeeService[]
  appointments   Appointment[]
}

enum EmployeeStatus {
  PENDING
  ACTIVE
  REJECTED
}

model EmployeeSchedule {
  id         String   @id @default(cuid())
  employeeId String
  dayOfWeek  Int      // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  startTime  String   // "09:00"
  endTime    String   // "18:00"
  employee   Employee @relation(...)
}

model EmployeeService {
  id         String   @id @default(cuid())
  employeeId String
  serviceId  String
  employee   Employee @relation(...)
  service    Service  @relation(...)
  @@unique([employeeId, serviceId])
}

model Appointment {
  id              String    @id @default(cuid())
  userId          String    // müşteri
  businessId      String
  employeeId      String
  serviceId       String
  startTime       DateTime
  endTime         DateTime  // startTime + service.durationMin
  actualStartTime DateTime? // çalışan "Başlat" dediğinde
  actualEndTime   DateTime? // çalışan "Tamamla" dediğinde
  status          AppointmentStatus
  // ...
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS  // yeni: çalışan başlattı
  COMPLETED
  CANCELLED
  REJECTED
}

model Service {
  id          String  @id @default(cuid())
  businessId  String
  name        String
  durationMin Int
  price       Float
  // ...
}
```

---

## API Endpoint'leri

### Auth (mevcut + yeni)
```
POST /auth/register-user
POST /auth/register-owner        → Business otomatik oluşur, joinCode üretilir
POST /auth/register-employee     → YENI: joinCode doğrular, PENDING Employee oluşturur
POST /auth/verify-join-code      → YENI: { code } → { businessId, businessName, isValid }
POST /auth/login
POST /auth/refresh
GET  /auth/me                    → role=EMPLOYEE ise employee{status} include et
POST /auth/logout
```

### Business (genel)
```
GET  /businesses
GET  /businesses/recommended
GET  /businesses/:id
GET  /businesses/:id/employees
GET  /businesses/:id/services
GET  /businesses/:id/reviews
GET  /businesses/:id/timeslots   → DÜZELTILDI: gerçek availability engine (mock değil)
```

### Appointment (müşteri)
```
POST /appointments
GET  /appointments
POST /appointments/:id/cancel
```

### Owner
```
GET  /owner/appointments
POST /owner/appointments/:id/approve
POST /owner/appointments/:id/reject
POST /owner/appointments/:id/complete
GET  /owner/employees
POST /owner/employees
PUT  /owner/employees/:id
DELETE /owner/employees/:id
GET  /owner/services
POST /owner/services
PUT  /owner/services/:id
DELETE /owner/services/:id
GET  /owner/pending-employees    → YENI: PENDING çalışan listesi
PUT  /owner/employees/:id/approve → YENI
PUT  /owner/employees/:id/reject  → YENI
PATCH /owner/business            → YENI: joinCode yönetimi + releaseOnEarlyCompletion
```

### Employee (tümü yeni)
```
GET  /employee/appointments              → Bugünün randevuları, sıralı
POST /employee/appointments/:id/start    → actualStartTime = now, status = IN_PROGRESS
POST /employee/appointments/:id/complete → actualEndTime = now, status = COMPLETED
GET  /employee/services                  → EmployeeService listesi
POST /employee/services/:serviceId       → Hizmet ekle
DELETE /employee/services/:serviceId     → Hizmet çıkar
GET  /employee/schedule                  → EmployeeSchedule (7 gün)
PUT  /employee/schedule                  → Upsert, body: [{dayOfWeek, startTime, endTime}]
```

---

## Availability Engine — Slot Hesaplama Algoritması

`GET /businesses/:id/timeslots?employeeId=&date=YYYY-MM-DD&serviceDuration=30`

```typescript
// Sözde kod — tam implementasyon için bunu takip et
async function getAvailableSlots(employeeId, date, serviceDurationMin) {
  // 1. O gün çalışıyor mu?
  const dayOfWeek = new Date(date).getDay()
  const schedule = await prisma.employeeSchedule.findFirst({
    where: { employeeId, dayOfWeek }
  })
  if (!schedule) return []

  // 2. Tüm potansiyel slotları üret (workStart → workEnd, serviceDuration adımlarla)
  const slots = generateSlots(schedule.startTime, schedule.endTime, serviceDurationMin)

  // 3. O gün o çalışanın CONFIRMED + PENDING + IN_PROGRESS randevularını çek
  const appointments = await prisma.appointment.findMany({
    where: {
      employeeId,
      startTime: { gte: startOfDay(date), lt: endOfDay(date) },
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
    }
  })

  // 4. Meşgul aralıkları hesapla
  // CRITICAL: actualEndTime varsa onu kullan (erken tamamlama), yoksa endTime
  const busyRanges = appointments.map(apt => ({
    start: apt.startTime,
    end: apt.actualEndTime ?? apt.endTime  // COALESCE mantığı
  }))

  // 5. Çakışma kontrolü
  const available = slots.filter(slotStart => {
    const slotEnd = addMinutes(slotStart, serviceDurationMin)
    return !busyRanges.some(busy =>
      slotStart < busy.end && slotEnd > busy.start  // overlap koşulu
    )
  })

  // 6. Geçmiş slotları filtrele (bugün için)
  const now = new Date()
  return available.filter(slot => slot > now)
}
```

**Kritik kural:** `actualEndTime` set edildiği anda, bir sonraki timeslot sorgusu o çalışanı otomatik müsait gösterir. Ekstra bir "serbest bırak" işlemine gerek yoktur.

---

## Ownership Middleware — Yetki Zinciri

Her backend route'unda cross-business veri erişimini engelle.

```typescript
// Reusable middleware'ler — ayrı dosyada tanımla, tüm owner/employee route'larına ekle

// Owner'ın kendi işletme verilerine erişimi
async function requireBusinessOwnership(req, res, next) {
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId ?? req.body.businessId } })
  if (!business || business.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })
  req.business = business
  next()
}

// Çalışanın kendi verilerine erişimi
async function requireEmployeeOwnership(req, res, next) {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { business: true }
  })
  if (!employee || employee.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })
  req.employee = employee
  next()
}

// Owner'ın çalışan üzerindeki yetkisi
async function requireOwnerOverEmployee(req, res, next) {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { business: true }
  })
  if (!employee || employee.business.ownerId !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' })
  req.employee = employee
  next()
}
```

---

## Frontend Navigasyon Mimarisi

Role-based navigation. Her rolün kendi tab navigator'ı vardır. **Permission leakage olmamalı** — bir rol başka rolün ekranlarına erişememeli.

```
RootNavigator
├── AuthStack (giriş yapılmamışsa)
│   ├── LoginScreen
│   ├── RegisterScreen          ← rol seçimi buraya eklendi
│   ├── RegisterEmployeeScreen  ← YENİ: joinCode adımı
│   └── EmployeePendingScreen   ← YENİ: onay bekleniyor
│
├── CustomerTabs (role === USER)
│   ├── HomeTab
│   ├── SearchTab
│   ├── AppointmentsTab
│   └── ProfileTab
│
├── EmployeeTabs (role === EMPLOYEE && status === ACTIVE)  ← YENİ
│   ├── EmployeeHomeTab         ← bugünkü randevular + başlat/tamamla
│   ├── EmployeeServicesTab     ← hizmet yönetimi
│   ├── EmployeeScheduleTab     ← çalışma saatleri
│   └── EmployeeProfileTab
│
└── OwnerTabs (role === OWNER)
    ├── DashboardTab            ← + pending employee bölümü eklendi
    ├── EmployeesTab
    ├── ServicesTab
    └── OwnerProfileTab
```

**Login sonrası yönlendirme mantığı:**
```typescript
if (user.role === 'EMPLOYEE') {
  if (user.employee?.status === 'PENDING') → EmployeePendingScreen
  if (user.employee?.status === 'REJECTED') → login ekranı + hata mesajı
  if (user.employee?.status === 'ACTIVE') → EmployeeTabs
}
```

---

## UI Kuralları

- **İkon tabanlı UI** — emoji kullanma, Lucide veya benzeri ikon kütüphanesi kullan.
- **Buton renkleri (anlamlı):** Başlat=mavi, Tamamla=yeşil, Reddet=kırmızı, İptal=gri.
- Her tab ekranı **ayrı dosya** olsun. Tek dosyada birden fazla ekran yazma.
- Geçici test dosyası, `console.log` bloğu veya TODO comment bırakma.
- Tüm API çağrıları merkezi `apiClient` üzerinden geçsin, direkt `fetch`/`axios` import etme.

---

## Çalışan Kayıt Akışı (Adım Adım)

```
1. Kullanıcı kayıt ekranında "Çalışan" seçer
2. 6 haneli joinCode girer
3. POST /auth/verify-join-code → işletme adı döner, ekranda gösterilir
4. Formu doldurur (ad, email, şifre, uzmanlık)
5. POST /auth/register-employee → User(EMPLOYEE) + Employee(PENDING) oluşur
6. EmployeePendingScreen gösterilir: "Kaydınız alındı, işletme sahibi onayı bekleniyor."
7. Owner dashboard'unda "Bekleyen Çalışanlar" listesinde görünür
8. Owner "Onayla" → Employee.status = ACTIVE
9. Çalışan tekrar login olur → EmployeeTabs'e yönlendirilir
```

---

## joinCode Üretimi

```typescript
import { randomBytes } from 'crypto'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(6)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}
```

`register-owner` endpoint'inde Business oluşturulurken bu fonksiyonu çağır.

---

## Bilinen Teknik Borçlar (Öncelik Sırasıyla)

1. **[TAMAMLANDI PLANLANDII]** Availability engine mock → gerçek implementasyon
2. **[TAMAMLANDI PLANLANDII]** Owner authorization middleware eksikliği
3. **[ORTA]** Zod/Joi ile request body validation
4. **[DÜŞÜK]** Axios retry mechanism (timeout, bağlantı kopması)
5. **[DÜŞÜK]** Pagination (limit/offset) — appointments, businesses, reviews

---

## Geliştirme Kuralları

- Yeni bir özellik eklemeden önce bu dosyayı oku.
- Scope dışına çıkma: sadece istenen değişikliği yap.
- Migration'ları her schema değişikliğinden sonra çalıştır.
- Seed verisine dokunma.
- Her yeni backend route için ownership kontrolü ekle.
- `any` type kullanma — Prisma'nın ürettiği tipleri kullan.
- Bir adımı bitirmeden sonraki adıma geçme.

---

## Uygulama Planı — Employee Rolü (8 Adım)

Adımlar bağımlılık sırasına göre sıralanmıştır. Bir adım bitmeden sonrakine geçme.

---

### Adım 1 — Prisma Schema

Prisma schema'ya aşağıdaki değişiklikleri uygula:

1. `Role` enum'una `EMPLOYEE` ekle.

2. `Business` modeline ekle:
   - `joinCode: String @unique` (6 haneli, register-owner'da otomatik üretilir)
   - `joinCodeEnabled: Boolean @default(true)`
   - `releaseOnEarlyCompletion: Boolean @default(true)`

3. `Employee` modeline ekle:
   - `userId: String? @unique` (nullable, onay sonrası dolar)
   - `user: User? @relation(fields: [userId], references: [id])`
   - `status: EmployeeStatus @default(PENDING)`
   - `schedules: EmployeeSchedule[]` ilişkisi
   - `services: EmployeeService[]` ilişkisi

4. Yeni enum ekle:
   ```prisma
   enum EmployeeStatus { PENDING ACTIVE REJECTED }
   ```

5. `Appointment` modeline ekle:
   - `actualStartTime: DateTime?`
   - `actualEndTime: DateTime?`

6. `AppointmentStatus` enum'una `IN_PROGRESS` ekle.

7. Yeni model: `EmployeeSchedule`
   - `id, employeeId, dayOfWeek (Int 0-6), startTime (String "HH:MM"), endTime (String "HH:MM")`
   - `employee Employee @relation(fields: [employeeId], references: [id])`

8. Yeni model: `EmployeeService`
   - `id, employeeId, serviceId`
   - `@@unique([employeeId, serviceId])`

Migration oluştur ve çalıştır. Seed verisine dokunma.

---

### Adım 2 — Backend: Kayıt Akışı

1. `generateJoinCode()` fonksiyonu yaz (crypto.randomBytes, 6 haneli uppercase alphanumeric). `register-owner` endpoint'inde Business oluşturulurken çağır.

2. Yeni endpoint: `POST /auth/verify-join-code`
   - Body: `{ code: string }`
   - joinCode ile Business bul, `joinCodeEnabled` kontrol et.
   - Dön: `{ businessId, businessName, isValid }`
   - Bulunamazsa 404, enabled değilse 403.

3. Yeni endpoint: `POST /auth/register-employee`
   - Body: `{ name, email, password, joinCode, specialization? }`
   - joinCode doğrula → User oluştur (role: EMPLOYEE) → Employee oluştur (status: PENDING, userId dolu).
   - Standart auth response dön (token dahil).

4. `GET /auth/me` endpoint'ine: `role === EMPLOYEE` ise `employee { status }` include et.

---

### Adım 3 — Backend: Owner Çalışan Onay Endpoint'leri

Şu middleware'i `src/middlewares/ownership.ts` dosyasında tanımla, tüm ilgili route'lara ekle:

```typescript
async function requireOwnerOverEmployee(req, res, next) {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { business: true }
  })
  if (!employee || employee.business.ownerId !== req.user.id)
    return res.status(403).json({ success: false, message: 'Forbidden' })
  req.employee = employee
  next()
}
```

Endpoint'ler:

- `GET /owner/pending-employees` → bu owner'ın işletmesine ait `PENDING` Employee listesi (id, name, specialization, createdAt, user.email)
- `PUT /owner/employees/:id/approve` → status = ACTIVE
- `PUT /owner/employees/:id/reject` → status = REJECTED
- `PATCH /owner/business` → sadece `joinCodeEnabled` ve `releaseOnEarlyCompletion` günceller

Mevcut `/owner/employees` CRUD'una da `requireOwnerOverEmployee` middleware'ini ekle.

---

### Adım 4 — Backend: Availability Engine

`GET /businesses/:id/timeslots?employeeId=&date=YYYY-MM-DD&serviceDuration=30` endpoint'ini mock'tan gerçek implementasyona çevir.

Algoritma:

```
1. EmployeeSchedule'dan dayOfWeek kontrolü yap → yoksa [] dön.
2. workStart..workEnd arasında serviceDuration adımlı slot listesi üret.
3. O gün PENDING + CONFIRMED + IN_PROGRESS appointment'ları tek sorguda çek.
4. Her appointment için meşgul aralık:
     busyStart = startTime
     busyEnd   = actualEndTime ?? endTime   ← COALESCE, kritik satır
5. Her slot için overlap kontrolü:
     slotStart < busyEnd && slotEnd > busyStart → meşgul
6. Bugün için geçmiş slotları filtrele (slot < now).
7. Dön: { slots: string[] }  (ISO string array)
```

Prisma sorgusu N+1 yaratmamalı — appointment'ları tek sorguda çek.

---

### Adım 5 — Backend: Employee Endpoint'leri

Yeni route grubu: `/employee` — middleware: `requireAuth` + `requireRole('EMPLOYEE')`

Her endpoint başında aktif çalışan kontrolü:
```typescript
const employee = await prisma.employee.findUnique({ where: { userId: req.user.id } })
if (!employee || employee.status !== 'ACTIVE') return res.status(403).json(...)
```

Endpoint'ler:

- `GET /employee/appointments` → bugünün randevuları, startTime ASC, müşteri adı + hizmet include
- `POST /employee/appointments/:id/start` → bu employee'a mı ait kontrol et, `actualStartTime = now`, status = IN_PROGRESS
- `POST /employee/appointments/:id/complete` → `actualEndTime = now`, status = COMPLETED
- `GET /employee/services` → EmployeeService listesi
- `POST /employee/services/:serviceId` → işletmenin bu service'i var mı kontrol et, EmployeeService oluştur (duplicate kontrolü)
- `DELETE /employee/services/:serviceId` → EmployeeService sil
- `GET /employee/schedule` → EmployeeSchedule listesi (7 gün)
- `PUT /employee/schedule` → body: `[{dayOfWeek, startTime, endTime}]`, upsert ile kaydet

---

### Adım 6 — Frontend: Kayıt Ekranı

Mevcut RegisterScreen'i güncelle:

1. Rol seçim adımı ekle: 3 kart → Müşteri / Çalışan / İşletme Sahibi.

2. EMPLOYEE seçilince ek alan gelsin:
   - 6 haneli joinCode input (otomatik uppercase).
   - "Kodu Doğrula" butonu → `POST /auth/verify-join-code`.
   - Başarılıysa: "Kod doğrulandı: [İşletme Adı]" göster.
   - Hatalıysa: field altında inline hata mesajı (toast değil).

3. Kayıt isteği `POST /auth/register-employee` endpoint'ine gitsin.

4. Kayıt sonrası `EmployeePendingScreen` göster: "Kaydınız alındı, işletme sahibi onayı bekleniyor."

5. Login sonrası `/auth/me`'den gelen `employee.status` kontrol et:
   - `PENDING` → EmployeePendingScreen
   - `REJECTED` → login ekranına yönlendir + hata mesajı
   - `ACTIVE` → EmployeeTabs

---

### Adım 7 — Frontend: Employee Tab Navigasyonu

CustomerTabs ve OwnerTabs'a paralel olarak `EmployeeTabs` oluştur. Aynı permission leakage önleme kurallarını uygula. Her ekran ayrı dosyada olsun.

Tab'lar:

**EmployeeHomeTab** — `screens/employee/EmployeeHomeScreen.tsx`
- Bugünkü randevuları listele (sıralı).
- Her kart: müşteri adı, hizmet adı, saat.
- "Başlat" butonu: `actualStartTime` yoksa aktif, mavi ikon.
- "Tamamla" butonu: `actualStartTime` var + `actualEndTime` yoksa aktif, yeşil ikon.
- Butonlara basınca ilgili `/employee/appointments/:id/start|complete` çağır, liste refresh'lensin.

**EmployeeServicesTab** — `screens/employee/EmployeeServicesScreen.tsx`
- İşletmenin tüm hizmetleri listelenir.
- Eklenmiş olanlar işaretli, toggle ile ekle/çıkar.

**EmployeeScheduleTab** — `screens/employee/EmployeeScheduleScreen.tsx`
- 7 gün, her gün için startTime / endTime seçici.
- Kapalı günler toggle ile işaretlenebilir.
- Kaydet butonu → `PUT /employee/schedule`.

**EmployeeProfileTab** — `screens/employee/EmployeeProfileScreen.tsx`
- Ad, email göster. Logout butonu.

---

### Adım 8 — Frontend: Owner Dashboard Güncellemesi

Mevcut Owner dashboard'una minimal dokunuşla şunları ekle:

1. "Bekleyen Çalışanlar" bölümü:
   - `GET /owner/pending-employees` ile liste çek.
   - Her satır: çalışan adı, uzmanlık, kayıt tarihi, Onayla / Reddet butonları.
   - İşlem sonrası liste otomatik yenilensin.

2. Mevcut çalışan listesinde status badge ekle (ACTIVE / PENDING / REJECTED).

3. İşletme Ayarları sayfasına ekle:
   - joinCode göster + kopyala butonu.
   - joinCodeEnabled toggle.
   - releaseOnEarlyCompletion toggle.
   - `PATCH /owner/business` ile kaydet.
