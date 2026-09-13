# FinTrack — Frontend (Mobile App)

@AGENTS.md

> ⚠️ **Expo versioned docs:** কোড লেখার আগে এই SDK-র docs দেখো → https://docs.expo.dev/versions/v56.0.0/

একটি **Offline-First Personal Finance & Expense Tracker** মোবাইল অ্যাপ। এটি ক্লায়েন্ট; এর সঙ্গী backend আছে `../FinTrack-Backend` (NestJS + Prisma + PostgreSQL, ইতিমধ্যে তৈরি ও deployed-ready)।

ব্যবহারকারী করতে পারবে: Income, Expense, Loan (Lend/Borrow), Practical Balance ইনপুট, Untracked Expense detection, Monthly Saving, History, PDF report — সবকিছু **offline-এ**, internet এলে cloud-এর সাথে **auto-sync**।

---

## 🧭 সবচেয়ে গুরুত্বপূর্ণ নীতি (এগুলো ভাঙলে অ্যাপ ভুল হিসাব দেবে)

1. **Client = Calculation Authority।** সব আর্থিক হিসাব (dashboard, untracked, saving, monthly summary) **client-এ, local SQLite থেকে** হবে — offline-এ কাজ করার জন্য। Backend-এর `/summary/*` শুধু optional cross-check; এর উপর dashboard নির্ভর করবে না।
2. **Money = integer paisa।** সব আর্থিক মান `number` (টাকা × ১০০)। কখনো float/decimal নয়। শুধু **দেখানোর সময়** ১০০ দিয়ে ভাগ করে `৳` format। (নিচের §Money দেখো।)
3. **SQLite = source of truth।** UI সবসময় SQLite থেকে পড়ে/লেখে; সার্ভার শুধু sync target। কখনো সরাসরি API থেকে UI render করে offline ভাঙবে না।
4. **Calculation formula = backend CLAUDE.md-এর §A–§F।** নিচে hubahu কপি করা আছে। দুই repo-তে একই সূত্র থাকতে হবে।

---

## 🛠️ Tech Stack (যা ইতিমধ্যে সেটআপ করা)

| ক্ষেত্র | লাইব্রেরি | অবস্থা |
| --- | --- | --- |
| Framework | Expo SDK **56**, React Native 0.85, React 19 | ✅ initialized |
| Routing | **Expo Router** (file-based, `src/app/`) | ✅ |
| Language | TypeScript (strict) | ✅ |
| Styling | **NativeWind v4** (Tailwind) | ✅ configured (`tailwind.config.js`, `src/global.css`, `babel.config.js`, `metro.config.js`) |
| State | **Zustand** | ✅ installed |
| Server/sync state | **TanStack Query** | ✅ installed |
| HTTP | **axios** | ✅ installed |
| Secure tokens | **expo-secure-store** | ✅ installed |
| Offline DB | **expo-sqlite** | ✅ installed |

**এখনো যোগ করা হয়নি (দরকার হলে তখন install করবে):**
- `react-native-mmkv` — app settings/theme/lastSync cache। ⚠️ **Expo Go-তে চলে না; dev build লাগবে।** তাই এটা যোগ করার আগে dev build সেটআপ করতে হবে। ততক্ষণ MMKV-র জায়গায় `expo-secure-store`/SQLite/AsyncStorage দিয়ে কাজ চালানো যায়।
- `expo-print` + `expo-sharing` — client-side PDF report (HTML→PDF; বাংলা font embed)।
- বাংলা font (**Noto Sans Bengali**) — `expo-font` দিয়ে।

> নতুন native dependency যোগ করলে `npx expo install <pkg>` ব্যবহার করো (SDK-matched version)। JS-only হলে `npm install`।

---

## ▶️ Commands

```bash
npx expo start            # dev server (Expo Go: i/a/w)
npx expo start -c         # cache clear করে start
npm run android | ios | web
npx tsc --noEmit          # টাইপচেক (PR-এর আগে অবশ্যই)
npx expo lint             # lint
npx expo export -p web    # bundle যাচাই (CI smoke)
```

> NativeWind/Tailwind class পরিবর্তনের পর কখনো cache সমস্যা হলে `npx expo start -c`।

---

## 📁 Project Structure (লক্ষ্য কাঠামো)

```
src/
  app/                    # Expo Router routes (screens)
    (auth)/               # login, register, forgot-password
    (tabs)/               # dashboard, income, expense, loan, history, settings
    _layout.tsx           # root: providers (QueryClient), global.css import, theme
  components/             # reusable UI (Button, Card, AmountText, ...)
  features/               # feature logic (income/, expense/, loan/, summary/, sync/, auth/)
  lib/
    api/                  # axios instance + endpoints + refresh interceptor
    db/                   # SQLite: schema, migrations, repositories
    calc/                 # ⭐ pure calculation functions (§A–§F) — heavily unit-tested
    money.ts              # paisa <-> display helpers
    date.ts               # month boundary / timezone helpers
  stores/                 # Zustand stores (session, sync status, ui)
  hooks/                  # React hooks (useDashboard, useSync, ...)
  constants/              # theme, categories
```

- `@/*` → `src/*` (tsconfig alias আগে থেকেই সেট)।
- নতুন screen = `src/app/`-এ ফাইল। Tabs/stack group convention মেনে চলো।
- **Calculation code `src/lib/calc/`-এ pure function হিসেবে** রাখো (no React, no DB) — যাতে unit test করা যায়। UI/DB এদের কল করবে।

---

## 🧮 Calculation Definitions (Canonical — backend §A–§F-এর সাথে অভিন্ন)

> এটি **single source of truth**। সব হিসাব integer paisa-তে। `src/lib/calc/`-এ এগুলো hubahu implement করতে হবে।

### A. তিন ধরনের Balance
| Term | মানে |
| --- | --- |
| **Opening Balance** | চলতি মাসের শুরুতে হাতে থাকা saving (savings-ledger; প্রথম মাসে user input, পরে carry-forward) |
| **Theoretical Balance** (Dashboard label: **Current Balance**) | হিসাব অনুযায়ী এখন হাতে যত থাকার কথা (§B) |
| **Practical Balance** | বাস্তবে এখন হাতে যত আছে (user input: Cash + Bank + MFS) |

### B. Theoretical Balance — Scope নিয়ম (⚠️ সবচেয়ে জরুরি)
Income ও Daily Expense **চলতি মাসের scope** (all-time নয়); Lent/Borrowed **global running total**।

```
Theoretical Balance =
    Opening Balance (চলতি মাস)
  + Month Income (চলতি মাস)
  + Outstanding Borrowed (global, Active শুধু)
  − Month Daily Expense (চলতি মাস)
  − Outstanding Lent (global, Active শুধু)
```
- Opening = savings-ledger opening (আগের মাসগুলোর untracked fold করা; loan effect **নেই**)। তাই **Opening ≠ Practical**।

### C. Untracked Expense
```
Untracked Expense = Theoretical Balance − Practical Balance
```
- Practical না দিলে → **0**।
- **Negative হলে** (Practical > Theoretical): UI-তে **"Untracked Income"** দেখাও (একই মান, opposite sign)। কখনো negative "expense" দেখাবে না।
- এটি Monthly Saving থেকে বিয়োগ হয় (§D) এবং Opening chain-এ fold হয় (§E)।

### D. Monthly Saving
```
Monthly Saving = Month Income − (Month Daily Expense + Month Untracked Expense)
```
- **Untracked বিয়োগ হয়** (টাকা বাস্তবে চলে গেছে) → গাণিতিকভাবে `Saving = Practical − Opening`।
- **Loan (Lent/Borrowed) এতে ধরা হবে না** — loan আলাদা ledger; শুধু §B-তে live হিসেবে আসে। ধরলে double-count।
- Practical না দিলে Untracked=0 → `Saving = Income − Daily Expense`।

### E. Carry Forward (savings ledger)
```
New Month Opening = Previous Opening + Previous Saving
                  = Prev Opening + Income − Daily Expense − Untracked
```
- Untracked **fold হয়** (স্থায়ীভাবে accounted)। Loan **fold হয় না**।
- **Double-count এড়াও:** (১) untracked প্রতি মাসে current-month theoretical দিয়ে fresh হয় (cumulative নয়); (২) loan opening-এ fold কোরো না।

### F. Total Expense (label সতর্কতা)
```
Total Expense = Daily Expense + Outstanding Lent + Untracked Expense
```
- **Outstanding Lent প্রকৃত expense নয়** — asset/পাওনা, temporary cash-out। Loan settle (Returned) হলে এটি Total Expense থেকে স্বয়ংক্রিয়ভাবে বাদ যায়।

### Net Worth (Dashboard, optional)
```
Net Worth = Practical Balance + Outstanding Lent − Outstanding Borrowed
```
- Practical না দিলে Practical-এর জায়গায় **Theoretical Balance** ধরো — তখন untracked = 0, অর্থাৎ হাতে থাকা টাকা = theoretical ধরা হচ্ছেই। কখনো ৳0 ধরবে না (তাহলে শুধু loan থেকে negative net worth আসে)।

### Loan নিয়ম (Lend + Borrow)
| direction | অর্থ | Theoretical-এ |
| --- | --- | --- |
| **LENT** (ধার দেওয়া) | পাওনা/asset, cash কমে | **বিয়োগ** |
| **BORROWED** (ধার নেওয়া) | দেনা/liability, cash বাড়ে | **যোগ** |
- Outstanding = sum of **Active** loans (settled বাদ), global running total — মাসে মাসে আবার গোনা হয় না।
- BORROWED **income নয়**; settle (Repay) **expense নয়** — শুধু দায় নিষ্পত্তি।

---

## 💰 Money / Currency (Modification #1)

- সব মান **integer paisa** (`number`)। উদাহরণ: ৳১,২৫০.৫০ → `125050`।
- কখনো float-এ হিসাব করবে না। যোগ/বিয়োগ সব integer paisa-তে।
- Backend JSON-এ amount **number** হিসেবে আসে (paisa) — সরাসরি ব্যবহার করো।
- `src/lib/money.ts` helper:
  - `formatTaka(paisa: number): string` → `"৳1,250.50"` (locale: bn-BD; ১০০ দিয়ে ভাগ)।
  - `toPaisa(taka: number): number` → `Math.round(taka * 100)` (ইনপুট পার্স করার সময়)।
- Display ছাড়া কোথাও ১০০ দিয়ে ভাগ কোরো না।

---

## ⏱️ Dates & Timezone (Modification #10)

- Month boundary ও Monthly Closing **device-এর local timezone** ধরে। (Backend cross-check UTC ব্যবহার করে — এটা জেনে রাখো, কিন্তু client local-ই authority।)
- Date সংরক্ষণ **ISO-8601** string।
- `src/lib/date.ts`: `monthRangeLocal(year, month)`, `currentMonthKey()` ইত্যাদি helper।
- চলতি মাস = device local `new Date()` থেকে।

---

## 🗄️ Offline-First Architecture

1. **প্রতিটি লেখা প্রথমে SQLite-এ** (UUID সহ), `syncStatus = 'PENDING'`। UI সঙ্গে সঙ্গে SQLite থেকে আপডেট।
2. Internet থাকলে **Sync Service** চালু হয় → PENDING রেকর্ড push, server থেকে changes pull, merge।
3. UI কখনো network-এর জন্য block করবে না।

### প্রতিটি রেকর্ডের common field (backend mirror)
`id` (UUID, client-generated), `createdAt`, `updatedAt`, `isDeleted` (soft-delete tombstone), `deletedAt`, `syncStatus` (`PENDING|SYNCED|FAILED`)।

- **Delete = soft delete** (`isDeleted=1`, `deletedAt`)। কখনো hard delete নয় (tombstone sync হতে হবে)।
- **UUID** client-এ generate হয় (`expo-crypto` বা `Crypto.randomUUID()`); local ও server একই id।

### Sync Flow
- **Push:** `syncStatus='PENDING'` রেকর্ডগুলো `POST /sync/push`-এ পাঠাও → success হলে `SYNCED`, fail হলে `FAILED`।
- **Pull:** `GET /sync/pull?since=<lastSyncedAt>` → নতুন/updated/deleted রেকর্ড → **Last-Write-Wins** (`updatedAt` দিয়ে) SQLite-এ merge → `lastSyncedAt` আপডেট (MMKV/SecureStore-এ রাখো)।
- LWW caveat: clock skew থাকলে ভুল winner সম্ভব; single-user app-এ ঝুঁকি কম।

---

## 🧱 Local Data Model (SQLite — backend Prisma mirror)

সব amount integer paisa। তারিখ ISO string।

- **income**: `id, amount, source, date, note, isDeleted, deletedAt, syncStatus, createdAt, updatedAt`
- **expense**: `id, amount, category, date, description, isDeleted, deletedAt, syncStatus, createdAt, updatedAt`
- **loan**: `id, direction('LENT'|'BORROWED'), personName, amount, date, note, status('ACTIVE'|'SETTLED'), settledDate, isDeleted, deletedAt, syncStatus, createdAt, updatedAt`
- **monthly_summary**: `id, year, month, openingBalance, totalIncome, totalDailyExpense, outstandingLent, outstandingBorrowed, untrackedExpense, monthlySaving, closingBalance, practicalBalance, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` (unique: `year+month`)
- **practical_balance** (client-local): চলতি balance ইনপুট track করতে — অন্তত `{ month_key, amount, updatedAt }`; month-close-এ এটি `monthly_summary.practicalBalance`-এ যায়।
- **meta/kv**: `lastSyncedAt`, `lastClosedMonth` ইত্যাদি (MMKV বা SecureStore বা ছোট kv table)।

Profile/settings (server): `openingSavings` (paisa), `currency`, `timezone`, `name`, `email`।

---

## 🔌 Backend API (base: `EXPO_PUBLIC_API_URL` + `/api`)

> Local dev: backend চলে `http://localhost:3000/api`। **ফোন/এমুলেটরে `localhost` কাজ করবে না** — মেশিনের LAN IP (যেমন `http://192.168.x.x:3000/api`) বা tunnel ব্যবহার করো। `app.json` বা `.env`-এ `EXPO_PUBLIC_API_URL` রাখো।
> Auth লাগে এমন সব route-এ header: `Authorization: Bearer <accessToken>`। amount সব paisa (number)।

**Auth (public):** `POST /auth/register` `{email,password,name?,openingSavings?}` · `POST /auth/login` · `POST /auth/refresh` `{refreshToken}` · `POST /auth/logout` · `POST /auth/forgot-password` `{email}` (৬ সংখ্যার কোড email হয়) · `POST /auth/verify-reset-code` `{email,code}` → `{resetToken}` · `POST /auth/reset-password` `{token: resetToken, password}`
**Users:** `GET /users/me` · `PATCH /users/me` `{name?}` · `PATCH /users/me/settings` `{currency?,timezone?,openingSavings?}`
**Income/Expense:** `POST|GET /incomes` (`?from&to`), `GET|PATCH|DELETE /incomes/:id` · একইভাবে `/expenses` (list-এ `?category` ও আছে)
**Loan:** `POST|GET /loans` (`?direction&status`), `GET|PATCH|DELETE /loans/:id`, `POST /loans/:id/settle` `{settledDate?}`
**Summary (cross-check):** `GET /summary/dashboard?year&month&practicalBalance` · `GET /summary/monthly?year&month` · `GET /summary/history` · `PUT /summary/monthly` (month-close push)
**Sync:** `POST /sync/push` `{incomes?,expenses?,loans?,monthlySummaries?}` · `GET /sync/pull?since=<ISO>`
**Health:** `GET /health`

> পূর্ণ field/আচরণ: `../FinTrack-Backend/README.md` ও `../FinTrack-Backend/CLAUDE.md`।

---

## 🔐 Auth Flow (Modification #7)

- প্রথমবার অবশ্যই **online login/register**। তারপর Access + Refresh token **expo-secure-store**-এ।
- এরপর ব্যবহারকারী **offline-এ অনির্দিষ্টকাল** কাজ করতে পারবে (refresh token দীর্ঘমেয়াদি — backend default 90d)।
- **axios interceptor:** 401 পেলে `/auth/refresh` দিয়ে নতুন token নিয়ে retry; refresh ফেল করলে logout → login screen।
- Token কখনো MMKV/AsyncStorage/plain storage-এ নয় — শুধু **SecureStore**।
- session state Zustand-এ (`isAuthenticated`, `user`), কিন্তু token-এর সত্য উৎস SecureStore।

---

## 🧠 State Management — কে কী রাখে

- **SQLite** = সব persistent ডেটার source of truth (income/expense/loan/summary)।
- **TanStack Query** = SQLite read + server sync orchestration (queries/mutations; offline mutation queue)।
- **Zustand** = session (auth), sync status (`syncing/lastSyncedAt`), ক্ষণস্থায়ী UI state।
- **SecureStore** = tokens। **MMKV/kv** = settings, theme, lastSyncedAt, lastClosedMonth (MMKV যোগ না করা পর্যন্ত fallback)।

---

## 📅 Monthly Closing (Catch-up) — Modification #8 & #11

- কোনো cron নেই — **App খোলার সময়** catch-up check চালাও।
- `lastClosedMonth` দেখে, পেরিয়ে যাওয়া প্রতিটি মাস একে একে close করো:
  - সেই মাসের Monthly Summary, Monthly Saving (§D), Closing Balance (§E) গণনা করো।
  - local `monthly_summary`-তে save করো এবং backend-এ push করো (`PUT /summary/monthly` বা sync push) — তাহলে History-তে per-month untracked দেখা যাবে।
- **Idempotent** হতে হবে (একই মাস দুবার close হবে না — unique year+month)।
- **Backdated edit → recompute (§11):** closed মাসে backdated income/expense add/edit/delete হলে **সেই মাস + পরের সব মাস recompute** করো (carry-forward chain ভেঙে যায়)। Recompute idempotent।
- **বাস্তবায়ন** — `closeMonths()` (`src/stores/data.ts`), chain: `closedMonthChain()` (`src/lib/calc`):
  - `lastClosedMonth` রাখা হয় না। প্রতিবার প্রথম record-এর মাস থেকে চলতি মাসের আগের মাস পর্যন্ত **পুরো chain** নতুন করে গণনা হয়; শুধু যে মাসের figure বদলেছে সেটাই `PENDING` হয়ে save + push হয়। Catch-up, backdated recompute আর idempotency — তিনটাই এই এক পথে।
  - Trigger: store subscription — app open (`ready`), income/expense/loan/practical/openingSavings বদলালে (sync pull সহ), আর app foreground-এ এলে।
  - Closed মাসের Outstanding Lent/Borrowed = **সেই মাসের শেষে** যা বাকি ছিল (`outstandingLoansAt`) — পরে loan settle হলেও পুরোনো মাসের summary বদলায় না।
  - Local `practical_balance` না থাকলে stored summary-র `practicalBalance` ধরা হয় (অন্য device-এ close হওয়া মাস)।
  - Closed মাসের dashboard/report stored summary থেকে দেখায় — তাই ক্লোজিং সবসময় পরের মাসের ওপেনিং-এর সমান।
  - Demo account (`__demo__`) skip — এর seed history fixed।

---

## 🖼️ UI / Theme

- **NativeWind className** দিয়ে styling (`className="flex-1 bg-white px-4"`)। inline `StyleSheet` শুধু যেখানে NativeWind পারে না।
- Dark/Light: `useColorScheme()` (template-এ আছে)। theme colors `src/constants/theme.ts`-এ।
- **বাংলা rendering:** Noto Sans Bengali font লোড করো (`expo-font`) — টাকা/লেবেল বাংলায় দেখানোর জন্য।
- Amount দেখাতে একটা `AmountText`/`formatTaka` কম্পোনেন্ট ব্যবহার করো (consistent `৳` format, paisa→display)।
- Design এলে (code/screenshot/tokens) সেই অনুযায়ী screen বানানো হবে; এখনকার template example screen (`src/app/index.tsx`, `explore.tsx`) replace হবে।

---

## ✅ Screens / Features (spec থেকে — যা বানাতে হবে)

- **Auth:** Login, Register, Forgot/Reset Password।
- **Dashboard:** Current Balance, Opening Savings, চলতি মাসের Income/Expense, Outstanding Lent (পাওনা), Outstanding Borrowed (দেনা), Untracked Expense, চলতি মাসের Saving, Net Worth (optional) — সব **local calc** থেকে।
- **Income:** add/edit/delete (soft), history, backdated date।
- **Expense:** add/edit/delete (soft), categories (Food, Transport, Shopping, Medical, Education, Entertainment, Utilities, Others), backdated।
- **Loan:** add (LENT/BORROWED), settle (Return/Repay), list with direction/status filter।
- **Practical Balance:** যেকোনো সময় current balance ইনপুট → untracked auto-calc।
- **History:** previous months summary (income/expense/untracked/saving + opening/closing), income/expense/loan/saving history।
- **PDF Report:** client-side (expo-print), মাসিক report (বাংলা font embed)।
- **Settings:** opening savings, currency, timezone, theme, sync status, logout।

---

## 🧪 Conventions / Definition of Done

- নতুন কোডের আগে **এই ফাইল + প্রয়োজনে `../FinTrack-Backend/CLAUDE.md`** পড়ো; calculation দুই repo-তে অভিন্ন রাখো।
- `src/lib/calc/` ফাংশনগুলোর **unit test** লেখো (§A–§F edge case সহ: untracked negative, no practical, loan settle, carry-forward chain)।
- PR/commit-এর আগে: `npx tsc --noEmit` clean + `npx expo lint`।
- কোনো আর্থিক হিসাব float-এ কোরো না; কোনো hard delete কোরো না; কোনো token plain storage-এ রেখো না।
- নতুন native module → `npx expo install`; Expo Go-তে না চললে dev build দরকার (README/AGENTS দেখো)।
