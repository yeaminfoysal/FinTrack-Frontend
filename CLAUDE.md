# FinTrack — Frontend (Mobile App)

@AGENTS.md

> ⚠️ **Expo versioned docs:** কোড লেখার আগে এই SDK-র docs দেখো → https://docs.expo.dev/versions/v57.0.0/

একটি **Offline-First Personal Finance & Expense Tracker** মোবাইল অ্যাপ। এটি ক্লায়েন্ট; এর সঙ্গী backend আছে `../FinTrack-Backend` (NestJS + Prisma + PostgreSQL, ইতিমধ্যে তৈরি ও deployed-ready)।

ব্যবহারকারী করতে পারবে: Income, Expense, Loan (Lend/Borrow), Practical Balance ইনপুট, Untracked Expense detection, Monthly Saving, History, PDF report — সবকিছু **offline-এ**, internet এলে cloud-এর সাথে **auto-sync**।

---

## 🧭 সবচেয়ে গুরুত্বপূর্ণ নীতি (এগুলো ভাঙলে অ্যাপ ভুল হিসাব দেবে)

1. **Client = Calculation Authority।** সব আর্থিক হিসাব (dashboard, untracked, saving, monthly summary) **client-এ, local SQLite থেকে** হবে — offline-এ কাজ করার জন্য। Backend-এ কোনো হিসাব নেই — শুধু auth, users, sync আর health।
2. **Money = integer paisa।** সব আর্থিক মান `number` (টাকা × ১০০)। কখনো float/decimal নয়। শুধু **দেখানোর সময়** ১০০ দিয়ে ভাগ করে `৳` format। (নিচের §Money দেখো।)
3. **SQLite = source of truth।** UI সবসময় SQLite থেকে পড়ে/লেখে; সার্ভার শুধু sync target। কখনো সরাসরি API থেকে UI render করে offline ভাঙবে না।
4. **Calculation formula = §A–§F** (backend CLAUDE.md-এর spec-এর সাথে অভিন্ন, নিচে hubahu কপি)। Code-এ implementation শুধু এই repo-তে (`src/lib/calc/`)।

---

## 🛠️ Tech Stack

| ক্ষেত্র | লাইব্রেরি |
| --- | --- |
| Framework | Expo SDK **57**, React Native 0.86, React 19 (React Compiler চালু) |
| Routing | **Expo Router** (file-based, `src/app/`, typed routes) |
| Language | TypeScript (strict) |
| ভাষা (UI) | নিজের ছোট i18n লেয়ার (`src/lib/i18n/`) — বাংলা ডিফল্ট, ইংরেজি ঐচ্ছিক। কোনো লাইব্রেরি নেই |
| Styling | Inline `style` + theme tokens (`src/constants/tokens.ts`, `typography.ts`) — NativeWind/Tailwind নেই |
| Font | **Hind Siliguri** (`@expo-google-fonts/hind-siliguri`) — `Text` wrapper `fontWeight` দেখে face বাছে |
| State | **Zustand** (`src/stores/`; data store-এর slice গুলো `src/features/`) |
| HTTP | **axios** |
| Secure tokens | **expo-secure-store** |
| Offline DB | **expo-sqlite** (web-এ localStorage snapshot) |
| PDF | **expo-print** + **expo-sharing** |
| রিমাইন্ডার | **expo-notifications** (শুধু লোকাল; web-এ no-op) |
| Test | Jest + jest-expo |

**এখনো যোগ করা হয়নি (দরকার হলে তখন install করবে):**
- `react-native-mmkv` — app settings/theme/lastSync cache। ⚠️ **Expo Go-তে চলে না; dev build লাগবে।** তাই এটা যোগ করার আগে dev build সেটআপ করতে হবে। ততক্ষণ MMKV-র জায়গায় `expo-secure-store`/SQLite/AsyncStorage দিয়ে কাজ চালানো যায়।

> নতুন native dependency যোগ করলে `npx expo install <pkg>` ব্যবহার করো (SDK-matched version)। JS-only হলে `npm install`।

---

## ▶️ Commands

```bash
npx expo start            # dev server (Expo Go: i/a/w)
npx expo start -c         # cache clear করে start
npm run android | ios | web
npx tsc --noEmit          # টাইপচেক (PR-এর আগে অবশ্যই)
npx expo lint             # lint
npm test                  # unit tests (Jest + jest-expo)
npx expo export -p web    # bundle যাচাই (CI smoke)
```

> Babel/Metro config বা package বদলানোর পর `npx expo start -c` (cache clear)।

---

## 📁 Project Structure

```
src/
  app/                    # Expo Router routes (screens)
    (auth)/               # login, register, forgot-password
    (tabs)/               # index (হোম), transactions (লেনদেন), loans (পাওনা-দেনা), report (রিপোর্ট)
    onboarding.tsx        # প্রথম রান: শুরুর সেভিংস + হিসাব মেলানোর ব্যাখ্যা
    add*.tsx, settings.tsx, categories.tsx, recurring.tsx
    _layout.tsx           # root: fonts, theme, auth gate, toast/dialog host
  components/             # screen-এর অংশ: activity-list, charts, month-switcher, forms/ …
    ui/                   # design system: Text, Button, Card, ListRow, BottomSheet, AmountText …
  features/               # data store-এর slice — প্রতিটি feature-এর state action
    data-state.ts         # store-এর shape (DataState) + input type
    records/              # income/expense/loan-এর shared add/edit/delete/restore
    income/ expense/ loan/
    category/             # ব্যবহারকারীর নিজের খরচ-ক্যাটাগরি / আয়-উৎস
    recurring/            # নিয়মিত লেনদেন (rule) + due হওয়া occurrence-এর catch-up
    balance/              # practical balance + auto-adjust
    summary/              # month-close
    profile/ account/     # profile; init, demo seed, account বদল
    storage/              # SQLite write + push trigger, web snapshot
    sync/                 # pending count
  lib/
    api/                  # axios instance + endpoints + refresh interceptor
    db/                   # SQLite: migrations, repositories, demo seed
    calc/                 # ⭐ pure calculation functions (§A–§F) + month index + recurring — heavily unit-tested
    i18n/                 # ⭐ বাংলা ও ইংরেজি catalogue + ভাষার state (§ভাষা)
    notifications.ts      # লোকাল রিমাইন্ডার schedule (pure plan* ফাংশন unit-tested)
    loan-due.ts           # লোনের ফেরতের তারিখ কত দূরে / পেরিয়ে গেছে কিনা
    activity.ts           # লেনদেন timeline: row, day grouping, search/filter
    money.ts · date.ts · digits.ts
  stores/                 # Zustand: data (slice জোড়া দেয়), session, sync, ui
  hooks/                  # useDashboard, useActivities, useCategorySet, useSyncStatus
  constants/              # tokens, typography, fonts, categories
  providers/              # theme
  test/                   # test factories
```

- `@/*` → `src/*` (tsconfig alias আগে থেকেই সেট)।
- নতুন screen = `src/app/`-এ ফাইল। নতুন data action = মানানসই `src/features/<feature>/` slice-এ; `src/stores/data.ts` শুধু slice জোড়া দেয়, screen গুলো সেখান থেকেই `useDataStore` নেয়।
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

### Loan নিয়ম (Lend + Borrow + আংশিক পরিশোধ)
| direction | অর্থ | Theoretical-এ |
| --- | --- | --- |
| **LENT** (ধার দেওয়া) | পাওনা/asset, cash কমে | **বিয়োগ** |
| **BORROWED** (ধার নেওয়া) | দেনা/liability, cash বাড়ে | **যোগ** |

```
Loan Outstanding = Loan.amount − (সেই loan-এর live LoanPayment গুলোর যোগফল)
Outstanding Lent/Borrowed = ওই direction-এর সব live loan-এর outstanding-এর যোগফল
```
- **নিষ্পত্তি = LoanPayment** (`src/lib/types.ts`)। পুরোটা একবারে ফেরত দেওয়াও একটা payment (বাকিটার সমান), তাই আংশিক আর পূর্ণ — দুটোরই এক ইতিহাস। `settleLoan()` সেই payment-টা বানিয়ে তার id ফেরত দেয় (undo-র জন্য)।
- **Legacy:** এই version-এর আগে settle হওয়া row-তে কোনো payment নেই — সেগুলোর `status='SETTLED'` মানে পুরো amount ফেরত (`paidOnLoan` এটা সামলায়)। নতুন loan-এ `status` আর বদলায় না।
- Outstanding **global running total** — মাসে মাসে আবার গোনা হয় না। বন্ধ হওয়া মাসের জন্য `outstandingLoansAt()` শুধু **ওই সময়ের আগের** payment গুলো ধরে।
- Overpayment-এ outstanding negative হয় না (`paidOnLoan` amount-এ cap করে), কিন্তু cash movement পুরোটাই ধরা হয় — টাকাটা তো সত্যিই নড়েছে।
- BORROWED **income নয়**; repay **expense নয়** — শুধু দায় নিষ্পত্তি।
- **dueDate** (ঐচ্ছিক, ভবিষ্যতের তারিখ হতে পারে) — শুধু UI badge ও রিমাইন্ডারের জন্য; §A–§F-এ কোনো প্রভাব নেই।

### Practical balance-এ loan-এর cash (⚠️ double-count এড়াও)
- `loanCashEvents(loan)` শুধু **দেওয়া/নেওয়ার** movement দেয়। যে টাকা ফেরত আসে সেটা `loanPaymentCashEvents(payment, direction)`-এর — payment নিজের movement নিজে বহন করে।
- `loanCashEvents`-এর `SETTLED` শাখাটা **শুধু legacy** row-এর জন্য (যার payment নেই)। নতুন loan কখনো SETTLED হয় না, তাই দুটো পথ কখনো একসাথে চলে না।
- Loan delete করলে তার payment গুলোও একই `deletedAt` নিয়ে delete হয় (restore ঠিক সেগুলোকেই ফেরায়) — নাহলে payment-এর cash event ঝুলে থেকে ব্যালেন্স drift করত।

---

## 🏷️ Categories (built-in + ব্যবহারকারীর নিজের)

Default ৮টি expense category ও ৫টি income source `src/constants/categories.ts`-এ **fixed** — বদলানো বা মোছা যায় না। এর পাশাপাশি ব্যবহারকারী নিজের category/source যোগ করতে পারে; সেগুলো `Category` record হিসেবে **sync হয়**।

- **Key:** `expense.category` / `income.source`-এ হয় built-in slug (`food`, `salary`) নয়তো custom category-র **`id`**। id কখনো বদলায় না, তাই rename করলেও পুরোনো entry সঠিক category-তেই থাকে।
- **`categorySet(kind, categories)`** (pure, `src/constants/categories.ts`) দেয়: `options` (chips-এ যা দেখাবে — built-in আগে, তারপর live custom), `custom`, `meta(key)` (lookup; না মিললে "অন্যান্য"), `find(key)`, আর `hasLabel()` (duplicate নাম আটকাতে)।
  - **Deleted category resolve হতেই থাকে** — তাই পুরোনো entry নামটা ধরে রাখে; শুধু `options`/`custom` থেকে বাদ যায়।
  - Component-এ `useCategorySet(kind)` (`src/hooks/use-categories.ts`); pure function-এ (`buildActivities`, `buildMonthReportHtml`) store-এর `categories` array পাস করতে হয় — না দিলে custom entry গুলো "অন্যান্য" দেখাবে।
- **Icon:** `CATEGORY_ICON_CHOICES`-এর curated grid থেকে বাছা হয় — প্রতিটি Ionicons নামের সাথে PDF report-এর জন্য মিল রাখা emoji (`emojiForIcon`)।
- **UI:** add/edit sheet `src/components/category-sheet.tsx`; খরচ/আয় form-এর chips-এ "+ নতুন" chip (`ChipSelect`-এর `onAdd`); ব্যবস্থাপনা screen `src/app/categories.tsx` (Settings → ক্যাটাগরি)।
  - ⚠️ BottomSheet-এর **ভেতর থেকে `confirmDialog` খুলবে না** — root-এর `DialogHost` sheet-এর নিচে render হয়। আগে sheet বন্ধ করে তারপর confirm করো (category delete এভাবেই করা)।
- **হিসাবে কোনো প্রভাব নেই** (§A–§F অপরিবর্তিত) — category শুধু label।

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
- Synced: income, expense, loan, **loan_payment**, **recurring**, category, monthly_summary, practical_balance।
- **Push:** `syncStatus='PENDING'` রেকর্ডগুলো `POST /sync/push`-এ পাঠাও → success হলে `SYNCED`, fail হলে `FAILED`।
- **Pull:** `GET /sync/pull?since=<cursor>` → cursor-এর পরে server যে রেকর্ড লিখেছে (নতুন/updated/deleted) → **Last-Write-Wins** (`updatedAt` দিয়ে) SQLite-এ merge → cursor = response-এর `serverTime` (meta `lastSyncTime`)।
  - Cursor server-এর ঘড়িতে: server প্রতিটি write-এ `serverUpdatedAt` বসায় আর pull সেটা দিয়ে filter করে (৬০ সেকেন্ড overlap সহ)। তাই অন্য device offline-এ edit করে পরে push করলেও মিস হয় না।
  - Merge: local রেকর্ডে push-না-হওয়া change থাকলে আর সেটা server copy-র সমান বা নতুন হলে local-টাই থাকে (`shouldApplyIncoming`, `src/lib/records.ts`)।
- Push সফল হলে শুধু সেই row `SYNCED` হয় যার `updatedAt` পাঠানো version-এর সমান — push চলার সময় edit হলে row `PENDING` থাকে।
- LWW caveat: winner এখনো client `updatedAt` দিয়ে ঠিক হয়, তাই device-এর ঘড়ি ভুল হলে ভুল winner সম্ভব; single-user app-এ ঝুঁকি কম।

---

## 🧱 Local Data Model (SQLite — backend Prisma mirror)

সব amount integer paisa। তারিখ ISO string।

> **Schema বদলাতে:** `src/lib/db/migrations.ts`-এ `MIGRATIONS`-এর শেষে নতুন step যোগ করো — app open-এ `PRAGMA user_version` দেখে বাকি step গুলো transaction-এ চলে। Release হওয়া step কখনো edit কোরো না, নাহলে পুরোনো ফোনের DB আর update হবে না।

- **income**: `id, amount, source, date, note, isDeleted, deletedAt, syncStatus, createdAt, updatedAt`
- **expense**: `id, amount, category, date, description, isDeleted, deletedAt, syncStatus, createdAt, updatedAt`
- **category**: `id, kind('EXPENSE'|'INCOME'), label, icon, iconName, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` — ব্যবহারকারীর নিজের খরচ-ক্যাটাগরি / আয়-উৎস। `expense.category` ও `income.source`-এ এই row-এর `id` বসে।
- **loan**: `id, direction('LENT'|'BORROWED'), personName, amount, date, note, status('ACTIVE'|'SETTLED'), settledDate, dueDate, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` — `status/settledDate` **legacy** (§Loan নিয়ম), `dueDate` ঐচ্ছিক ও ভবিষ্যতের তারিখ হতে পারে
- **loan_payment**: `id, loanId, amount, date, note, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` — একটা loan-এর ফেরত আসা টাকা (আংশিক বা পুরোটা)। `loanId`-তে foreign key নেই: sync-এ payment তার loan-এর আগেও পৌঁছাতে পারে।
- **recurring**: `id, kind('EXPENSE'|'INCOME'), amount, category, note, frequency('DAILY'|'WEEKLY'|'MONTHLY'), anchor, startDate, lastRunDay, isPaused, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` — নিয়মিত লেনদেনের **template** (§Recurring)
- **monthly_summary**: `id, year, month, openingBalance, totalIncome, totalDailyExpense, outstandingLent, outstandingBorrowed, untrackedExpense, monthlySaving, closingBalance, practicalBalance, isDeleted, deletedAt, syncStatus, createdAt, updatedAt` (unique: `year+month`)
- **practical_balance**: `monthKey, cash, bank, mfs, amount, countedAt, updatedAt, syncStatus` — প্রতি মাসে একটি। Server-এ `PracticalBalance` (userId + monthKey) হিসেবে sync হয়; month-close-এ `amount` `monthly_summary.practicalBalance`-এ যায়।
  - **Auto-adjust** (`src/lib/calc/practical.ts`): entry add/edit/delete/settle হলে practical শুধু তখনই বদলায় যখন টাকার movement `countedAt`-এর পরে হয়েছে — আগের দিনের movement গোনা টাকার ভেতরেই আছে; একই দিনে entry কখন লেখা হয়েছে সেটা দেখা হয়। তাই আগের তারিখের ভুলে-যাওয়া খরচ লিখলে untracked কমে। Loan settle-এর টাকা settle-এর মাসে ফেরে।
- **meta/kv** (sync হয় না — ডিভাইসের নিজের): `lastSyncTime`, `lastSyncedAt`, `profile`, `ownerEmail`, `onboardingDone`, `reminders` (রিমাইন্ডার সেটিংস JSON), `themeMode`, `language`, শেষ ব্যবহৃত category/source।

Profile/settings (server): `openingSavings` (paisa), `currency`, `timezone`, `name`, `email`।

---

## 🔌 Backend API (base: `EXPO_PUBLIC_API_URL` + `/api`)

> Local dev: backend চলে `http://localhost:3000/api`। **ফোন/এমুলেটরে `localhost` কাজ করবে না** — মেশিনের LAN IP (যেমন `http://192.168.x.x:3000/api`) বা tunnel ব্যবহার করো। `app.json` বা `.env`-এ `EXPO_PUBLIC_API_URL` রাখো।
> Auth লাগে এমন সব route-এ header: `Authorization: Bearer <accessToken>`। amount সব paisa (number)।

**Auth (public):** `POST /auth/register` `{email,password,name?,openingSavings?}` · `POST /auth/login` · `POST /auth/refresh` `{refreshToken}` · `POST /auth/logout` · `POST /auth/forgot-password` `{email}` (৬ সংখ্যার কোড email হয়) · `POST /auth/verify-reset-code` `{email,code}` → `{resetToken}` · `POST /auth/reset-password` `{token: resetToken, password}`
**Users:** `GET /users/me` · `PATCH /users/me` `{name?}` · `PATCH /users/me/settings` `{currency?,timezone?,openingSavings?}`
**Sync:** `POST /sync/push` `{incomes?,expenses?,loans?,monthlySummaries?,practicalBalances?}` · `GET /sync/pull?since=<serverTime>`
**Health:** `GET /health`

> Income/expense/loan-এর আলাদা REST আর `/summary/*` backend থেকে সরানো হয়েছে — record শুধু sync দিয়ে যায়, সব হিসাব client-এ।

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

- **SQLite** = সব persistent ডেটার source of truth (income/expense/loan/summary/practical balance)।
- **`useDataStore` (Zustand)** = SQLite-এর in-memory copy যা UI পড়ে; প্রতিটি লেখা store + SQLite-এ PENDING হয়ে যায়, তারপর push (`src/features/storage/persist.ts`)।
- **Zustand** = session (auth), sync status (`syncing/lastSyncedAt`), ক্ষণস্থায়ী UI state (toast, dialog)।
- **SecureStore** = tokens। **SQLite `meta` table** = lastSyncTime, profile, শেষ ব্যবহৃত category/source।

---

## 📅 Monthly Closing (Catch-up) — Modification #8 & #11

- কোনো cron নেই — **App খোলার সময়** catch-up check চালাও।
- `lastClosedMonth` দেখে, পেরিয়ে যাওয়া প্রতিটি মাস একে একে close করো:
  - সেই মাসের Monthly Summary, Monthly Saving (§D), Closing Balance (§E) গণনা করো।
  - local `monthly_summary`-তে save করো এবং backend-এ push করো (`PUT /summary/monthly` বা sync push) — তাহলে History-তে per-month untracked দেখা যাবে।
- **Idempotent** হতে হবে (একই মাস দুবার close হবে না — unique year+month)।
- **Backdated edit → recompute (§11):** closed মাসে backdated income/expense add/edit/delete হলে **সেই মাস + পরের সব মাস recompute** করো (carry-forward chain ভেঙে যায়)। Recompute idempotent।
- **বাস্তবায়ন** — `closeMonths()` (`src/features/summary/month-close.ts`), chain: `closedMonthChain()` (`src/lib/calc`):
  - `lastClosedMonth` রাখা হয় না। প্রতিবার প্রথম record-এর মাস থেকে চলতি মাসের আগের মাস পর্যন্ত **পুরো chain** নতুন করে গণনা হয়; শুধু যে মাসের figure বদলেছে সেটাই `PENDING` হয়ে save + push হয়। Catch-up, backdated recompute আর idempotency — তিনটাই এই এক পথে।
  - Trigger: store subscription — app open (`ready`), income/expense/loan/practical/openingSavings বদলালে (sync pull সহ), আর app foreground-এ এলে।
  - Closed মাসের Outstanding Lent/Borrowed = **সেই মাসের শেষে** যা বাকি ছিল (`outstandingLoansAt`) — পরে loan settle হলেও পুরোনো মাসের summary বদলায় না।
  - Local `practical_balance` না থাকলে stored summary-র `practicalBalance` ধরা হয় (অন্য device-এ close হওয়া মাস)।
  - Closed মাসের dashboard/report stored summary থেকে দেখায় — তাই ক্লোজিং সবসময় পরের মাসের ওপেনিং-এর সমান।
  - Demo account (`__demo__`) skip — এর seed history fixed।

---

## 🌐 ভাষা (i18n) — বাংলা ডিফল্ট, ইংরেজি ঐচ্ছিক

সব লেখা `src/lib/i18n/`-এর দুটো catalogue-এ: `bn.ts` (উৎস, ডিফল্ট) আর `en.ts`। `Strings = typeof bn`, আর `en` সেই type-এ — তাই **বাংলায় key যোগ করে ইংরেজিতে ভুলে গেলে সেটা compile error**, রানটাইম বাগ নয়।

- **ভাষা ডিভাইসের, অ্যাকাউন্টের নয়** — theme ও reminder-এর মতো local `meta` টেবিলে (`language`), কখনো sync হয় না। ফোনটা কোন ভাষায় পড়া হবে সেটা ওই ফোনের ব্যাপার।
- **Component-এ** `const t = useStrings()` → `t.home.greeting`। এটি `useSyncExternalStore`-এ বসা, তাই ভাষা বদলালেই re-render — অ্যাপ রিস্টার্ট লাগে না।
- **Pure ফাংশনে** `strings()` (মডিউল-স্তরের পাঠ) বা explicit `lang` প্যারামিটার। `buildActivities`, `categorySet`, `dayLabel` শেষ আর্গুমেন্ট হিসেবে `lang` নেয় (default `getLanguage()`) — এতে hook-এর dependency আসল হয় আর প্রতি ভাষায় unit test করা যায়।
- ⚠️ **ভাষা-নির্ভর আউটপুট memo করলে dependency-তে `lang` রাখো** (`useCategorySet`, `useActivities`) — নইলে সুইচের পর পুরোনো ভাষার লেখা ঝুলে থাকবে।
- ⚠️ **Module scope-এ catalogue পড়বে না** (`const OPTIONS = [{ label: t.x }]`) — মডিউল একবারই চলে, ভাষা পরে বদলায়। Component-এর ভেতরে বানাও।
- **বাক্যের মাঝে styling** থাকলে catalogue-ও একইভাবে ভাগ করো (prefix / জোর দেওয়া অংশ / suffix) — শব্দক্রম ভাষাভেদে আলাদা (`todaySpend.trend*`, `loansScreen.borrowed*`)।
- **অনুবাদ হয় না:** ব্যবহারকারীর নিজের লেখা — নোট, বিবরণ, ব্যক্তির নাম, নিজের বানানো category। **অনুবাদ হয়:** built-in category (`src/constants/categories.ts`-এ `bn`/`en` জোড়া, key অপরিবর্তিত), PDF রিপোর্ট, লোকাল নোটিফিকেশন, ডেমো seed।
- **Search দুই ভাষাতেই** — `CategoryOption.searchTerms`-এ দুটো নামই থাকে, তাই UI ইংরেজি হলেও "খাবার" লিখে খুঁজে পাওয়া যায়।
- **সংখ্যা** `localDigits` দিয়েই যায় (`DIGIT_STYLE = 'latin'`) — দুই ভাষাতেই একই, ৳ও বদলায় না।
- **Web:** `+html.tsx`-এর `<html lang>` স্ট্যাটিক প্রি-রেন্ডারের ডিফল্ট; ক্লায়েন্টে `src/lib/i18n` সেটা ঠিক করে দেয়, আর `PageTitle` document-এর নামও নিজে বসায় (প্রি-রেন্ডার করা `<title>` cold load-এ রয়ে যেত)।

---

## 🖼️ UI / Theme

- **Inline `style`** + `useTheme()`-এর `tokens` (`src/constants/tokens.ts`) — light/dark runtime-এ বদলায়। NativeWind/`className` নেই।
- **Text** সবসময় `@/components/ui/text` থেকে (ESLint rule) — `fontWeight` দেখে Hind Siliguri-র সঠিক face বসায়। Pressable React Native-এরটাই; function style (`({ pressed }) => …`) চলে।
- Amount দেখাতে `AmountText`/`formatTaka` (consistent `৳` format, paisa→display)।
- **Font size শুধু `textSize` scale থেকে** (`src/constants/typography.ts`: xs 12 · sm 13 · md 14 · lg 16 · xl 20 · display 32)। নতুন সংখ্যা বসাবে না; `AmountText size` এই key নেয়।
- **Reusable:** নিচ থেকে ওঠা sheet = `BottomSheet`; icon + title/subtitle + trailing সারি = `ListRow` (একসাথে `ListGroup`-এ); মাস বদল = `MonthSwitcher`; chart = `components/charts.tsx` (plain `View` bar, library নেই)।
- ⌨️ **কীবোর্ড:** Android SDK 54+ থেকে edge-to-edge, আর edge-to-edge-এ `adjustResize` আর উইন্ডো ছোট করে না — তাই `KeyboardAvoidingView` দিয়ে কিছু হয় না, নিচের ফিল্ড কীবোর্ডের পেছনে চলে যায়। এর সমাধান দুটো জায়গায়:
  - স্ক্রিনে text input থাকলে ScrollView-এর বদলে **`KeyboardScrollView`** (`src/components/ui/keyboard-scroll-view.tsx`) — ModalShell ও AuthShell এটাই ব্যবহার করে। এটা কীবোর্ড যতটুকু ঢাকছে ততটুকু scroll করার জায়গা যোগ করে আর ফোকাস করা ফিল্ডটাকে উপরে নিয়ে আসে (iOS-এ `automaticallyAdjustKeyboardInsets`)।
  - `BottomSheet` `useKeyboardOverlap()` দিয়ে নিজেই উপরে ওঠে।
  - নতুন কোনো TextInput বানালে তার `onFocus`-এ `useScrollFocusedIntoView()?.()` ডাকো — কীবোর্ড আগে থেকে খোলা থাকলে শুধু ফোকাস বদলের খবরেই scroll করতে হয় (`Field`/`AmountInput` এভাবেই করা)।
  - ⚠️ কীবোর্ডের উচ্চতা সরাসরি না ধরে **কতটুকু ঢাকছে তা মেপে** নেওয়া হয় — যেখানে উইন্ডো সত্যিই resize হয় সেখানে মাপটা ০ আসে, তাই কোথাও দুইবার সরে না।
- ⚠️ **`ListRow`-এর `trailing`-এ আর একটা Pressable/Button বসাবে না** — web-এ `<button>`-এর ভেতর `<button>` invalid (hydration error)। পাশে আলাদা control দরকার হলে সারিটা একটা row `View`-তে মুড়ে ListRow-এর বাইরে বসাও (`src/app/recurring.tsx`-এর `RuleRow` দেখো)।
- **Tabs:** হোম · লেনদেন · ＋ · পাওনা-দেনা (`loans`) · রিপোর্ট। Practical balance ইনপুট ("হিসাব মেলানো") আলাদা tab নয় — Home-এর untracked card থেকে `PracticalBalanceSheet` খোলে। দিন অনুযায়ী লেনদেন তালিকা + search/filter লেনদেন tab-এ (`src/lib/activity.ts`)।
- **লম্বা list virtualized:** পুরো screen জুড়ে list হলে `<Screen scroll={false} padded={false}>` + `SectionList`/`FlatList` (`contentContainerStyle={screenListContentStyle}`)। ছোট, সীমিত list (Home-এর ৮টা entry, মাসের তালিকা) ScrollView-এ থাকতে পারে।

---

## ✅ Screens / Features (spec থেকে — যা বানাতে হবে)

- **Auth:** Login, Register, Forgot/Reset Password।
- **Dashboard:** Current Balance, Opening Savings, চলতি মাসের Income/Expense, Outstanding Lent (পাওনা), Outstanding Borrowed (দেনা), Untracked Expense, চলতি মাসের Saving, Net Worth (optional) — সব **local calc** থেকে।
- **Income:** add/edit/delete (soft), history, backdated date।
- **Expense:** add/edit/delete (soft), categories (Food, Transport, Shopping, Medical, Education, Entertainment, Utilities, Others + ব্যবহারকারীর নিজের), backdated।
- **Loan:** add (LENT/BORROWED), settle (Return/Repay), list with direction/status filter।
- **Practical Balance:** যেকোনো সময় current balance ইনপুট → untracked auto-calc।
- **History:** previous months summary (income/expense/untracked/saving + opening/closing), income/expense/loan/saving history।
- **PDF Report:** client-side (expo-print), মাসিক report (বাংলা font embed)।
- **Categories:** নিজের খরচ-ক্যাটাগরি ও আয়-উৎস যোগ/এডিট/ডিলিট (নিচের §Categories)।
- **Onboarding:** প্রথম রানে ৩ ধাপ (নিচের §Onboarding)।
- **Recurring:** নিয়মিত আয়/খরচ (নিচের §Recurring)।
- **Reminders:** দৈনিক “আজকের খরচ লিখেছেন?” ও লোনের ফেরতের তারিখ (নিচের §Reminders)।
- **Settings:** opening savings, currency, timezone, **ভাষা (বাংলা/English)**, theme, sync status, রিমাইন্ডার, logout।

---

## 🔁 Recurring — নিয়মিত লেনদেন

বাসা ভাড়া, বেতন, ইন্টারনেট বিল — যা প্রতিবার একই। Rule একটা **template**, টাকা নয়।

- **Occurrence → সাধারণ entry।** Rule due হলে একটা সাধারণ `income`/`expense` লেখা হয়; এর পরের সব হিসাব (§A–§F, month-close, report) আলাদা করে কিছু জানে না। Rule নিজে কোনো cash movement করে না (`cashEvents: () => []`)।
- **Catch-up, cron নয়** — month-close-এর মতোই app open ও foreground-এ চলে (`runRecurring()`, `src/app/_layout.tsx`-এর `catchUpRecurring`)। `lastRunDay` থেকে আজ পর্যন্ত যা বাদ পড়েছে সব লেখা হয়, সর্বোচ্চ `MAX_CATCH_UP` (৬০) টা।
- **Idempotent — id দিয়ে।** প্রতিটা occurrence-এর id `uuidFrom('recurring:<ruleId>:<day>')` — deterministic, তাই দুই ডিভাইস একই occurrence লিখলে sync-এ **একটাই row** হয়। যে entry আগে থেকেই আছে (ব্যবহারকারীর মুছে দেওয়া tombstone সহ) সেটা আর লেখা হয় না। ⚠️ এর জন্যই `addIncome/addExpense`-এ ঐচ্ছিক `id` আছে — অন্য কোথাও ব্যবহার কোরো না।
- MONTHLY-তে `anchor` = মাসের তারিখ (৩১ দিলে ছোট মাসে শেষ দিনে), WEEKLY-তে weekday (০ = রবিবার), DAILY-তে অব্যবহৃত।
- Pause (`isPaused`) rule-টা রেখে দেয়, শুধু generate বন্ধ করে। Rule delete করলে আগের entry গুলো থেকে যায়।
- Pure অংশ `src/lib/calc/recurring.ts` (`dueOccurrences`, `occurrenceId`, `frequencyLabel`) — unit-tested।

---

## 🚀 Onboarding (প্রথম রান)

`src/app/onboarding.tsx` — ৩ ধাপ: অ্যাপ কী করে → **এখন হাতে মোট কত আছে** → আনট্র্যাকড খরচ কীভাবে ধরা পড়ে (ব্যবহারকারীর নিজের অঙ্ক দিয়ে উদাহরণ)।

- ধাপ ২ একই সাথে `openingSavings` **আর** চলতি মাসের practical balance বসায় → প্রথম দিনেই untracked = 0, হিসাব মিলে শুরু হয়।
- `onboardingDone` meta-তে থাকে (sync হয় না)। Gate `src/app/_layout.tsx`-এ: authenticated + data ready + `!onboardingDone` → `/onboarding`।
- ⚠️ **পুরোনো ব্যবহারকারীকে আবার onboarding দেখানো যাবে না।** `init()`-এ `hasStarted()` — কোনো entry বা `openingSavings > 0` থাকলেই done ধরা হয়, flag না থাকলেও। Demo seed-ও done।

---

## 🔔 Reminders (লোকাল নোটিফিকেশন)

`src/lib/notifications.ts` — সব লোকাল, সার্ভার লাগে না।

- **দৈনিক:** “আজকের খরচ লিখেছেন?” — আগামী ৭ দিনের জন্য আলাদা আলাদা DATE trigger। **আজকের দিনটা বাদ যায় যদি আজ কোনো খরচ লেখা হয়ে থাকে** (অপ্রয়োজনীয় নোটিফিকেশনই মানুষকে নোটিফিকেশন বন্ধ করায়)।
- **লোন:** যে লোনের `dueDate` আজ বা পরে আর এখনো বাকি আছে, সেই দিন সকাল ১০টায়।
- **Reschedule মানে সব মুছে নতুন করে** (`cancelAllScheduledNotificationsAsync` → schedule) — তাই idempotent। `useReminders()` hook (`src/hooks/use-reminders.ts`) settings, “আজ কিছু লেখা হয়েছে কিনা” আর due-date signature বদলালে চালায়।
- ⚠️ **`expo-notifications` কখনো ফাইলের উপরে import কোরো না।** Android Expo Go-তে (SDK 53+) এর push-token auto-registration **module scope-এ throw করে** — পরের কোনো try/catch সেটা ধরতে পারে না, আর root layout এটা import করায় **পুরো অ্যাপ ক্র্যাশ** করত। তাই `notifications()`-এর ভেতরে **lazy `require`**, একবার চেষ্টা করে ফল মনে রাখে।
- ⚠️ **Expo Go-তে require-টাও করা হয় না** — `isRunningInExpoGo()` (`expo` থেকে) দিয়ে আগেই বাদ। চেষ্টা করে ধরলে ক্র্যাশ হয় না ঠিকই, কিন্তু লাল error log-টা তবুও আসে; একমাত্র চুপচাপ পথ হলো চেষ্টাই না করা।
- `notificationsAvailable()` বলে এখানে আদৌ schedule করা যাবে কিনা (web ও Android Expo Go-তে false); সেটিংস স্ক্রিন তখন "ডেভেলপমেন্ট বিল্ড লাগবে" লেখা দেখায়। কোনো রিমাইন্ডার চালু না থাকলে `rescheduleReminders` native module ছোঁয়ও না।
- permission না দিলে চুপচাপ ০টা schedule হয় — কোনো crash নেই। ⚠️ আসল নোটিফিকেশন যাচাই করতে **dev build** লাগবে।
- সেটিংস meta-তে (`reminders`), sync হয় না — কোন ফোনে কী নোটিফিকেশন চাই সেটা ওই ফোনের ব্যাপার। Store: `src/stores/reminders.ts`।
- Pure plan ফাংশন (`planDailyReminders`, `planLoanReminders`) unit-tested; schedule করার অংশটা নয়।

---

## 🧪 Conventions / Definition of Done

- নতুন কোডের আগে **এই ফাইল + প্রয়োজনে `../FinTrack-Backend/CLAUDE.md`** পড়ো; formula spec বদলালে দুই CLAUDE.md-তেই লেখো।
- `src/lib/calc/` ফাংশনগুলোর **unit test** লেখো (§A–§F edge case সহ: untracked negative, no practical, loan settle, carry-forward chain)। Test থাকে কোডের পাশে `__tests__/`-এ; record builder `src/test/factories.ts`-এ।
- PR/commit-এর আগে: `npx tsc --noEmit` clean + `npx expo lint` + `npm test`।
- কোনো আর্থিক হিসাব float-এ কোরো না; কোনো hard delete কোরো না; কোনো token plain storage-এ রেখো না।
- Store-এর record array কখনো mutate কোরো না, সবসময় নতুন array — `src/lib/calc/month-index.ts` array ধরেই মাসের index cache করে; mutate করলে পুরোনো হিসাব দেখাবে।
- **কোনো ব্যবহারকারী-দৃশ্যমান স্ট্রিং সরাসরি কোডে লিখবে না** — দুটো catalogue-এ যোগ করো (§ভাষা)।
- নতুন native module → `npx expo install`; Expo Go-তে না চললে dev build দরকার (README/AGENTS দেখো)।
