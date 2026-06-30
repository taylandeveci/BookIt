# BookIT — Veritabanı Soru-Cevap Dosyası

> Sunum için hazırlanmıştır. Veritabanı ile ilgili gelebilecek her türlü soruyu (teknik,
> tasarım kararı, normalizasyon, performans, güvenlik) kapsar. Kodu değiştirilmemiştir.

---

## 1. Temel Bilgiler — Hızlı Cevaplar

**S: Hangi veritabanı kullanıyorsunuz?**
> **PostgreSQL 16**. Açık kaynak, production-grade ilişkisel veritabanı.

**S: Veritabanı nerede çalışıyor?**
> **Docker container** — `bookit-postgres` adında, `postgres:16-alpine` image'ı. `docker-compose.yml` ile başlatılıyor. `localhost:5432`, veritabanı adı `bookit`, kullanıcı/şifre `bookit/bookit` (demo ortamı).

**S: Backend veritabanına nasıl bağlanıyor?**
> `.env` dosyasındaki `DATABASE_URL=postgresql://bookit:bookit@localhost:5432/bookit?schema=public` bağlantı string'i. Bu string, **Prisma** ORM'e verilir; Prisma bağlantı havuzunu (connection pool) ve tüm sorguları yönetir.

**S: Neden PostgreSQL? MySQL veya başka bir şey değil mi?**
> - PostgreSQL, `String[]` (dizi) alanlarını, `Decimal` hassasiyetini ve gelişmiş constraint'leri (örn. exclusion constraint - V2 planı) natively destekliyor.
> - `TEXT`, `UUID`, `Decimal(10,7)` gibi tipler için MySQL'den daha expressive.
> - Docker ile platform bağımsız kolayca çalıştırılıyor.
> - ORM olarak Prisma'nın en olgun desteği PostgreSQL için.

---

## 2. ORM — Prisma

**S: ORM nedir, neden ORM kullandınız?**
> ORM (Object-Relational Mapper) — veritabanı tablolarını kod nesnelerine eşler, ham SQL yazmak yerine tip-güvenli metot çağrıları ile veri okunup yazılır. Prisma, `schema.prisma` dosyasından hem **TypeScript tiplerini** hem de **migration SQL**'ini otomatik üretiyor. Avantajları:
> - Tip güvenliği — yanlış alan adı, derleme hatasında yakalanıyor (runtime'da değil).
> - N+1 sorgularını `include` ile kontrol edebiliyoruz.
> - Migration geçmişi otomatik izleniyor.

**S: Prisma nasıl çalışıyor? Akış nedir?**
> 1. `prisma/schema.prisma` dosyasında modeller tanımlanır (tablo, alan, tip, ilişki, index).
> 2. `npx prisma migrate dev` → Prisma farkı hesaplar, `prisma/migrations/` altına SQL dosyası yazar ve veritabanına uygular.
> 3. `npx prisma generate` → `@prisma/client` paketi yeniden üretilir; tüm modeller için TypeScript tipleri hazır olur.
> 4. Backend kodunda `new PrismaClient()` ile bağlanılır, `prisma.user.findMany(...)` gibi çağrılar yapılır.

**S: Migration dosyaları ne işe yarıyor?**
> Her `prisma migrate dev` çalıştırmasında üretilen, **sıralı ve geri alınamaz** SQL değişiklik dosyalarıdır. `prisma/migrations/` klasöründe zaman damgalı klasörler halinde saklanıyorlar:
> ```
> 20260103131854_init                       ← ilk schema
> 20260106164717_refactor_to_erd_schema     ← ERD tabanlı yeniden yapılandırma
> 20260405000000_add_employee_role          ← EMPLOYEE rolü eklendi
> 20260411190556_add_user_avatar_url
> 20260411191552_add_business_media
> 20260423192102_add_booking_rules          ← iptal penceresi, TTL
> 20260423231647_add_no_show_disputed_arrival_fields
> 20260427154922_add_employee_service_overrides
> 20260520203045_add_start_code_to_reservation
> 20260525125734_add_business_tags
> 20260615161940_employee_unassigned_status_nullable_business
> ```
> Veritabanı şu anda **11 migration'lık** bir geçmişe sahip — projenin evrimini adım adım izlemek mümkün.

**S: Raw SQL hiç yazmıyor musunuz?**
> Neredeyse hiç. Tüm sorgular Prisma Client üzerinden. Tek istisna: availability engine'daki basit `Date` aritmetiği JavaScript'te yapılıyor (cursor + durationMin * 60000). Aggregation (averageRating, reviewCount) da Prisma üzerinden `_avg` / `count` yerine `UPDATE ... SET` ile manuel güncelleniyor — bu bir basitleştirme.

---

## 3. Tablo Yapıları ve Tasarım Kararları

### Tablo özeti

| Tablo (@@map) | Satır sayısı (demo seed) | Açıklama |
|---|---|---|
| `users` | ~25 | Müşteri + çalışan + owner, hepsi burada |
| `businesses` | ~9 | Her owner'ın bir işletmesi |
| `employees` | ~18 | Çalışanlar, işletmeye bağlı |
| `services` | ~45+ | İşletmelerin sunduğu hizmetler |
| `employee_services` | ~30+ | Çalışan-hizmet eşleştirme (override ile) |
| `employee_schedules` | ~80+ | Haftalık çalışma saatleri (7 gün × çalışan) |
| `reservations` | ~15+ | Randevular |
| `business_media` | değişken | Galeri fotoğrafları |
| `reviews` | ~5+ | Yorumlar |
| `notifications` | dinamik | Bildirimler |

---

**S: Neden tek bir `users` tablosu var? Customer, employee, owner ayrı tablolar neden değil?**
> "Single table inheritance" mantığı — üç rolün ortak alanları (email, şifre, ad, telefon, avatar) çok fazla. Ayrı tablolar olsaydı:
> - Login endpoint'i hangi tabloya bakacağını bilmek için ekstra mantığa ihtiyaç duyardı.
> - JWT token'ında `userId` dışında her role özel FK saklamak gerekirdi.
> - Ortak alanlar (örn. `avatarUrl`) üç yerde tekrar ederdi.
> 
> Bunun yerine: `User.role` enum alanı rolü belirliyor, role özgü ek veriler ayrı tablolarda (`Employee`, `Business`) tutulup `User.id`'ye bağlanıyor.

---

**S: `Business` tablosundaki `tags String[]` nedir? Dizi tipini doğrudan kolonda saklamak doğru mu?**
> `tags` alanı PostgreSQL'in native `text[]` tipini (Prisma `String[]`) kullanıyor — örn. `['Kuaför', 'Spa', 'Erkek Bakımı']`.
> 
> **Tradeoff:**
> - **Avantaj**: Ekstra `business_tags` join tablosu olmadan basit bir alan olarak okunup yazılıyor; etiket listesi her zaman küçük (20 öğeden fazla olamıyor — backend `ALLOWED_BUSINESS_TAGS` ile validate ediyor).
> - **Dezavantaj**: "Bu etiketi kullanan kaç işletme var?" gibi aggregate sorgular için `unnest(tags)` gerekir (Prisma'da doğrudan yok); join tablosu bu tür sorgular için daha normalize olurdu.
> - V1'de etiketler sadece "var mı / yok mu" filtrelemesi için — basit dizi yeterli.

---

**S: `Employee.userId` neden nullable (`String?`)?**
> Çalışan, işletmeye kayıt isteğinde bulunduğunda (`POST /auth/register-employee`) `Employee` satırı hemen oluşuyor — ama `status=PENDING`. Owner onaylamadan önce bu çalışanın gerçekten sisteme girip girmeyeceği belirsiz. Onay geldiğinde `userId` dolu, `status=ACTIVE`. Reddedilirse `Employee` satırı kalıyor ama `userId` dolu, `status=REJECTED`. Bu sayede owner geçmiş başvuruları görebiliyor.

---

**S: `EmployeeService` tablosu ne işe yarıyor? Neden hem `Employee` hem `Service`'de bir ilişki yeterli değil?**
> Bu tablo **iki sorunu aynı anda çözüyor**:
> 1. **Hangi çalışan hangi hizmeti verebilir?** — `employeeId + serviceId` kombinasyonu (`@@unique([employeeId, serviceId])`) hangi çalışanın hangi hizmeti sunduğunu modelliyor.
> 2. **Kişisel override** — `durationOverride` ve `priceOverride` alanları, çalışanın o hizmet için işletmenin temel süre/fiyatını **geçersiz kılmasına** izin veriyor. Örn. Selin saç kesimini 45dk'da yaparken Büşra 30dk'da yapıyorsa — tek `Service` kaydı var ama iki farklı `EmployeeService` satırı farklı `durationOverride` değerleriyle.

---

**S: `EmployeeSchedule` nasıl modellenmiş? Neden `DateTime` aralığı değil `dayOfWeek + startTime` string'i?**
> `EmployeeSchedule`, haftalık **tekrarlayan** programı modelliyor. "Her Pazartesi 09:00–18:00" gibi bir kural. Bunu `DateTime` aralığı ile modellemek (her hafta için ayrı satır) gereksiz veri patlamasına yol açardı.
> - `dayOfWeek: Int` → 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
> - `startTime: String` / `endTime: String` → `"09:00"` / `"18:00"` formatı
> - `@@unique([employeeId, dayOfWeek])` → bir çalışanın bir günde sadece bir programı olabilir.
> 
> Randevu hesaplamasında: isteğin tarihi alınır → `.getDay()` ile `dayOfWeek` elde edilir → o güne ait `EmployeeSchedule` sorgulanır. Varsa çalışıyor, yoksa o gün slot üretilmez.

---

**S: `Reservation` tablosunda hem `endTime` hem `actualStartTime`/`actualEndTime` var. Neden?**
> Dört zaman damgası farklı anlam taşıyor:
>
> | Alan | Açıklama |
> |---|---|
> | `startTime` | Randevunun **planlanan** başlangıcı |
> | `endTime` | `startTime + durationMin` — **planlanan** bitiş |
> | `actualStartTime` | Çalışanın "Başlat" dediği **gerçek** an |
> | `actualEndTime` | Çalışanın "Tamamla" dediği **gerçek** an |
>
> Bu ayrımın iki pratik sonucu var:
> 1. **Erken tamamlama**: `actualEndTime < endTime` ise, müsaitlik sorgusunda meşgul aralık `actualEndTime ?? endTime` olarak kullanılıyor (COALESCE). Yani hizmet erken bitince slot **otomatik serbest** kalıyor.
> 2. **Gecikme takibi**: Planlanan vs. gerçekleşen süreyi karşılaştırarak işletmeye analitik veri sağlanabilir (V2 özelliği).

---

### 4. Primary Key — UUID Tercihi

**S: Neden `id` için UUID kullanıyorsunuz? Otomatik artan integer daha basit değil mi?**
> UUID (`@default(uuid())`), Prisma'nın `uuid()` fonksiyonu ile üretiliyor.
> - **Tahmin edilemezlik**: `id=1, 2, 3` olan integer ID'ler, bir kullanıcı `GET /businesses/3` denerken "3'ten başka ne ID'ler var?" diye sistemi tarayabilir (sequential enumeration). UUID'de bu tahmin pratikte imkânsız.
> - **Dağıtık ortam uyumu**: İleride birden fazla sunucu / shard olsa da UUID çakışmadan kullanılabilir.
> - **Dezavantaj**: UUID'ler 36 karakter string — storage ve index boyutu integer'dan büyük. Demo ölçeğinde fark ihmal edilebilir.

---

## 5. İlişkiler (Foreign Key / Relations)

**S: Cascade delete nedir, projede nerede kullanıyorsunuz?**
> Bir üst kayıt silindiğinde bağlı alt kayıtların **otomatik silinmesi**. `onDelete: Cascade` ile tanımlanmış ilişkiler:
>
> | Silinen | Otomatik silinen |
> |---|---|
> | `User` | `Employee`, `Reservation`, `Review`, `Notification`, `Business` |
> | `Business` | `Employee`, `Service`, `Reservation`, `Review`, `BusinessMedia` |
> | `Employee` | `EmployeeService`, `EmployeeSchedule`, `Reservation` |
> | `Service` | `EmployeeService`, `Reservation` |
> | `Reservation` | `Review`, `Notification` |
>
> **Dikkat**: Bir çalışanı silerseniz, o çalışanın randevuları da silinir. Bu yüzden demo'da `isActive=false` ile **soft deactivation** tercih ediliyor — veri kaybı yaşanmıyor.

**S: `Business` ve `User` arasında neden `@unique` var `ownerId`'de?**
> Bir kullanıcı en fazla bir işletmenin sahibi olabilir (V1 kısıtı). `@unique` bu kuralı **veritabanı seviyesinde** zorluyor — uygulama katmanında kontrol etmek yetmiyor, DB constraint her zaman son güvencedir.

**S: `Review.reservationId` neden `@unique`?**
> Bir randevuya sadece **bir yorum** bırakılabilir. `@unique` bu kısıtı veritabanı düzeyinde garantiliyor — uygulama mantığında da kontrol var ama DB constraint ikinci savunma hattı.

---

## 6. Index'ler

**S: Hangi alanlarda index var, neden?**

| Index | Tablo | Sebep |
|---|---|---|
| `email` | `users` | Login sorgusunda her seferinde email ile `WHERE email = ?` yapılıyor — index olmazsa full table scan |
| `businessId` | `employees`, `services`, `reservations`, `reviews`, `business_media` | "Bu işletmenin çalışanları/hizmetleri/randevuları" sorguları çok sık yapılıyor |
| `employeeId` | `employee_services`, `employee_schedules`, `reservations` | Çalışana özel slot hesaplama sorgusunda `WHERE employeeId = ?` |
| `serviceId` | `employee_services` | Bir hizmeti hangi çalışanlar veriyor? |
| `customerId` | `reservations` | "Müşterinin kendi randevuları" listesi |
| `startTime` | `reservations` | Slot hesaplamada tarih aralığı sorgusu (`WHERE startTime >= dayStart AND startTime <= dayEnd`) |
| `status` | `reservations`, `employees`, `services`, `reviews` | Durum bazlı filtreleme (PENDING randevular, ACTIVE çalışanlar...) |
| `city` | `businesses` | Şehre göre işletme arama |
| `averageRating` | `businesses` | En yüksek puanlı işletmeler sıralaması |
| `isActive` | `employees`, `services` | Aktif çalışan/hizmet filtresi |
| `isRead` | `notifications` | Okunmamış bildirim sayısı |
| `userId` | `notifications` | "Bu kullanıcının bildirimleri" sorgusu |

**S: Index ne zaman zararlı olur?**
> Her `INSERT/UPDATE/DELETE` işleminde index'ler de güncellenmek zorunda — yazma yoğun tablolarda fazla index performansı düşürür. Demo ölçeğinde bu sorun yaşanmıyor.

---

## 7. Unique Constraint'ler — Çift Booking Koruması

**S: İki müşteri aynı çalışanın aynı saatini aynı anda alırsa ne olur?**
> Şemada `Reservation` tablosunda:
> ```prisma
> @@unique([employeeId, startTime])
> ```
> Bu composite unique constraint, aynı çalışanın **aynı başlangıç saatine** iki farklı `PENDING` randevu girişini veritabanı düzeyinde reddeder. İkinci `INSERT` bir unique constraint ihlali fırlatır, backend 500 yerine bunu yakalayıp "slot dolu" hatası döner.
>
> **Önemli sınırlama**: Bu koruma sadece **aynı startTime** için geçerli. Gerçek production sisteminde "çakışan zaman aralığı" koruması için PostgreSQL'in `btree_gist` extension'ı + `EXCLUDE USING gist` constraint gerekir (CLAUDE.md'de belgelenmiş V2 planı). V1 basitleştirmesi olarak yalnızca startTime benzersizliği uygulandı.

**S: `@@unique([employeeId, dayOfWeek])` ne anlama geliyor?**
> `EmployeeSchedule` tablosunda — bir çalışanın bir haftanın aynı gününe sadece **bir** çalışma saati kaydı girebilir. "Pazartesi 09:00–18:00" yazınca ikinci bir "Pazartesi" kaydı reddediliyor. `PUT /employee/schedule` endpoint'i bu nedenle **upsert** kullanıyor (`createOrUpdate`).

**S: `@@unique([employeeId, serviceId])` ne için?**
> `EmployeeService` tablosunda — bir çalışan aynı hizmeti iki kere ekleyemez. Endpoint'te de kontrol var ama DB constraint son güvence.

---

## 8. Normalizasyon

**S: Veritabanınız normalize mi? Hangi normal formdaki?**
> Büyük ölçüde **3. Normal Form (3NF)**:
> - **1NF**: Her hücre atomic değer taşıyor. `tags String[]` istisna — teknoloji kısıtı değil, bilinçli karar (bkz. bölüm 3).
> - **2NF**: Composite key kullanılan tablolarda (`EmployeeService`, `EmployeeSchedule`) her alan tam composite key'e bağlı, parçaya değil.
> - **3NF**: `Business.averageRating` teknik olarak `Review` tablosundan hesaplanabilir — bu **denormalizasyon**. Bilinçli tercih (açıklaması aşağıda).

**S: `Business.averageRating` ve `reviewCount` neden ayrı sütunda saklanıyor? Her seferinde `AVG()` hesaplansaydı olmaz mıydı?**
> Her işletme listesi isteğinde (`GET /businesses`) onlarca işletme için `AVG(rating) GROUP BY businessId` çalıştırmak pahalı — özellikle review sayısı arttıkça. Bunun yerine her yeni yorum yazılışında `averageRating` ve `reviewCount` güncelleniyor (`UPDATE businesses SET average_rating=..., review_count=...`). Bu bir **okuma-yazma tradeoff'u**: yorum eklemek biraz daha pahalı ama liste sorgusu çok daha hızlı. Bu pattern "pre-aggregated counter" / "denormalized cache" olarak adlandırılır.

**S: `Reservation.cancellationReason` ve `rejectionReason` neden ayrı sütunlar?**
> Anlam bakımından farklı: `cancellationReason` müşteri veya sistem tarafından iptal gerekçesi (`auto_expired_pending`, `auto_expired_pending` vb.), `rejectionReason` ise işletme/çalışanın reddetme gerekçesi. İkisi aynı anda dolu olamaz. Tek `reason` sütunu yapılabilirdi ama iki sütun hangi tarafın ne gerekçesiyle hareket ettiğini netleştiriyor.

---

## 9. Enum Kullanımı

**S: Enum nedir, neden string yerine enum kullandınız?**
> Enum, bir sütunun alabileceği değerlerin sabit listesini veritabanı seviyesinde tanımlar. Örn. `ReservationStatus` enum'u olmadan "PENDING" yerine "pnding" veya "bekliyor" yazılabilir — veri bütünlüğü bozulur. Enum ile:
> - **Yanlış değer girilemez** — DB ihlal fırlatır.
> - **Prisma TypeScript tiplerinde** de enum olarak çıkıyor — IDE'de autocomplete, hatalı değer derleme hatası.
> - **Sorgu açık** — `WHERE status = 'PENDING'` okunabilir.

**S: Kaç tane enum var ve ne için?**

| Enum | Değerler |
|---|---|
| `UserRole` | `USER, EMPLOYEE, OWNER` |
| `ReservationStatus` | `PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW, DISPUTED` |
| `EmployeeStatus` | `PENDING, ACTIVE, REJECTED, UNASSIGNED` |
| `ReviewStatus` | `PENDING, APPROVED, REJECTED` |
| `BusinessStatus` | `PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE` |

**S: `EmployeeStatus.UNASSIGNED` ne zaman oluşuyor?**
> Bir çalışan işletmeden ayrıldığında (`DELETE /employee/leave-business`). Bu durumda `businessId` null yapılıp status `UNASSIGNED` olarak işaretleniyor — kullanıcı hesabı silinmiyor, sadece işletme bağlantısı kopuyor. Başka bir işletmeye yeni `joinCode` ile bağlanabilir.

---

## 10. Güvenlik

**S: Şifreler veritabanında nasıl saklanıyor?**
> `bcryptjs` ile **hash**'lenip `passwordHash` sütununa kaydediliyor. `bcrypt.hash(password, 10)` — 10 salt round. Veritabanı ele geçirilse bile plaintext şifre görülemiyor. Login'de `bcrypt.compare(girenŞifre, kayıtlıHash)` ile doğrulama yapılıyor.

**S: JWT ve veritabanı arasındaki ilişki nedir?**
> JWT, `userId` ve `role` taşıyor. Her istek geldiğinde backend JWT'yi doğrular ve `req.user.userId` ile ownership kontrolü için veritabanına `findUnique` sorgusu atar — "bu kayıt gerçekten bu user'a mı ait?". JWT tek başına yeterli değil, DB seviyesinde nesne yetkilendirmesi (BOLA koruması) de yapılıyor.

**S: SQL Injection riski var mı?**
> Hayır — Prisma, tüm değerleri **parametrize sorgular** ile geçiriyor; ham string concatenation kullanılmıyor. Örn. `prisma.user.findUnique({ where: { email: req.body.email } })` → Prisma bunu `SELECT ... WHERE email = $1` ile çalıştırıyor, `$1` parametresi ayrıca bind ediliyor.

---

## 11. Veri Tipi Kararları

**S: `price` için neden `Decimal` kullandınız? `Float` olmaz mıydı?**
> `Float` (IEEE 754 kayan noktalı) para hesaplarında ondalık hataya yol açar — `0.1 + 0.2 = 0.30000000000000004` gibi. `Decimal(10, 2)` ile `toplam_digit=10`, `ondalık=2` kesin hassasiyet sağlanıyor. Para hesaplarında `Decimal` kullanmak standart pratik.

**S: `locationLat` ve `locationLng` neden `Decimal(10, 7)`?**
> GPS koordinatları 7 ondalık basamak hassasiyeti ile ~1cm doğruluğa ulaşır. `Decimal(10, 7)` → toplam 10 rakam, 7'si ondalık. `Float` yeterli hassasiyette saklamaz ve koordinat karşılaştırmalarında hata riski olur.

**S: `startTime`/`endTime` neden `String` değil `DateTime`?**
> `EmployeeSchedule`'daki `startTime`/`endTime` ("09:00") string, çünkü **zamana değil, günün bir dilimine** atıfta bulunuyor — tarihten bağımsız tekrarlayan kural. `Reservation`'daki `startTime`/`endTime` ise kesin bir anı gösterdiğinden `DateTime`.

---

## 12. Soft Delete vs Hard Delete

**S: Bir çalışan veya hizmet silindiğinde veri gerçekten siliniyor mu?**
> İki yaklaşım birlikte kullanılıyor:
> - **`isActive` flag (soft delete)**: `Employee.isActive`, `Service.isActive` — satır silinmiyor, `false` yapılıyor. Geçmiş randevular hâlâ geçerli, referans bütünlüğü korunuyor.
> - **Hard delete**: `DELETE /owner/employees/:id` endpoint'i gerçek satır silme yapıyor — bu durumda `onDelete: Cascade` ile bağlı veriler de siliniyor. Demo ölçeğinde ve henüz aktif randevusu olmayan çalışanlar için tercih ediliyor.
>
> Production'da kritik varlıklar için genellikle sadece soft delete yapılır — geçmiş muhasebe/randevu kayıtları integrity bozulmasın diye.

---

## 13. Otomatik İşlemler (Arka Plan)

**S: Veritabanında cron job veya trigger var mı?**
> PostgreSQL trigger yok. Otomatik işlemler **uygulama katmanında**, ilgili endpoint'lere her istek geldiğinde tetiklenen hafif fonksiyonlar olarak implement edilmiş:
>
> 1. **`markExpiredNoShows()`** — `APPROVED` durumda ve `endTime + 15dk` geçmiş, varış onayı olmayan randevuları `NO_SHOW` yapıyor.
> 2. **`expirePastPendingBookings()`** — Başlangıç saati geçmiş ama hâlâ `PENDING` olan randevuları `CANCELLED` yapıyor.
> 3. **`expireStalePendingBookings()`** — İşletmenin `pendingBookingTTLHours` süresini aşmış `PENDING` randevuları `CANCELLED` yapıyor (sunucu başlangıcında da çalışıyor).
>
> Bu tasarımın avantajı: ayrı bir cron sunucusuna ihtiyaç yok. Dezavantajı: hiç istek gelmezse o an için çalışmaz — cron/worker tabanlı çözüm V2 planında.

---

## 14. ER Diyagramı — Sözlü Anlatım

```
users ──────────────────────────────────────────┐
  │ (role=OWNER) 1────────────────────── 1 businesses
  │ (role=EMPLOYEE) 1─────────────────── 1 employees (userId nullable — pending approval)
  │ (role=USER) 1──────────────────────── N reservations (customerId)
  │                                           N reviews (userId)
  │                                           N notifications (userId)

businesses ───── N employees
            ───── N services
            ───── N reservations (businessId)
            ───── N reviews (businessId)
            ───── N business_media

employees ───── N employee_services  ──── 1 services
          ───── N employee_schedules         (+ durationOverride, priceOverride)
          ───── N reservations (employeeId)

reservations ─── 0..1 reviews (1-to-1, reservationId @unique)
             ─── N notifications
```

**Kritik noktalar:**
- `User` ↔ `Business` — `ownerId @unique` → 1—1 (bir owner = bir işletme)
- `User` ↔ `Employee` — `userId @unique` → 1—1 (bir user = bir employee profili) ama `userId` nullable
- `Employee` ↔ `Service` — `EmployeeService` **junction table** üzerinden M—N (çalışan birden fazla hizmet, hizmet birden fazla çalışan; override alanları bu junction'da)
- `Reservation` — dört yabancı anahtar: `customerId`, `businessId`, `employeeId`, `serviceId`
- `Review` ↔ `Reservation` — 1—1 (`reservationId @unique` → bir randevuya bir yorum)

---

## 15. Seed Verisi

**S: Demo verisi nasıl yükleniyor?**
> `prisma/seed.ts` → `npx prisma db seed`. İçerik:
> - 8 işletme (Ankara'da gerçekçi konumlar: Çankaya, Kızılay, vb.)
> - ~17 aktif çalışan
> - Her işletmede 4-6 hizmet
> - Her çalışan için haftalık program (`EmployeeSchedule`, 5-6 gün)
> - Her çalışan için hizmet atamaları (`EmployeeService`)
> - Demo randevular (COMPLETED, PENDING, APPROVED durumlarında)
> - Demo yorumlar ve ortalama puan güncellemeleri
>
> Seed **idempotent** — `upsert` kullanıldığı için tekrar çalıştırılsa da veri çift oluşmuyor.

**S: Seed verisi production'da silinmeli mi?**
> Evet. Seed verisi ve demo şifreleri (`demo1234`, `123456`) sadece geliştirme/demo ortamı içindir. Production'da seed yerine gerçek kayıt akışları çalışır.

---

## 16. Sık Yapılan Hatalar / Bilinen Sınırlamalar

**S: Veritabanında double booking'i %100 önleyen bir yapı var mı?**
> Kısmi koruma var: `@@unique([employeeId, startTime])` aynı `startTime`'da aynı çalışana iki randevuyu engelliyor. Ancak **çakışan zaman aralığı** (örn. 09:00–09:30 ve 09:15–09:45) bu constraint tarafından yakalanmıyor. Gerçek çözüm PostgreSQL `btree_gist` + `EXCLUDE USING gist (employeeId WITH =, tsrange(startTime, endTime) WITH &&)` olurdu — V2 planında, demo kapsamı dışı.

**S: `BusinessStatus` alanı kullanılıyor mu?**
> Tablo var, migration'da da mevcut ama mevcut uygulama arama/listeleme sorgularında `status` filtresi uygulamıyor (tüm işletmeler görünüyor). Platform admin onay akışı için ayrılmış bir alan — V2 özelliği.

**S: Review'lar onay akışından geçiyor mu?**
> `ReviewStatus` enum'u `PENDING/APPROVED/REJECTED` içeriyor ama şu an tüm yorumlar `PENDING` olarak kalıyor — moderasyon endpoint'i implement edilmemiş. `averageRating` tüm yorumları sayıyor, yani spam/fake yorum riski var. Platform moderasyon arayüzü V2 planında.
