# PROJECT_CONTEXT.md

Jedini izvor istine za Tradelyt. Svaki naredni chat, agent i linija koda polaze od ovog fajla.

Ako kod, kopija ili šema odstupaju od ovog dokumenta, dokument pobedjuje. Promena pravila ide prvo ovde, pa tek onda u kod. Ne izmišljati ponašanje koje ovde nije zapisano.

Poslednje zaključavanje pravila: 2026-09-23.

---

## 1. Kako se ovaj fajl koristi

Pre bilo kakve izmene pročitati ovaj dokument. Posebno poglavlja koja zadatak dira: brend, V1 granica, šema, poruke, enkripcija, naplata.

Zabranjeno je:

- uvoditi drugu cenu, drugi paket, godišnji plan ili kripto naplatu pre V2
- davati botu pravo da šalje naloge na berzu
- dekriptovati API ključeve u Next.js procesu
- pisati korisnički tekst koji sadrži reč „AI“ ili naziv DisciplineAI
- slati Telegram poruke u grupe ili kanale
- brojati scale-in kao novi trejd
- dozvoliti hedge (long i short na istom simbolu u isto vreme)

---

## 2. Brend i svrha

**Brend:** Tradelyt (Trade + Analytics + Discipline).

**Bot:** `@TradelytBot`. Deep link: `https://t.me/TradelytBot?start=<token>`.

**Šta proizvod jeste:** surov, matematički, automatizovani čuvar discipline u realnom vremenu. Prati otvorene pozicije, meri poštovanje plana i šalje lične Telegram poruke.

**Šta proizvod nije:** prediktor cene, savetnik za ulaz, izvršilac naloga, ili sistem koji obećava profit.

**ICP:** kripto trejderi, od početnika do naprednih u zajednicama, koji gube novac zbog nedostatka discipline, FOMO-a, overtradinga i pomeranja Stop-Loss nivoa.

**Ton:** konkretan, kratak, bez magije i bez krivice kad tržište pogodi Stop-Loss. Slavjenje je rezervisano za TP1 i TP2. Vrišteći ton je rezervisan za prekršaj pravila koje je korisnik sam postavio.

### 2.1 Zabranjeni jezik

U UI-ju, meta tagovima, README-ju, bot porukama, imejlovima i komentarima koji procure do korisnika zabranjeno je:

- reč „AI“ u bilo kom obliku (AI, A.I., artificial intelligence)
- naziv DisciplineAI
- formulacije tipa „AI-powered“, „magical AI“, „the bot predicts“

Dozvoljeno je opisati mehaniku: pravila, procente, Stop-Loss, drawdown, discipline score.

Interni kod sme da koristi tehničke nazive biblioteka. Ne sme da ih pretvori u marketinški tekst.

### 2.2 Poznati dug na landingu (sledeći zadatak posle ovog fajla)

Dizajn sa v0 je prebačen. Kopija još krši brend i čisti se odmah posle ovog dokumenta, ne u istom koraku:

- `app/layout.tsx` — title i description i dalje kažu DisciplineAI i „AI-powered“
- `components/hero/navigation.tsx` — vidljiv naziv DisciplineAI
- `components/hero/header-section.tsx` — „AI-powered discipline enforcement“
- `components/hero/phone-mockup.tsx` — „Crypto Discipline Bot“ treba da postane Tradelyt

`components/hero/robot-section.tsx` već ima rečenicu da nema magičnog predviđanja. Posle čišćenja ta rečenica ostaje, bez reči „AI“.

---

## 3. Monetizacija

Jedan paket. Nema tierova.

| Stavka | Vrednost |
|---|---|
| Cena | 30 USD mesečno |
| Period | isključivo mesečno |
| Trial | 7 dana, bez kartice |
| Kripto naplata | V2, van V1 |
| Provajder | Stripe Checkout |
| Identitet naplate | jedan Telegram nalog = jedna pretplata = jedan Stripe Customer |

3D kartica na landingu je vizuelni modal. Ona otvara Stripe Checkout. Forma na našem domenu nikad ne prima broj kartice, CVC ni datum isteka.

Trial je naš sat, ne Stripe trial. Stripe pretplata počinje tek kad korisnik plati, odmah po 30 USD, bez Stripe trial perioda. `trial_ends_at` piše aplikacija u trenutku kad se Telegram nalog poveže.

---

## 4. V1 granica

### V1 (prva produkcija)

- Landing i dashboard na Next.js
- Stripe Checkout, 30 USD mesečno
- Trial 7 dana bez kartice
- Telegram Login Widget ili magic link na imejl
- Povezivanje bota deep linkom, rezervni jednokratni kod u dashboardu
- Bybit read-only API
- Tri moda poruka: Scalper, Classic, Moonshot
- Manual unos trejda (Telegram komanda i forma na dashboardu)
- Javne cene za manual: Bybit public ticker
- Discipline score, dnevni izveštaj, tihi sati

### V1.1 (prva dopuna, odmah posle V1)

- Binance read-only
- OKX read-only, uključujući `api_passphrase_encrypted`
- Webhook `POST /hooks/:token` (TradingView i sopstveni skript)
- BingX read-only ide odmah iza OKX u istoj dopuni

### V2

- Kripto plaćanje

Dok traje V1, šema već sadrži kolone za OKX passphrase, webhook token i `source` trejda, da dopuna ne lomi migracije. Runtime u V1 ne otvara Binance, OKX, BingX ni webhook rute.

---

## 5. Arhitektura

Dva procesa. Jedna baza. Jedna Drizzle šema.

```
Korisnik
  ├─ Next.js (Vercel) ──────── Neon Postgres
  │    landing, checkout, dashboard, čitanje analitike
  └─ Express engine (Railway ili Fly) ── Neon Postgres
       Telegram bot, privatni tokovi pozicija, javni WebSocket cena,
       AES-256-GCM, slanje poruka, manual close po javnoj ceni
```

Next.js zove Express samo za:

- upis i proveru API ključa
- brisanje API ključa
- manual otvaranje i zatvaranje trejda sa dashboarda
- test konekcije ka berzi

Sve ostalo što je CRUD podešavanja, pretplate i čitanje istorije ide iz Next.js direktno u Neon preko Drizzle-a. Next.js nikad ne selektuje ciphertext kolone da bi ih prikazao.

WebSocket i poll od 2 sekunde žive samo u Expressu. Vercel serverless nije domaćin za berzanske sokete ni za Telegram long-polling.

### 5.1 Repozitorijum

Trenutno stanje (2026-09-23): jedan Next.js App Router projekat u root-u. Nema `packages/db`, nema Expressa, nema Drizzle-a, nema Framer Motion u `package.json`. Landing komponente su u `components/hero/`. `framer-motion` je deo namere iz v0 predaje, ali nije instaliran; ne dodavati ga dok konkretan UI zadatak to ne traži.

Ciljna struktura:

```
app/                      Next.js App Router (postoji)
components/               UI (postoji)
lib/                      Next.js pomoćne funkcije, bez enkripcije ključeva
packages/db/              Drizzle šema, migracije, deljeni klijent
services/engine/          Express: bot, berze, enkripcija, webhook (V1.1)
```

Oba procesa importuju `packages/db`. Migracije pokreće `drizzle-kit` protiv Neon-a. Neon MCP je alat agenta u Cursoru za uvid i ad-hoc SQL. Aplikacija u runtime-u ne zove MCP.

### 5.2 Stack koji je zaključan

| Sloj | Izbor |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4, Lucide |
| ORM | Drizzle. Ne Prisma. Ne Kysely |
| Baza | Neon serverless Postgres |
| Naplata | Stripe Checkout + webhook |
| Bot | Telegram Bot API, privatni chat |
| Engine | Node.js + Express |
| Berza V1 | Bybit read-only + Bybit public ticker |
| Šifrovanje | AES-256-GCM u Expressu |

Pre pisanja Next.js koda pročitati vodič u `node_modules/next/dist/docs/`. Ova verzija Next-a odstupa od starijih App Router primera.

### 5.3 Detekcija pozicije (V1 cilj)

- Javne cene: jedan deljeni WebSocket po berzi za sve korisnike. U V1 to je Bybit.
- Privatne pozicije: privatni WebSocket gde berza to daje, inače REST na 2 sekunde.
- Cilj detekcije novog trejda: najkasnije 2 sekunde od pojave pozicije na berzi.
- Manual i webhook ne koriste privatni ključ. Cenu simbola daje Bybit public ticker. Ako simbol tamo ne postoji, korisnik dobija jednu poruku da cena nije pokrivena i alarmi za taj simbol se ne pale.

---

## 6. Identitet i sesija

Primarni identitet je Telegram. `users.telegram_id` je UNIQUE. Primarni ključ svake tabele je UUID.

Prijava na sajt, oba kanala su validna:

1. Telegram Login Widget.
2. Magic link na imejl.

Imejl se čuva samo ako je korisnik ušao magic linkom ili ga je uneo. Nije obavezan za trial ako postoji Telegram.

### 6.1 Povezivanje bota

Primarni put, odmah posle registracije ili plaćanja:

1. Aplikacija napravi jednokratni `link_token` (32 bajta, URL-safe).
2. U bazi stoji samo SHA-256 heš tokena, vreme isteka 30 minuta, `used_at` prazan.
3. Korisnik otvara `https://t.me/TradelytBot?start=<token>`.
4. `/start` sa validnim tokenom upisuje `telegram_id` i `telegram_first_name` na tog usera i označava token iskorišćenim.
5. Od tog trenutka, ako pretplata još nije postojala, kreće trial: `subscription_status = trialing`, `trial_ends_at = now() + 7 days`.

Rezervni put ako korisnik zatvori browser: dashboard pokaže kratak jednokratni kod. Korisnik pošalje botu `/start <kod>`. Isti heš, isti rok, isti efekat.

Token koji je istekao ili već iskorišćen ne povezuje nalog. Korisnik traži novi iz dashboarda.

Jedan `telegram_id` ne sme završiti na dva user reda. Drugi pokušaj povezivanja istog Telegrama na drugi nalog se odbija.

---

## 7. Pretplata

### 7.1 Statusi

`subscription_status`: `trialing` | `active` | `past_due` | `canceled` | `expired`

| Status | Bot poruke o trejdovima | Dashboard |
|---|---|---|
| `trialing` | da, dok je `trial_ends_at` u budućnosti | pun pristup |
| `active` | da, dok je period plaćen | pun pristup |
| `past_due` | ne | samo čitanje |
| `canceled` | da, samo do `subscription_ends_at` | pun pristup do `subscription_ends_at` |
| `expired` | ne | samo čitanje |

Nema grace perioda posle neuspele naplate. `invoice.payment_failed` postavlja `past_due` i bot staje. Kad Stripe javi da je pretplata opet zdrava, status se vraća na `active` i bot nastavlja.

`canceled` znači da je korisnik otkazao obnavljanje. Pristup traje do kraja već plaćenog perioda (`subscription_ends_at`), zatim prelaz u `expired`.

Istek triala ili pretplate šalje jednu obaveštenje u Telegram, pa tišina. Ključevi ostaju šifrovani. Istorija ostaje. Dashboard je read-only dok status ponovo ne bude `trialing` ili `active`. Trial se ne dobija drugi put na isti Telegram.

Podsetnik ide 24 sata pre `trial_ends_at` i 24 sata pre kraja plaćenog perioda ako je pretplata otkazana. Jednom, ne u petlji.

### 7.2 Stripe webhookovi koji smeju da pišu u Neon

- `checkout.session.completed` — upis `payment_customer_id`, status `active`, `subscription_ends_at` iz perioda
- `customer.subscription.updated` — usklađivanje statusa i `subscription_ends_at`
- `customer.subscription.deleted` — prelaz u `expired` kad period više ne pokriva korisnika
- `invoice.payment_failed` — `past_due`

Webhook proverava Stripe potpis. Drugo plaćanje istog Telegram naloga ne pravi drugog Stripe customera. Checkout koristi postojeći `payment_customer_id`. Nova uspešna naplata produžava isti nalog, ne otvara drugi.

### 7.3 Ko sme da šalje poruke

Engine pre svakog slanja proverava status iz poglavlja 7.1 i `bot_settings.is_active`. Ako je pretplata u tišini, engine i dalje može da sačuva već uočeni trejd, ali ne šalje discipline poruke.

`/pause` gasi sve Telegram poruke, uključujući crvene alarme. Detekcija i upis u bazu se nastavljaju. `/resume` vraća slanje. `/pause` ne dira pretplatu.

---

## 8. Šema baze

Svi primarni ključevi su UUID. Sva vremena u bazi su `timestamptz` u UTC. „Lokalno vreme“ postoji samo kao `bot_settings.timezone` (IANA, npr. `Europe/Belgrade`).

`users.telegram_id` je UNIQUE spoljni identifikator, ne primarni ključ.

### 8.1 `users`

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `telegram_id` | bigint UNIQUE NULL | NULL dok deep link nije iskorišćen |
| `telegram_username` | text NULL | bez `@` |
| `telegram_first_name` | text NULL | osvežava se na `/start` |
| `display_name` | text NULL | custom nadimak sa sajta; ako postoji, poruke koriste njega |
| `email` | text NULL UNIQUE | magic link |
| `language` | text NOT NULL | `en` ili `sr`, default `en` |
| `subscription_status` | text NOT NULL | enum iz poglavlja 7.1, default `expired` dok povezivanje ne krene trial |
| `trial_ends_at` | timestamptz NULL | postavlja se jednom |
| `subscription_ends_at` | timestamptz NULL | kraj plaćenog perioda |
| `payment_customer_id` | text NULL UNIQUE | Stripe Customer ID |
| `created_at` | timestamptz NOT NULL | |
| `updated_at` | timestamptz NOT NULL | |

### 8.2 `bot_settings`

Jedan red po korisniku.

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE FK users | |
| `is_active` | boolean NOT NULL | default `true` posle povezivanja |
| `discipline_mode` | text NOT NULL | `scalper` \| `classic` \| `moonshot` |
| `max_daily_trades` | int NOT NULL | |
| `max_drawdown_percent` | numeric NOT NULL | |
| `risk_per_trade_percent` | numeric NOT NULL | |
| `timezone` | text NOT NULL | IANA, default `UTC` |
| `quiet_hours_enabled` | boolean NOT NULL | default `false` |
| `quiet_hours_start` | time NULL | lokalno, npr. 23:00 |
| `quiet_hours_end` | time NULL | lokalno, npr. 07:00; interval sme da pređe ponoć |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Onboarding preset, upisuje se pri kreiranju reda. Korisnik ga menja samo na sajtu:

- `discipline_mode = classic`
- `max_daily_trades = 3`
- `max_drawdown_percent = 5`
- `risk_per_trade_percent = 1`
- `timezone = UTC`
- tihi sati ugašeni

### 8.3 `exchange_keys`

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users | više redova po korisniku |
| `exchange_name` | text NOT NULL | `bybit` \| `binance` \| `okx` \| `bingx` |
| `label` | text NULL | npr. sub-nalog |
| `api_key_ciphertext` | text NOT NULL | |
| `api_key_iv` | text NOT NULL | |
| `api_key_auth_tag` | text NOT NULL | |
| `api_secret_ciphertext` | text NOT NULL | |
| `api_secret_iv` | text NOT NULL | |
| `api_secret_auth_tag` | text NOT NULL | |
| `api_passphrase_ciphertext` | text NULL | obavezno za OKX, NULL za ostale |
| `api_passphrase_iv` | text NULL | |
| `api_passphrase_auth_tag` | text NULL | |
| `permissions` | text NOT NULL | posle provere mora biti `read_only` |
| `is_valid` | boolean NOT NULL | |
| `last_checked_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

Jedinstvenost: jedan aktivni ključ po (`user_id`, `exchange_name`, `label`). `label` NULL se tretira kao prazan string u tom ograničenju.

Brisanje je hard delete. Ciphertext nestaje. Redovi u `trades` ostaju. `trades.exchange_key_id` postaje NULL ako je ključ obrisan, istorija se ne briše. Zato FK koristi `ON DELETE SET NULL`.

### 8.4 `link_tokens`

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users | |
| `token_hash` | text UNIQUE | SHA-256 |
| `expires_at` | timestamptz | 30 minuta od izdavanja |
| `used_at` | timestamptz NULL | |
| `created_at` | timestamptz | |

### 8.5 `webhook_endpoints` (runtime od V1.1, šema od prvog dana)

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid UNIQUE FK users | jedan aktivan URL |
| `token_hash` | text UNIQUE | SHA-256 tokena od 32 bajta |
| `price_exchange` | text NOT NULL | default `bybit` |
| `created_at` | timestamptz | |
| `rotated_at` | timestamptz NULL | |

Sirovi token se pokazuje jednom pri kreiranju ili rotaciji. Stari URL odmah prestaje da važi.

### 8.6 `trades`

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users | |
| `exchange_key_id` | uuid NULL FK exchange_keys | NULL za manual i webhook |
| `source` | text NOT NULL | `exchange` \| `manual` \| `webhook` |
| `token_symbol` | text NOT NULL | normalizovano, npr. `BTCUSDT` |
| `position_type` | text NOT NULL | `long` \| `short` |
| `entry_price` | numeric NOT NULL | |
| `quantity` | numeric NULL | |
| `leverage` | numeric NULL | |
| `stop_loss` | numeric NULL | trenutni SL; NULL znači da SL ne postoji |
| `sl_original` | numeric NULL | prvi SL koji smo videli |
| `take_profit_1` | numeric NULL | |
| `take_profit_2` | numeric NULL | |
| `status` | text NOT NULL | vidi 8.6.1 |
| `pnl_amount` | numeric NOT NULL | kumulativno, default 0 |
| `pnl_percentage` | numeric NOT NULL | kumulativno u odnosu na entry, default 0 |
| `opened_at` | timestamptz NOT NULL | |
| `closed_at` | timestamptz NULL | |
| `missing_sl_alerted_at` | timestamptz NULL | da se upozorenje na 2 minuta pošalje jednom |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### 8.6.1 Statusi trejda

`open` | `tp1_hit` | `tp2_hit` | `stopped` | `closed_manual` | `cancelled`

- Delimično zatvaranje na TP1 postavlja `tp1_hit`. Pozicija i dalje živi. PnL se sabira. Tiha osvežavanja idu na ostatak količine.
- TP2 ili potpuno zatvaranje u plusu na drugom cilju postavlja `tp2_hit` i `closed_at`.
- Pogodak Stop-Lossa postavlja `stopped` i `closed_at`.
- Korisnik zatvori na berzi ili preko `/close` pre TP/SL: `closed_manual`.
- `cancelled` je za unos koji je povučen pre nego što je praćenje počelo.

Zatvoren trejd (`stopped`, `tp2_hit`, `closed_manual`, `cancelled`) više ne dobija tiha osvežavanja ni SL alarm u petlji.

### 8.7 `daily_analytics`

Jedan red po (`user_id`, `local_date`).

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users | |
| `local_date` | date NOT NULL | datum u `bot_settings.timezone` |
| `total_trades` | int NOT NULL | broj novih pozicija otvorenih tog lokalnog dana |
| `discipline_score` | int NOT NULL | 0–100, dan počinje na 100 |
| `daily_pnl_percentage` | numeric NOT NULL | ne ulazi u score |
| `rules_broken_count` | int NOT NULL | |
| `peak_equity` | numeric NOT NULL | vrh equity-ja tog dana |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

UNIQUE (`user_id`, `local_date`).

### 8.8 `notifications_log`

Svako stvarno slanje u Telegram dobija red, uključujući ponavljanje SL alarma na 60 sekundi. Score se ne menja iz ovog loga.

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK users | |
| `trade_id` | uuid NULL FK trades | |
| `notification_type` | text NOT NULL | vidi poglavlje 10.4 |
| `message_content` | text NOT NULL | tačan tekst koji je otišao |
| `sent_at` | timestamptz NOT NULL | |

### 8.9 `discipline_events`

Jedan kazneni događaj, jednom po epizodi. Odvojeno od loga slanja da ponovljeni alarm ne obara score na svakih 60 sekundi.

| Kolona | Tip | Pravilo |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `trade_id` | uuid NULL FK | |
| `local_date` | date NOT NULL | |
| `event_type` | text NOT NULL | `max_daily_trades` \| `sl_loosened` \| `sl_removed` \| `missing_sl` \| `risk_exceeded` \| `hedge` \| `max_drawdown` |
| `penalty` | int NOT NULL | |
| `created_at` | timestamptz | |

Jedinstvenost epizode:

- `missing_sl`, `sl_removed`, `sl_loosened`, `risk_exceeded`: jednom po `trade_id` + `event_type` + `local_date`
- `max_daily_trades`: jednom po trejdu koji je prešao kapu
- `hedge`: jednom po paru pozicija po lokalnom danu
- `max_drawdown`: jednom po korisniku po lokalnom danu

Kazna se ne vraća ako korisnik kasnije popravi pravilo. Popravka samo gasi ponavljanje alarma.

---

## 9. API ključevi

### 9.1 Tok upisa

1. Dashboard šalje plaintext ključ na Express preko HTTPS. Telo nosi interni bearer `ENGINE_INTERNAL_SECRET`.
2. Express zove berzu i čita dozvole.
3. Ako ključ ima trade ili withdraw dozvolu, Express odbija upis i ništa ne čuva. Odgovor traži isključivo read-only ključ.
4. Ako je ključ read-only, Express šifruje i upisuje red, `permissions = read_only`, `is_valid = true`.
5. Odgovor ka browseru sadrži `exchange_name`, maskirani prikaz (poslednja 4 znaka) i `is_valid`. Nikad secret, passphrase ni ciphertext.

Next.js nema `ENCRYPTION_KEY` u svom okruženju. Ne postoji ruta u Next.js koja dekriptuje.

### 9.2 Algoritam

- AES-256-GCM
- Ključ: `ENCRYPTION_KEY`, 32 bajta, base64 u env-u Expressa
- IV: 12 bajtova, jedinstven po svakom šifrovanju polja (key, secret i passphrase imaju zaseban IV)
- Auth tag se čuva uz ciphertext
- Polja u bazi su base64

Dekripcija se dešava u memoriji Expressa, neposredno pre poziva berze. Plaintext se ne loguje, ne šalje u Telegram, ne šalje u analytics i ne vraća u HTTP odgovor.

### 9.3 Nevažeći ključ

HTTP 401 ili berzanska potvrda da ključ više ne važi:

- `is_valid = false`
- poll tog ključa staje
- jedna Telegram poruka da je ključ nevažeći
- ostali validni ključevi tog korisnika rade dalje
- korisnik bez ijednog validnog ključa i dalje sme da koristi manual mod

### 9.4 Berze

V1 runtime: samo Bybit.

Redosled dopune: Binance, zatim OKX, zatim BingX.

OKX bez passphrase se ne čuva. Kolona za passphrase postoji od prve migracije.

Više berzi i više ključeva po berzi (sub-nalozi preko `label`) su podržani šemom. Svaki trejd sa berze nosi `exchange_key_id`.

---

## 10. Telegram

Samo privatni 1-na-1 chat. Nema poruka u grupe, kanale ni komentare.

Jezik: `users.language`, default engleski, izbor na sajtu `en` | `sr`.

Ime u poruci: `display_name` ako nije prazan, inače `telegram_first_name`, inače „there“ / „trader“.

Poruke uključuju ime, relevantan PnL procenat i, kad poruka govori o stanju naloga, equity. Ne uključuju API ključ, tačan wallet ID ni savet „kupi“ ili „prodaj“.

### 10.1 Komande

| Komanda | Efekat |
|---|---|
| `/start` | povezivanje tokenom ili kodom; bez argumenta, kratko uputstvo i link ka sajtu |
| `/status` | otvoreni trejdovi, dnevni score, dnevni PnL%, da li je bot pauziran |
| `/pause` | gasi sve odlazne poruke; upis u bazu se nastavlja |
| `/resume` | ponovo uključuje poruke |
| `/mode scalper\|classic\|moonshot` | menja `discipline_mode` |
| `/limits` | samo prikazuje `max_daily_trades`, drawdown i risk; ne menja ih |
| `/trade ...` | manual otvaranje, vidi poglavlje 12 |
| `/close <symbol>` | zatvara praćeni manual trejd kao `closed_manual` |

Limiti, tihi sati, timezone, jezik i ključevi se menjaju isključivo na sajtu.

### 10.2 Ritam tihog osvežavanja

Šalje se samo dok je trejd u `open` ili `tp1_hit`, i samo ako se PnL procenat promenio bar za prag u odnosu na poslednje tiho osvežavanje tog trejda.

| Mod | U profitu (PnL ≥ 0) | U minusu (PnL < 0) | Prag promene PnL |
|---|---|---|---|
| Scalper | 30 sekundi | 15 sekundi | 0.3 procentna poena |
| Classic | 5 minuta | 2 minuta | 1 procentni poen |
| Moonshot | 30 minuta | 10 minuta | 3 procentna poena |

Ako je interval prošao a cena se nije pomerila dovoljno, poruka se ne šalje i tajmer se meri iznova od te provere. Nema poruke „nema promene“.

Van otvorenog trejda nema tihog osvežavanja.

### 10.3 Tihi sati i dnevni rez

Tihi sati su lokalni interval u `bot_settings`. Tokom njih tiha osvežavanja i slavjenja TP ne idu. Crveni alarmi idu uvek: SL pomeran na gore u riziku, SL uklonjen, overtrade, drawdown, risk, hedge, trejd bez SL.

Uvek idu i van tihih sati i tokom njih, jer su stanje naloga a ne cena: istek pretplate, podsetnik 24h, nevažeći ključ, dnevni izveštaj.

Dnevni izveštaj: 22:00 u `bot_settings.timezone`.

Ako je `total_trades = 0`:

- en: `0 trades today. Excellent discipline and patience. Score: 100`
- sr: `0 trejdova danas. Odlična disciplina i strpljenje. Score: 100`

Ako je bilo trejdova, izveštaj sadrži broj trejdova, dnevni PnL%, discipline score i `rules_broken_count`.

### 10.4 Okidači

„Odmah“ znači u istom ciklusu u kom je engine video događaj, unutar cilja od 2 sekunde za berzanske događaje.

| Događaj | Slanje | Score | Tip u logu |
|---|---|---|---|
| Otvoren trejd | odmah, jednom | — | `trade_opened` |
| Tiho osvežavanje | ritam iz 10.2 | — | `silent_refresh` |
| TP1 | odmah, slavjenje, jednom | — | `tp1_hit` |
| TP2 | odmah, slavjenje, jednom | — | `tp2_hit` |
| SL pogodjen | odmah, podrška bez krivice, jednom | — | `sl_hit` |
| Ručno zatvaranje | odmah, jednom | — | `closed_manual` |
| SL pomeran bliže ceni (manji rizik) | tiha potvrda, jednom po promeni | 0 | `sl_tightened` |
| SL pomeran dalje od cene | alarm odmah, pa svakih 60s dok se ne vrati ili trejd ne zatvori | −25 jednom po epizodi | `sl_loosened` |
| SL uklonjen | isto kao pomeranje dalje, petlja 60s | −25 jednom | `sl_removed` |
| Nema SL 2 minuta posle otvaranja | upozorenje jednom, sa pitanjem da unese SL ovde ili na berzi | −15 jednom | `missing_sl` |
| Preko `max_daily_trades` | vrišteći alarm jednom po tom trejdu | −20 po tom trejdu | `max_daily_trades` |
| Preko dnevnog drawdowna | vrišteći alarm jednom tog dana | −20 jednom tog dana | `max_drawdown` |
| Preko `risk_per_trade_percent` | vrišteći alarm jednom po trejdu po danu | −10 | `risk_exceeded` |
| Hedge | vrišteći alarm jednom po epizodi | −25 | `hedge` |
| 24h pre isteka | jednom | — | `subscription_expiring` |
| Istek / past_due / bot ugašen pretplatom | jednom | — | `subscription_expired` |
| Ključ 401 | jednom po ključu | — | `key_invalid` |
| Dnevni izveštaj | 22:00 lokalno | — | `daily_report` |

Hedge nosi −25 jer je u istoj klasi trenutnog teškog prekršaja kao skidanje Stop-Lossa. To je zaključano ovim dokumentom da score ne bi ostao bez broja.

Drawdown alarm koristi −20, jednom u danu, u istoj težini kao probijanje dnevnog broja trejdova.

Petlja od 60 sekundi važi samo za `sl_loosened` i `sl_removed`. Ostali prekršaji su jednokratni. Svako ponavljanje ide u `notifications_log`, ne u `discipline_events`.

Tokom tihih sati `tp1_hit` i `tp2_hit` se odlažu za kraj tihih sati i šalju jednom, da slavjenje ne stigne u 03:00. Crveni alarmi se ne odlažu.

### 10.5 Smer Stop-Lossa

Za `long`, bliži SL je veći broj (stop se podigao). Dalji SL je manji broj.

Za `short`, bliži SL je manji broj. Dalji SL je veći broj.

Poređenje ide protiv poslednjeg sačuvanog `trades.stop_loss`. Prvi put viđen SL postaje i `sl_original` i `stop_loss`, bez alarma.

Tekst tihe potvrde kad je SL pritegnut:

- en: `Stop moved in your favor. Risk is smaller than it was.`
- sr: `Stop je pomeren u tvoju korist. Rizik je manji nego što je bio.`

Tekst kad SL fali posle 2 minuta:

- en: `No stop on the exchange. Set it there, or reply with the stop price.`
- sr: `Nema stop-lossa na berzi. Postavi ga tamo, ili odgovori cenom stop-lossa.`

Odgovor brojem u tom privatnom chatu, dok je trejd otvoren i bez SL, upisuje `stop_loss` i `sl_original`. To gasi dalje `missing_sl` poruke. Ne gasi kasniju kaznu ako SL opet nestane sa berze.

---

## 11. Matematika discipline

### 11.1 Šta je jedan trejd

Jedan trejd je jedna otvorena pozicija na jednom simbolu, na jednom ključu, u jednom smeru.

Scale-in (povećanje količine iste pozicije) nije novi trejd. Ne diže `total_trades`. Ponovo računa risk. Ako novi risk pređe limit, to je `risk_exceeded` ako za taj trejd tog dana još nije upisan.

Hedge, long i short na istom simbolu u isto vreme na istom nalogu, je zabranjen. Instant `hedge` događaj. Ne čeka 2 minuta.

### 11.2 Equity i drawdown

Equity = wallet balance + nerealizovani PnL.

Ako je više validnih ključeva, equity je zbir svih njih.

Drawdown je peak-to-trough unutar lokalnog kalendarskog dana:

```
drawdown% = (peak_equity - current_equity) / peak_equity * 100
```

`peak_equity` u `daily_analytics` raste kad god je tekući equity veći od sačuvanog vrha tog dana. Na početku dana vrh je equity prve uspešne procene. Ako je `peak_equity` 0, drawdown se ne računa i ne alarmira.

Prekoračenje je `drawdown% > max_drawdown_percent`.

### 11.3 Risk po trejdu

```
risk% = (abs(entry - stop_loss) / entry) * (position_notional / equity) * 100
```

`position_notional` je apsolutna izloženost pozicije u valuti equity-ja (količina × cena), ne margin.

Ako je `entry` 0 ili equity 0, račun se ne deli; trejd se tretira kao prekoračenje rizika.

Ako SL ne postoji u trenutku provere posle početnih 2 minuta, rizik je neograničen: pale se i `missing_sl` i `risk_exceeded` ako taj događaj još nije upisan.

Prekoračenje je `risk% > risk_per_trade_percent`.

### 11.4 Discipline score

Dan počinje na 100. PnL ne ulazi u score.

| Događaj | Kazna |
|---|---|
| Svaki trejd preko `max_daily_trades` | −20 |
| SL na lošiju stranu ili uklonjen | −25 |
| Hedge | −25 |
| Trejd još bez SL posle 2 minuta | −15 |
| Risk preko limita | −10 |
| Dnevni drawdown preko limita | −20 |

Donja granica je 0. Gornja granica posle početka dana je 100. Score se ne penje kad korisnik ispravi grešku.

`rules_broken_count` raste za 1 po redu u `discipline_events` tog dana.

### 11.5 Dnevna granica

„Danas“ je od lokalne ponoći do sledeće lokalne ponoći u `bot_settings.timezone`. Brojač trejdova, vrh equity-ja i score resetuju se novim redom `daily_analytics`. Otvoren trejd koji je počeo juče i dalje se prati, ali ne ulazi u današnji `total_trades`.

---

## 12. Manual mod

Dostupan u V1, sa ključem ili bez njega.

Ulazi:

1. Telegram: `/trade <symbol> <LONG|SHORT> <entry> SL <stop> TP <tp1> TP2 <tp2>`
   - Obavezno: simbol, smer, entry, SL
   - TP i TP2 su opcioni
   - Primer: `/trade BTC LONG 64200 SL 63000 TP 66000 TP2 70000`
2. Forma na dashboardu sa istim poljima.

`source = manual`, `exchange_key_id = NULL`, status `open`.

Engine prati javnu cenu (Bybit ticker). Kad cena dotakne SL, TP1 ili TP2, ponaša se kao da je nalog na berzi ispunjen: iste poruke, isti statusi. Delimični TP1 ostavlja ostatak u `tp1_hit`.

Korisnik zatvara pre cilja komandom `/close <symbol>` ili dugmetom na dashboardu. Status `closed_manual`.

Ako je simbol nepoznat Bybit tickeru, trejd se i dalje upisuje, jedna poruka kaže da cena nije pokrivena, i automatski TP/SL se ne pale.

Manual trejd ulazi u `max_daily_trades`, risk i hedge pravila isto kao berzanski.

---

## 13. Webhook (V1.1)

Nije uključen u V1 runtime.

`POST /hooks/:token`

Token je 32 bajta, URL-safe, jedini dokaz da sme da se zove. Nema posebnog HMAC-a u V1.1. Rotacija sa sajta invalidira stari token. U bazi je samo SHA-256.

Telo:

```json
{
  "symbol": "BTCUSDT",
  "side": "long",
  "entry": 64200,
  "stopLoss": 63000,
  "takeProfit1": 66000,
  "takeProfit2": 70000,
  "event": "open"
}
```

`event`: `open` | `close` | `update`.

`side`: `long` | `short`.

Obavezno za `open`: `symbol`, `side`, `entry`, `stopLoss`.

Pravila:

- `open` dok za taj simbol već postoji `open` ili `tp1_hit` ažurira taj red (entry, SL, TP), ne pravi drugi trejd.
- `update` menja SL/TP na otvorenom redu i prolazi kroz istu SL logiku kao pomeraj na berzi.
- `close` postavlja `closed_manual`.
- Nepoznat ili rotiran token: HTTP 404, bez tela koje otkriva da li korisnik postoji.
- Cena: Bybit public ticker, isto kao manual.

Pozivalac u V1.1 je TradingView alert ili sopstveni skript korisnika.

---

## 14. Berzanski trejd (Bybit u V1)

1. Privatni tok ili REST vidi novu poziciju.
2. Engine upiše `trades` sa `source = exchange` i `exchange_key_id`.
3. Pročita postojeće SL i TP naloge sa berze (put B).
4. Ako SL postoji, sačuva ga kao `sl_original` i `stop_loss`, pošalje `trade_opened`.
5. Ako SL ne postoji, pošalje `trade_opened` bez SL cene i krene tajmer od 2 minuta (put A). Na isteku, ako SL i dalje nema, `missing_sl`.
6. Svaki sledeći ciklus poredi količinu, smer, SL i TP sa sačuvanim redom.
7. Zatvaranje pozicije na berzi bez našeg TP/SL mapiranja je `closed_manual`.

TP1 i TP2 sa berze su nalozi za redukciju ili zatvaranje. Ako berza vrati samo jedan TP, `take_profit_2` ostaje NULL i nema TP2 poruke dok se ne pojavi.

Korisnik ne može da ima istovremeno berzanski i manual trejd na istom simbolu u istom smeru. Drugi ulaz se vezuje za postojeći otvoreni red.

---

## 15. Promenljive okruženja

Ne commituju se. Ne lepe se u ovaj fajl.

Next.js:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `ENGINE_URL`
- `ENGINE_INTERNAL_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = `TradelytBot`

Express:

- `DATABASE_URL`
- `ENCRYPTION_KEY` (32 bajta, base64)
- `TELEGRAM_BOT_TOKEN`
- `ENGINE_INTERNAL_SECRET` (isti kao na Next.js)
- `PORT`

`ENCRYPTION_KEY` ne sme postojati na Vercelu.

---

## 16. Pravila pisanja koda

- TypeScript u oba procesa. Bez `any` na granicama baze, Stripe-a i berze.
- Drizzle šema je jedino mesto gde se opisuju tabele. Ručni SQL u feature kodu nije zamena za migraciju.
- Migracija prati promenu šeme u istom zadatku.
- Server kod u Next.js čita Neon. Klijentske komponente ne dobijaju `DATABASE_URL` ni Stripe secret.
- Tajne se ne interpoliraju u log, toast, Telegram ili `notifications_log` osim teksta koji je namerno korisnički.
- Novi korisnički stringovi dolaze u paru: `en` i `sr`.
- Imena paketa, ruta i tabela ostaju na engleskom, kao u ovom dokumentu.
- Ne dodavati drugi ORM, drugi payment provider ni trade-permission ključeve „privremeno“.
- UI izmene na webu proveriti u browseru na toku koji je stvarno promenjen.
- Posle promene proizvoda ažurirati ovaj fajl u istom zadatku.

### 16.1 Šta agent ne radi sam

- Ne čisti landing od DisciplineAI u zadatku koji traži samo ovaj dokument. To je sledeći, poseban zadatak.
- Ne uključuje Binance, OKX, BingX ni webhook rute u V1 implementaciji.
- Ne prihvata API ključ sa trade ili withdraw pravom.
- Ne šalje nalog za kupovinu, prodaju, pomeranje stopa ili zatvaranje na berzu.

---

## 17. Mapa odluka

Sva 34 pitanja su zatvorena 2026-09-23. Skraćeni zapis da se ne otvaraju ponovo:

1. Povezivanje: deep link primarno, jednokratni kod u dashboardu rezervno.
2. Samo privatni chat.
3. Engleski default, srpski u podešavanjima. Ime: custom nadimak, inače Telegram `first_name`.
4. Intervali Scalper 30s/15s, Classic 5m/2m, Moonshot 30m/10m. Pragovi 0.3 / 1 / 3 procentna poena.
5. Okidači iz poglavlja 10.4.
6. Blokada je alarm plus zapis, bez egzekucije. SL alarm se ponavlja na 60s.
7. Komande iz 10.1. Limiti samo na sajtu.
8. Dnevni izveštaj u 22:00 lokalno. Nula trejdova i dalje šalje poruku, score 100.
9. Tihi sati gase tiha osvežavanja. Crveni alarmi prolaze.
10. SL/TP se čitaju sa berze. Bez SL, upozorenje posle 2 minuta i unos u chatu.
11. Jedan simbol, jedna pozicija. Scale-in nije novi trejd. Hedge je prekršaj.
12. Drawdown od dnevnog vrha equity-ja. Equity = wallet + nerealizovani PnL, zbir berzi.
13. Formula rizika iz 11.3. Bez SL, rizik je neograničen.
14. Score iz 11.4. PnL ne ulazi. Minimum 0.
15. Delimični TP1 ostavlja trejd živ. Statusi iz 8.6.1.
16. AES-256-GCM samo u Expressu.
17. Ključ sa trade/withdraw se odbija. V1 berza je Bybit. Passphrase kolona za OKX postoji.
18. `trades.exchange_key_id` je obavezan za berzanske trejdove.
19. 401 gasi taj ključ i šalje jednu poruku. Manual i dalje radi.
20. Hard delete ključa, istorija trejdova ostaje.
21. Drizzle. Neon MCP je za agenta, ne za runtime.
22. Next na Vercelu, Express na Railway ili Fly.
23. Javni WS plus privatni WS ili REST na 2s. Cilj detekcije ≤ 2s.
24. Telegram je identitet. Login Widget ili magic link.
25. UUID primarni ključevi. `telegram_id` UNIQUE.
26. Stripe Checkout, 30 USD mesečno. Kripto je V2. Kartica se ne kuca u naš DOM.
27. Trial 7 dana bez kartice. Podsetnik 24h ranije. Posle isteka bot ćuti, dashboard je read-only.
28. Statusi iz 7.1. Samo mesečni plan.
29. Jedan Telegram, jedna pretplata, jedan Stripe customer.
30. Manual preko `/trade` i preko dashboarda.
31. Webhook u V1.1, token u URL-u.
32. Javna cena za manual/webhook: Bybit.
33. Brend je samo Tradelyt. Čišćenje landinga je sledeći zadatak.
34. V1 je Stripe, Telegram, Bybit, tri moda, manual. Binance, OKX, BingX i webhook su V1.1.
