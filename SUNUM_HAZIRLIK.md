# BookIT — Sunum Hazırlık & Teknik Soru-Cevap

> Herkes (Kayra, Mert Can, Taylan) tüm dosyayı okumalı. Genel mimari, veritabanı,
> backend ve UI ortak; rol bazlı bölümler kendi alanınızın detayları için.

---

## 1. Proje Özeti

BookIT, güzellik salonu / berber / spa gibi hizmet işletmeleri için çok rollü randevu platformu. Müşteri, çalışan ve işletme sahibi **tek bir React Native uygulaması** kullanıyor. Giriş yapan kullanıcının JWT'sindeki `role` alanına göre (USER / EMPLOYEE / OWNER) tamamen ayrı bir navigator ağacı mount ediliyor — bir rol diğerinin ekranlarına hiçbir şekilde erişemiyor.

**Ekip dağılımı:** UI birlikte, panel mantığı bölündü. Kayra → Owner paneli, Mert Can → Employee paneli, Taylan → Customer paneli.

---

## 2. Teknoloji Stack'i

### Frontend

React Native + Expo SDK 54, TypeScript. `expo start --go` ile Expo Go üzerinden test ediliyor.

Navigasyon için `@react-navigation/native-stack` ve `@react-navigation/bottom-tabs`. Her rol için ayrı bir `Tab.Navigator` bileşeni var; bunlar bir `Stack.Navigator` içine koşul bazlı ekleniyor — diğer rolün tab'ları o Navigator'a hiç kayıtlı değil.

Server state yönetimi için **TanStack Query (React Query) v5**. Her API kaynağı için `queryKeys.ts`'de sabit bir anahtar dizisi tanımlı (örn. `['bookings', 'customer']`). Bir mutation sonrasında `queryClient.invalidateQueries({ queryKey: ... })` ile ilgili cache'ler geçersiz kılınıp otomatik yeniden fetch tetikleniyor. `staleTime: 30000` — 30 saniye içinde ikinci kez aynı veri istenirse ağa gidilmeden cache'den dönüyor.

Global state için **Zustand**. `useAuthStore` kullanıcı bilgisini ve token'ları bellekte tutuyor. `useNotificationStore` in-app bildirimleri **AsyncStorage** ile cihazda kalıcı hale getiriyor (uygulama kapansa bile bildirimler kaybolmuyor).

HTTP için **Axios**, merkezi `apiClient.ts` üzerinden. İki interceptor var: request interceptor her isteğe `Authorization: Bearer <accessToken>` ekler; response interceptor 401 aldığında `POST /auth/refresh` ile token yeniler, başarılı olursa orijinal isteği yeni token'la tekrar dener, başarısız olursa `logout()` tetikler.

Token'lar **expo-secure-store**'da saklanıyor. Bu iOS Keychain / Android Keystore üzerine kurulu; plain AsyncStorage'dan farklı olarak veriler cihaz şifreleme katmanında korumalı.

Form yönetimi için **react-hook-form + zod**. Validation şemaları zod ile tanımlı, `@hookform/resolvers/zod` ile bağlanıyor.

Harita için **react-native-maps**, takvim için **react-native-calendars**, grafikler için **react-native-gifted-charts**. İkonlar `@expo/vector-icons (Ionicons)` — projede hiçbir yerde emoji kullanılmıyor.

Çoklu dil için **i18next + react-i18next**. `src/localization/locales/en.json` ve `tr.json` — key yapıları birebir aynı olmak zorunda.

### Backend

Node.js + Express + TypeScript. Route'lar modüler: `src/routes/auth.ts`, `businesses.ts`, `appointments.ts`, `owner.ts`, `employee.ts`, `notifications.ts`.

ORM olarak **Prisma** — `schema.prisma` üzerinden hem TypeScript tipleri hem migration SQL üretiliyor. Veritabanı **PostgreSQL 16**, Docker container'da (`bookit-postgres`, `postgres:16-alpine`), `localhost:5432`.

Kimlik doğrulama: **jsonwebtoken** ile access (15dk) + refresh (7gün) token. Şifreleme: **bcryptjs**, 10 salt round.

Güvenlik katmanları: **helmet** (güvenli HTTP başlıkları), **cors** (demo'da `*`, prod'da kısıtlanacak), **express-rate-limit** (15 dakikada production'da 100, geliştirmede 1000 istek). Dosya yükleme: **multer** (profil fotoğrafı, işletme galerisi).

API response formatı **envelope pattern**: her yanıt `{ success: boolean, data: any }` şeklinde `successResponse()` helper'ı ile sarılıyor.

---

## 3. Mimari — Nerede / Nasıl Çalışıyor

```
Expo Go (iPhone/Simülatör)  →  Express API (localhost:3000)  →  PostgreSQL (localhost:5432)
        Axios + Bearer JWT         Prisma Client               Docker container
```

**`npm run demo:full`** tek komutla her şeyi ayağa kaldırıyor:
1. `scripts/set-ip.sh` — Mac'in aktif LAN IP'sini `ifconfig` ile buluyor, `.env` dosyasındaki `EXPO_PUBLIC_API_URL=http://<IP>:3000` olarak güncelliyor. Bu adım olmazsa Expo Go telefonda backend'e ulaşamaz (localhost telefon için loopback'i ifade eder, Mac'in IP'sini değil).
2. `concurrently` ile iki süreç paralel başlıyor: Express sunucusu `0.0.0.0:3000`'de (tüm ağ arayüzlerine bind — aynı Wi-Fi'deki cihazlar erişebilir), Expo Metro bundler `8081`'de.

Backend ayrı bir repo: `/Users/taylandeveci/BookIT-backend`. Frontend: `/Users/taylandeveci/BookIt/olddemo`. İki reponun birbirinden bağımsız versiyon geçmişi var; API değişikliklerinin iki tarafa da yansıtılması gerekiyor.

Sunucu açılışında (`index.ts`) iki background interval başlatılıyor: `expireStalePendingBookings` her 15 dakikada, `markExpiredNoShows` her 5 dakikada çalışıyor. Bunlar Prisma üzerinden direkt UPDATE sorguları atıyor.

---

## 4. Veritabanı

Prisma şemasında 10 model var: `User`, `Business`, `Employee`, `Service`, `EmployeeService`, `EmployeeSchedule`, `Reservation`, `BusinessMedia`, `Review`, `Notification`.

Tüm id'ler `@default(uuid())` — PostgreSQL UUID v4. Sequential integer yerine UUID kullanılmasının nedeni tahmin edilemezlik: `id=1,2,3` olan kaynaklarda biri URL'yi değiştirerek başkasının verisine erişmeye çalışabilir (BOLA — Broken Object Level Authorization). UUID ile bu tahmin pratikte imkânsız.

`Business.averageRating` ve `reviewCount` denormalize edilmiş — her yeni yorum yazılışında bu değerler güncelleniyor. Alternatif `AVG() GROUP BY` sorgusundan hızlı okuma sağlıyor. Bu bilinçli bir normalizasyon-performans tradeoff'u.

`Business.tags` alanı PostgreSQL'in native `text[]` tipi (Prisma'da `String[]`). Ekstra join tablosu yerine doğrudan kolon tercih edildi çünkü etiket listesi küçük (max 20 öğe) ve "bu etiketi kullanan işletmeleri aggregate et" gibi karmaşık sorgular V1 kapsamı dışında.

`Reservation` tablosunda hem `endTime` hem `actualStartTime` / `actualEndTime` var. `endTime = startTime + durationMin` — planlanan bitiş. `actualEndTime` çalışan "Tamamla" dediğinde set ediliyor. Erken tamamlama durumunda `actualEndTime < endTime`, ve müsaitlik sorgusunda meşgul aralık `actualEndTime ?? endTime` olarak alınıyor (COALESCE mantığı) — bu sayede slot ekstra işlem olmadan otomatik serbest kalıyor.

`Employee.userId` nullable: çalışan kayıt isteğinde bulunduğunda `Employee` satırı oluşuyor ama owner onaylamadan `userId` null. Onay gelince dolduruluyor, reddedilirse çalışan satırı kalıyor (başvuru geçmişi korunuyor).

`EmployeeService` junction table: sadece hangi çalışanın hangi hizmeti verdiğini değil, `durationOverride` ve `priceOverride` da taşıyor. Aynı hizmet için farklı çalışanlar farklı süre/fiyat uygulayabiliyor.

`@@unique([employeeId, startTime])` — aynı çalışanın aynı başlangıç saatine iki randevu girişini DB seviyesinde engelliyor. Bu V1'de double booking için tek DB koruması; gerçek "aralık çakışması" koruması (exclusion constraint) V2 planında.

`@@unique([employeeId, dayOfWeek])` — bir çalışanın bir haftanın aynı gününe tek çalışma saati kaydı. `PUT /employee/schedule` bu nedenle upsert kullanıyor.

`@@unique([employeeId, serviceId])` — bir çalışan aynı hizmeti iki kere ekleyemiyor.

`onDelete: Cascade` tüm FK ilişkilerinde aktif: bir `Business` silinince bağlı `Employee`, `Service`, `Reservation`, `Review`, `BusinessMedia` da siliniyor. Bu nedenle geliştirmede çalışan deaktivasyonu için hard delete değil `isActive: false` tercih ediliyor.

Şifre `bcrypt.hash(password, 10)` ile `passwordHash` kolonuna yazılıyor. Veritabanı ele geçirilse bile plaintext görünmüyor. Login'de `bcrypt.compare(girilenŞifre, kayıtlıHash)` karşılaştırması yapılıyor.

Fiyat alanları `Decimal(10, 2)`, koordinatlar `Decimal(10, 7)`. `Float` (IEEE 754) para hesabında `0.1 + 0.2 = 0.30000000000000004` gibi yuvarlama hatalarına yol açar; `Decimal` bu riski ortadan kaldırıyor.

---

## 5. Kimlik Doğrulama ve Roller

Üç kayıt akışı var.

`POST /auth/register-user` → `role: USER`, doğrudan müşteri.

`POST /auth/register-owner` → `role: OWNER`, aynı transaction'da `Business` oluşturuluyor (status: `PENDING`). 6 haneli `joinCode` üretiliyor: `crypto.randomBytes(6)` ile 6 rastgele byte alınıyor, her byte `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` karakterlerinden birine map ediliyor. Sonuç `@unique` kolonunda saklanıyor.

`POST /auth/register-employee` → önce `POST /auth/verify-join-code` ile kod doğrulanıp işletme adı gösterilir. Kayıt sonrası `User(role=EMPLOYEE)` + `Employee(status=PENDING)` oluşuyor. `EmployeePendingScreen` gösteriliyor. Owner onaylar → `status=ACTIVE` → çalışan `EmployeeTabs`'e girebilir.

Login sonrası hem `accessToken` (15dk) hem `refreshToken` (7gün) dönüyor, ikisi de `expo-secure-store`'a yazılıyor. Her istekte request interceptor `accessToken`'ı header'a ekliyor. Token süresi dolunca response interceptor 401 yakalar, `refreshToken` ile `/auth/refresh` çağırır, yeni token'ları `SecureStore`'a yazar, orijinal isteği tekrar dener. `refreshToken` da geçersizse `setLogoutCallback` ile tanımlı `logout()` fonksiyonu tetikleniyor ve kullanıcı login ekranına düşüyor.

Her owner/employee endpoint'inde ownership middleware çalışıyor. `requireOwnerOverEmployee`: parametre ID'sindeki `Employee`'nin `businessId`'sine bakıyor, `business.ownerId !== req.user.id` ise 403. Employee route'larında `getActiveEmployee(userId)`: `Employee` satırını `userId`'ye göre çekiyor, `status !== 'ACTIVE'` veya bulunamazsa 403. Bu kontroller olmadan frontend'de bir butonu gizlemek yeterli olmaz — BOLA saldırısı başka kullanıcının ID'sini tahmin ederek direkt API çağrısıyla veriye erişir.

---

## 6. Navigasyon Mimarisi

`RootNavigator.tsx`'de tek bir `Stack.Navigator` var. Bu navigator, `user === null` ise `AuthStack`'i, `user.role === 'OWNER'` ise `OwnerTabs`'i, `user.role === 'EMPLOYEE'` ise `EmployeeTabs`'i, yoksa `CustomerTabs`'i (USER) mount ediyor. Bu mount koşullu: diğer rollerin `Stack.Screen` kayıtları o durumda hiç render edilmiyor — route ağacında fiziksel olarak yok. `navigate('OwnerDashboard')` gibi bir çağrı customer navigator'ında `no route named OwnerDashboard` hatası verir.

Her rolün kendi tab navigator'ı bağımsız: `UserTab.Navigator`, `EmployeeTab.Navigator`, `OwnerTab.Navigator` ayrı `createBottomTabNavigator()` instance'ları.

Her ekranda `useFocusEffect` hook'u ile ekran odağa geldiğinde `queryClient.invalidateQueries` tetikleniyor. Bu başka bir tab'dan dönünce verinin güncel görünmesini sağlıyor — sürekli polling değil, sadece ekrana geçişte.

---

## 7. State Yönetimi

**Zustand** lightweight bir global state kütüphanesi. Redux gibi action/reducer/dispatch şeması yok; store `create<State>()` ile tanımlanıyor ve setter'lar doğrudan state'i mutate ediyor.

`useAuthStore`: `user`, `isLoading`, `login()`, `logout()` tutuyor. Token'lar Zustand'da değil `expo-secure-store`'da. Login'de her iki token da `SecureStore.setItemAsync` ile yazılıyor, logout'ta siliniyor.

`useNotificationStore`: in-app bildirimleri (randevu onayı, iptal, yeni istek gibi) tutuyor. Her state değişikliğinde `AsyncStorage.setItem` ile serialize edip yazıyor — uygulama kapansa bile bildirimler kaybedilmiyor. `expo-secure-store` şifreli depolama için, `AsyncStorage` ise hassas olmayan veri için uygun (bildirimler şifreleme gerektirmiyor).

**TanStack Query**, `queryKeys.ts`'de merkezi bir anahtar hiyerarşisi kullanıyor. Örneğin `['bookings', 'customer']` anahtarı bir müşterinin tüm randevularını temsil ediyor. Bir randevu iptal edildiğinde sadece `['bookings', 'customer']` değil aynı zamanda `['bookings', 'owner']`, `['bookings', 'employee']` ve zaman slot cache'leri de invalidate ediliyor — çünkü iptal işlemi tüm tarafların görünümünü etkiliyor. Bu "cross-role invalidation" sayesinde farklı ekranlar arasında veri tutarlılığı sağlanıyor.

---

## 8. Müsaitlik (Slot) Hesaplama

`GET /businesses/:id/time-slots?date=YYYY-MM-DD&employeeId=...&serviceId=...`

Slot uzunluğu sabit değil. Önce `EmployeeService` tablosunda `(employeeId, serviceId)` çifti aranıyor; bulunursa `durationOverride ?? service.durationMin` kullanılıyor. Bulunamazsa direkt `Service.durationMin`. Yani aynı "Saç Kesimi" hizmetini bir çalışan 30dk, diğeri 45dk'da yapıyorsa iki çalışanın takviminde farklı uzunlukta slotlar çıkıyor.

Çalışanın o günkü `EmployeeSchedule` kaydı `dayOfWeek` ile sorgulanıyor. Kayıt yoksa boş dizi dönüyor — o gün çalışmıyor.

`workStart`'tan `workEnd`'e kadar `durationMin` adımlarla bir `cursor` ilerliyor. `slotEnd > workEnd` olursa loop kırılıyor (yarım slot üretilmiyor).

O gün o çalışanın `PENDING / APPROVED / IN_PROGRESS` randevuları tek sorguda çekiliyor. Her randevu için meşgul aralık: `{ start: startTime, end: actualEndTime ?? endTime }`. Her aday slot için overlap kontrolü: `slotStart < busyEnd && slotEnd > busyStart` — ikisi de sağlanıyorsa meşgul.

Bugün için `slotStart <= now` olan geçmiş slotlar `available: false` işaretleniyor.

Sonuç `[{ time: "09:30", available: true }, ...]` dizisi dönüyor. Frontend sadece `available: true` olanları seçilebilir gösteriyor — ama bu UX koruması, güvenlik koruması değil.

---

## 9. Randevu Yaşam Döngüsü

```
PENDING → APPROVED → IN_PROGRESS → COMPLETED
PENDING → REJECTED
PENDING → CANCELLED (müşteri iptal / auto_expired_pending / pendingBookingTTL)
APPROVED → CANCELLED (müşteri iptal, cancellationWindow dışındaysa)
APPROVED → NO_SHOW (15dk grace sonrası varış onayı yok)
APPROVED / IN_PROGRESS → DISPUTED (müşteri "geldi", işletme "gelmedi" ya da tersi)
```

**PENDING**: müşteri randevu istedi, onay bekliyor. `pendingBookingTTLHours` süresini aşarsa (varsayılan 24sa) sistem otomatik CANCELLED yapıyor — sunucuda her 15 dakikada çalışan interval bunu yapıyor. Randevu saati geçmiş ama hâlâ PENDING olanlar da `expirePastPendingBookings` ile her slot sorgusunda temizleniyor.

**APPROVED**: onaylandı. Müşteri `cancellationWindowMinutes` içindeyken iptal edemez — backend `(startTime - now) / 60000 <= windowMinutes` kontrolü yapıyor.

**IN_PROGRESS → start-code mekanizması**: çalışan "Başlat" butonuna basınca backend kısa ömürlü bir kod (`startCode` + `startCodeExpiresAt`) üretiyor ve `Reservation`'a yazıyor. Müşteri bu kodu çalışana söylüyor, çalışan uygulamaya giriyor → `POST /employee/appointments/:id/verify-start-code`. Kod doğruysa `actualStartTime = now`, `status = IN_PROGRESS`, `businessArrivalConfirmed = true` set ediliyor.

**NO_SHOW / DISPUTED**: `POST /appointments/:id/confirm-arrival` (müşteri "geldim") ve `verify-start-code` / `no-show` (işletme tarafı) ile iki tarafın yanıtı `arrivalResolution.ts`'de değerlendiriliyor. İkisi "geldi" → normal akış. İkisi "gelmedi" → NO_SHOW. Biri "geldi" biri "gelmedi" → DISPUTED. Sadece biri yanıt vermiş ve 15dk pencere kapanmışsa: "gelmedi" demişse NO_SHOW, "geldi" demişse sistem beklemiyor devam ediyor.

**COMPLETED**: çalışan "Tamamla" → `actualEndTime = now`. Eğer `actualEndTime < endTime` ve `business.releaseOnEarlyCompletion = true` ise, bir sonraki slot sorgusunda bu çalışanın meşgul aralığı `actualEndTime`'a kısaltılıyor — hiçbir ek işlem gerekmeden slot serbest kalıyor.

---

## 10. Bildirimler

Push notification yok. `useBackendNotificationSync` hook'u `GET /notifications` endpoint'ini her 3 saniyede bir sorguluyor (`refetchInterval: 3000`). `refetchIntervalInBackground: false` — ekran focus dışındayken polling durduruluyor, pil/ağ tasarrufu için.

Hook, daha önce işlediği bildirimleri `processedIds` adlı bir `useRef<Set<string>>` ile takip ediyor. Aynı bildirim iki kez işaretlenmiyor. Yeni bildirim gelince `addNotificationFromBackend` ile `notificationStore`'a ekleniyor ve ilgili `queryKey`'ler invalidate ediliyor (örn. `queryKeys.bookings.customerAll`) — yani bildirim görünmesi ile listedeki durum değişimi aynı anda gerçekleşiyor.

Backend tarafında `Notification` tablosunda `isRead: Boolean`, `POST /notifications/:id/read` ile okundu işaretleniyor.

---

## 11. Profanity Filtresi

`src/lib/filterProfanity.ts` — randevu notları ve yorum metinlerini `blockedWords.json` listesine karşı kontrol ediyor.

`MIN_LOOSE_LENGTH = 4` eşiği var: 4 karakterden kısa terimler sadece whole-word match ile kontrol ediliyor (yani "am" blokluysa "açıklama" içinde geçse bile engellemiyor, "am" bağımsız kelime olarak geçerse engelliyor). 4 karakter ve üzeri terimler substring match, separator-stripped match, digit-substitution (leetspeak: 3→e, 0→o vb.) ve regex tabanlı match'lerden geçiyor. Bu threshold olmadan normal Türkçe kelimeler yanlışlıkla engelleniyordu.

---

## 12. Güvenlik Özeti

**SQL Injection yok** — Prisma parametrize sorgular kullanıyor, ham string concatenation yok.

**BOLA koruması** — ownership middleware backend'de her kaynak için "bu kayıt bu kullanıcıya mı ait?" kontrolü yapıyor. Frontend gizleme yeterli değil.

**Rate limiting** — `express-rate-limit`: 15 dakikada production'da 100 istek, dev'de 1000. Global olarak tüm route'lara uygulanıyor.

**Helmet** — `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` gibi güvenli HTTP başlıklarını otomatik ekliyor.

**Token güvenliği** — Access token kısa ömürlü (15dk), refresh token SecureStore'da. 401'de otomatik yenileme, başarısız olursa logout — kullanıcı stale token ile işlem yapamıyor.

**Şifre** — bcrypt 10 round. Rainbow table saldırılarına karşı her kullanıcı için farklı salt üretiliyor.

---

## 13. Owner Paneli (Kayra)

**Ekranlar:** `DashboardScreen` (istatistikler + bekleyen başvuru özeti), `RequestsScreen` (gelen randevular, onayla/reddet/tamamla), `EmployeesScreen` (çalışan CRUD, başvuru onayı), `ServicesScreen` (hizmet CRUD), `OwnerReviewsScreen`, `OwnerProfileScreen` (profil, galeri, etiketler, joinCode, iptal penceresi ayarları).

**joinCode** — `crypto.randomBytes(6)` ile 6 haneli büyük harf+rakam kodu. İşletme kaydında otomatik üretilir. `joinCodeEnabled: false` yapılırsa backend `verify-join-code` isteğine 403 döner — yeni başvuru kabul edilmez.

**Etiketler (tags)** — 20 öğelik sabit preset listeden toggle ile seçim. Serbest metin yok çünkü arama filtreleriyle aynı değer kümesini paylaşıyor — tutarsız tag yazımı arama senkronunu bozar. Backend, gelen `tags` dizisini `ALLOWED_BUSINESS_TAGS` ile doğruluyor; listede olmayan etiket 422 döndürüyor.

**`cancellationWindowMinutes`** — owner seçiyor (30dk / 1sa / 2sa / 24sa). Müşteri bu pencere içinde iptal isteği gönderince backend `(startTime - now) / 60000 <= windowMinutes` kontrolü yapıp 400 döndürüyor.

**`releaseOnEarlyCompletion`** — Boolean toggle. `true` ise erken tamamlanan randevu sonrası slot hesaplamasında `actualEndTime` kullanılıyor, `false` ise her zaman `endTime` (slot hizmet bloğu sonuna kadar meşgul kalıyor).

**`pendingBookingTTLHours`** — varsayılan 24. Sunucu açılışında ve her 15 dakikada çalışan interval, `now - createdAt > ttlMs` olan PENDING randevuları CANCELLED yapıyor.

---

## 14. Employee Paneli (Mert Can)

**Ekranlar:** `EmployeeDashboardScreen` (özet kartlar, bekleyen istekler, bugünkü program), `EmployeeHomeScreen` (günlük liste + başlat/tamamla), `EmployeeCalendarScreen` (takvim + start-code doğrulama), `EmployeeServicesScreen` (hizmet ekle/çıkar + override), `EmployeeScheduleScreen` (haftalık program), `EmployeeProfileScreen` / `EmployeeEditProfileScreen`.

Her employee endpoint'inde `getActiveEmployee(req.user.userId)` ile o kullanıcının `Employee` satırı çekiliyor. `status !== 'ACTIVE'` veya satır yoksa 403. Bu çekilen `employee.id` tüm sorgularda `WHERE employeeId = employee.id` olarak kullanılıyor — başka bir ID parametresi kabul edilmiyor. Başka çalışanın verisine erişim teknik olarak imkânsız.

**Hizmet override**: `PATCH /employee/services/:serviceId` body'sinde `durationOverride`, `priceOverride`, `notes`. Bu değerler `EmployeeService` kaydına yazılıyor. Slot hesaplamada ve müşteri tarafındaki hizmet listesinde (`GET /businesses/:id/services?employeeId=...`) bu override önceliğe alınıyor.

**`EmployeeSchedule`**: `dayOfWeek` (0=Pazar...6=Cumartesi) + `startTime` / `endTime` string ("09:00"). `PUT /employee/schedule` upsert kullanıyor — `@@unique([employeeId, dayOfWeek])` constraint'ten ötürü duplicate kayıt atmak yerine varsa günceller. O gün için kayıt yoksa slot sorgusu boş dizi döndürür.

**Start-code akışı**: "Başlat" → backend 4 haneli rastgele kod üretip `startCode` ve `startCodeExpiresAt` kolonlarına yazıyor → müşteri kodu çalışana söylüyor → çalışan `verify-start-code` endpoint'ine gönderiyor → kod ve süre doğruysa `actualStartTime = now`, `status = IN_PROGRESS`, `businessArrivalConfirmed = true`, `startCode = null`.

---

## 15. Customer Paneli (Taylan)

**Ekranlar:** `HomeScreen` (yakın işletmeler + önerilen), `SearchScreen` (kategori/isim filtreli arama + harita), `BusinessDetailScreen` (galeri + 3 adımlı booking), `AppointmentsScreen` (randevu listesi + iptal), `BusinessReviewsScreen` / `ReviewScreen` (yorumlar), `ProfileScreen` / `EditProfileScreen` / `ChangePasswordScreen`.

**HomeScreen konum akışı**: `expo-location` ile `requestForegroundPermissionsAsync()` çağrılıyor. İzin verilirse `getCurrentPositionAsync()` ile koordinat alınıp işletmeler mesafeye göre sıralanıyor. İzin reddedilirse fallback olarak tüm işletmeler gösteriliyor — boş ekran yerine "konum izni verilmedi" uyarısı çıkıyor.

**3 adımlı booking akışı**: Adım 1 — hizmet seçimi. Adım 2 — çalışan + tarih seçimi; çalışan seçilince `GET /businesses/:id/services?employeeId=...` ile o çalışanın override'lı fiyat/süre çekiliyor ve gösteriliyor. Adım 3 — slot seçimi; `GET /businesses/:id/time-slots?employeeId=...&serviceId=...&date=...` ile müsait slotlar çekiliyor. Onay → `POST /appointments` → `status=PENDING`, işletmeye + çalışana bildirim.

**İptal**: `POST /appointments/:id/cancel`. Backend randevu bulunca `(startTime - now) / 60000 <= windowMinutes` kontrol ediyor. Pencere içindeyse 400. Dışındaysa `status = CANCELLED`, `cancelledAt = now`.

**Yorum**: sadece `COMPLETED`, `DISPUTED`, veya (`NO_SHOW` + `customerArrivalConfirmed = true`) durumundaki randevulara yorum yazılabiliyor. Yorum metni profanity filtresinden geçiyor. Yorum oluşturulunca `Business.averageRating` ve `reviewCount` güncelleniyor.

**`confirm-arrival`**: 15 dakikalık arrival window'da müşteri "geldim" diyebiliyor (`customerArrivalConfirmed = true`). `resolveArrival()` fonksiyonu her iki tarafın yanıtına bakarak durumu belirliyor.

---

## 16. Sık Sorulabilecek Teknik Sorular

**S: React Native ile Swift/native geliştirme arasındaki fark nedir, neden React Native seçtiniz?**
> React Native, JavaScript/TypeScript ile iOS ve Android için aynı koddan native bileşenler üretiyor. Ayrı Swift + Kotlin ekibi yerine tek codebase. Expo, native kod yazmadan kamera/konum/bildirim gibi API'lara erişimi kolaylaştırıyor. Tradeoff: pure native'e göre daha az performans esnekliği ama startup projesi için geliştirme hızı öncelikli.

**S: TanStack Query neden, kendi fetch + useEffect yazılabilirdi?**
> Manuel `useEffect` + `useState` ile loading/error/refetch/cache/stale state'i yönetmek çok boilerplate üretiyor. TanStack Query bunları deklaratif queryKey sistemiyle çözüyor. `invalidateQueries` ile birden fazla bileşenin aynı anda güncellenmesi çok kolay — aksi hâlde prop drilling veya context ile her komponenti haberdar etmek gerekir.

**S: Zustand neden, Redux değil?**
> Redux'ta her feature için action types / action creators / reducer / selector ayrı ayrı yazılıyor. Zustand'da bir `create()` çağrısı yeterli. Küçük-orta ölçekli uygulamada bu overkill tasarrufunun pratik etkisi büyük. Middleware gerekliyse Zustand da destekliyor ama burada ihtiyaç yok.

**S: JWT refresh mekanizması tam olarak nasıl çalışıyor?**
> Axios response interceptor 401 yakalar. `SecureStore`'dan `refreshToken` alır. `/auth/refresh`'e POST atar. 200 dönerse yeni `accessToken` ve `refreshToken` ikisi de `SecureStore`'a yazılır, orijinal başarısız istek yeni `accessToken` ile tekrar gönderilir. Birden fazla eşzamanlı istek 401 alırsa hepsi tek refresh denemesine dahil olur (queue mantığı — `isRefreshing` flag ile kontrol ediliyor).

**S: `useFocusEffect` ne işe yarıyor?**
> React Navigation'ın hook'u. Bir ekran focus aldığında (başka bir tab'dan dönünce veya stack'ten geri gelinince) callback çalışıyor. Burada `queryClient.invalidateQueries` kullanılıyor — ekranda gösterilecek veri her focus'ta tazeniyor. `useEffect` değil çünkü `useEffect` sadece component mount'ta çalışır; aynı tab'ın içinde gezinip geri dönüldüğünde tekrar çalışmaz.

**S: Neden polling, WebSocket değil?**
> WebSocket kalıcı bir bağlantı gerektiriyor — backend'de socket yönetimi, bağlantı kesme/yeniden bağlanma handling, ölçekleme için sticky session veya Redis pub-sub gerekiyor. Demo ölçeğinde 3 saniyelik polling yeterli gecikmeyle aynı sonucu veriyor. Complexity/fayda oranı WebSocket'i bu aşamada gereksiz kılıyor.

**S: `expo-secure-store` ile `AsyncStorage` farkı nedir?**
> `expo-secure-store` iOS Keychain / Android Keystore katmanını kullanıyor — işletim sistemi tarafından şifrelenip korunan alan. `AsyncStorage` ise düz dosya sistemi (şifresiz). Hassas veriler (JWT token) Secure Store'a, hassas olmayan veriler (bildirim listesi) AsyncStorage'a yazılıyor.

**S: `Decimal` tipi neden, `Float` değil?**
> `Float` IEEE 754 kayan noktalı aritmetik kullanıyor: `0.1 + 0.2 !== 0.3`. Para ve koordinat gibi hassas hesaplamalarda bu hata birikir. PostgreSQL `Decimal` (numeric) tipi tam hassasiyetli saklama sağlıyor; `Decimal(10, 2)` ile 10 haneli, 2 ondalıklı kesin değer.

**S: Profanity filtresi nasıl çalışıyor?**
> `blockedWords.json` listesindeki her kelime normalize edilmiş girişe karşı kontrol ediliyor. 4 karakterden kısa kelimeler sadece whole-word match — aksi hâlde "am" blokluyken "açıklama" engelleniyordu. 4 karakter ve üzeri kelimeler substring, separator-stripped, digit-substitution (leetspeak: 3→e vb.) ve regex kontrollerinden geçiyor.

**S: N+1 sorgu problemi nedir, projede nasıl önlendiniz?**
> N+1: bir liste sorgusu çekip her item için ayrı DB sorgusu atmak (1 + N sorgu). Örneğin 10 randevu için 10 ayrı "çalışan adı" sorgusu. Prisma'da `include: { employee: true, service: true }` ile JOIN ile tek sorguda ilişkili veri getiriliyor. Slot hesaplamasında da o günün tüm randevuları tek `findMany` ile çekiliyor, her slot için ayrı sorgu atılmıyor.

**S: API response formatı neden envelope pattern?**
> `{ success: true, data: [...] }` veya `{ success: false, message: "..." }` — frontend HTTP status koduna bakmanın yanı sıra `success` flag'ine de bakabiliyor. Hata mesajları standart bir yerde (`message`) geliyor. `successResponse()` helper'ı tüm route'larda tutarlı format garantiliyor; `serializeDecimalFields()` ile Prisma'nın `Decimal` objeleri JavaScript'e uyumlu formata çevriliyor.

---

## 17. Bilinen Sınırlamalar (sorulursa dürüstçe)

**Double booking** — `@@unique([employeeId, startTime])` sadece aynı startTime'ı engelliyor. Çakışan zaman aralıklarını (örn. 09:00–09:30 ile 09:15–09:45) DB seviyesinde engelleyen exclusion constraint yok. V2 planında PostgreSQL `btree_gist` + `EXCLUDE USING gist` ile çözülecek.

**Push bildirim yok** — 3 saniyelik polling. Farklı cihazlar arası değişiklikler ~3 saniyede görünüyor. WebSocket / FCM push gerektiren real-time V2.

**`BusinessStatus` filtre değil** — alan şemada ve migration'da var ama `GET /businesses` sorgusu buna göre filtrelemiyor. Platform admin onay akışı için rezerve edilmiş, henüz implement edilmemiş.

**Pagination yok** — `/businesses`, `/appointments`, `/reviews` listeleri tüm kayıtları döndürüyor. Veri büyüdükçe performans sorunu yaratır. `limit`/`offset` veya cursor-based pagination V2'de.

**Request validation kısmi** — Zod şema validasyonu bazı endpoint'lerde eksik, sadece `if (!field)` kontrolleri var. Tam validation Zod middleware'i ile yapılacak.
