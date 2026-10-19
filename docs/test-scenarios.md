# ParaBank – Test Scenarios

Source: exploratory session with `playwright-cli` (headed, Chromium) against
https://parabank.parasoft.com/parabank on 2026-10-19. Screenshots are in
[`docs/screenshots/`](screenshots/).

Legend: **P** = positive, **N** = negative / validation, **E** = edge case.
Items marked ⚠️ are behaviours observed during exploration that look like
defects; tests for them should assert the *correct* behaviour and be tagged
(e.g. `@known-issue`) or `test.fail()` so they don't block the suite.

---

## 0. Environment notes (read before automating)

- **The shared demo resets often.** During one ~30 minute session, freshly
  registered users were wiped three times. After a reset, pages for the logged-in user
  return `Error! An internal error has occurred and has been logged.` and
  `GET /services_proxy/bank/customers/{id}` returns 500. Tests must register
  their own user per test (as CLAUDE.md requires) and should not rely on data
  surviving across tests.
- **During a reset, login may resolve to the wrong customer.** Twice, logging in with
  a non-existent user or wrong password went to the
  Accounts Overview of another customer ("John Smith", account 13344). On a
  healthy instance, a wrong password correctly shows
  *"The username and password could not be verified."*
- **Account IDs collide across resets.** Account `18783`, created for a wiped user,
  later showed up in a different user's overview. Brand-new users' default accounts
  have also started at $415.50 / $515.50 instead of $100.00. Balance assertions
  must compare against values read just before the action, never hard-coded totals.
- **Registration inputs have no accessible labels.** The label text sits in a
  sibling `<td>`, so `getByLabel` won't work. Stable hooks are the `id`/`name`
  attributes (`customer.firstName`, `customer.address.street`, `repeatedPassword`, …).
  Bill Pay inputs only have `name` (`payee.name`, `verifyAccount`, `amount`).
  Plan to use `getByRole('row', { name: 'First Name:' }).getByRole('textbox')`
  or a small locator helper in the page objects.
- A REST API is available under `/parabank/services_proxy/bank/...` (e.g.
  `accounts/{id}`, `accounts/{id}/transactions`, `customers/{id}/accounts`).
  It's useful for API tests and for seeding or checking state quickly.
- Server-side failures appear as an HTML page with `Error!`, not as an HTTP error the UI
  handles. Tests should assert that this text is absent after positive flows.

---

## 1. Registration — `register.htm`

Screens: `01-register.png`, `02-register-validation-errors.png`,
`03-register-success.png`, `28-register-duplicate-username.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| R1 | P | Register with all fields valid (unique username) | "Welcome {username}" + "Your account was created successfully. You are now logged in."; left menu shows Account Services |
| R2 | P | Register leaving optional **Phone #** blank | Succeeds (phone is the only optional field) |
| R3 | P | New user gets one default account with $100.00 | Accounts Overview lists 1 account, balance $100.00 |
| R4 | N | Submit empty form | 10 errors: First name / Last name / Address / City / State / Zip Code / Social Security Number / Username / Password are required; "Password confirmation is required." |
| R5 | N | Password ≠ Confirm | "Passwords did not match." User not created |
| R6 | N | Username that already exists | "This username already exists." |
| R7 | N | Each required field blank on its own (data-driven) | Only that field's error is shown |
| R8 | E | Leading or trailing whitespace in the username, very long values, special characters or unicode in the name | No 500; value stored or rejected consistently |
| R9 | E | Non-numeric zip / SSN / phone | Document current behaviour (no format validation seen on SSN; `111` was accepted) |

## 2. Login / Logout — `index.htm`, `login.htm`, `logout.htm`

Screens: `04-login-error.png`, `27-unauthenticated-access.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| L1 | P | Login with valid credentials | Redirect to `overview.htm`, "Welcome {First} {Last}" |
| L2 | P | Log Out | Back on `index.htm` with the Customer Login form; Account Services menu gone |
| L3 | N | Both fields empty | "Please enter a username and password." |
| L4 | N | Valid username + wrong password | "The username and password could not be verified." Stays logged out |
| L5 | N | Unknown username | Same error as L4 (⚠️ during a reset this logged in as another customer, see §0) |
| L6 | N | Open `overview.htm` (or any account page) directly while logged out | Should redirect to login / show a login prompt. ⚠️ Shows a generic "internal error" page instead |
| L7 | N | After logout, browser Back to a protected page | Protected data not shown |
| L8 | E | Username in different case / with surrounding spaces | Document behaviour |

## 3. Accounts Overview — `overview.htm`

Screen: `05-accounts-overview.png`, `08-account-activity.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| AO1 | P | Table shows Account / Balance* / Available Amount for every account + **Total** row | Total = sum of balances |
| AO2 | P | After opening an account, transfer, bill pay or loan, the balances update accordingly | Matches the transaction amounts |
| AO3 | P | Click an account number to open `activity.htm?id={id}` | Account Details (number, type, balance, available) + Account Activity table |
| AO4 | P | Activity filters: Activity Period (All / Jan–Dec) and Type (All / Credit / Debit) | Table is filtered correctly |
| AO5 | P | Click a transaction to see its details | Transaction ID, date, description, type, amount |
| AO6 | N | Open `activity.htm?id=` with another customer's account id | Access denied (IDOR check) |
| AO7 | N | `activity.htm?id=abc` / non-existent id | Handled error, not a stack trace or 500 |
| AO8 | E | Negative balance shown with `-$` and Available shown as `$0.00` | Formatting consistent (seen: `-$175.00` / `$0.00`) |

## 4. Open New Account — `openaccount.htm`

Screens: `06-open-new-account.png`, `07-open-new-account-success.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| OA1 | P | Open **CHECKING** funded from the existing account | "Account Opened!" + "Your new account number: {id}"; the id links to its activity page |
| OA2 | P | Open **SAVINGS** | Same; Account Details shows type SAVINGS |
| OA3 | P | $100.00 minimum is moved from the funding account to the new one | Funding −$100, new account +$100; activity shows "Funds Transfer Received" or "Funds Transfer Sent" |
| OA4 | P | Account type dropdown contains exactly CHECKING, SAVINGS | — |
| OA5 | P | New account appears in the From-account dropdowns on Transfer, Bill Pay, Find Transactions and Loan | — |
| OA6 | N | Funding account balance < $100 | Should be rejected. Verify (the flow currently allows the funding account to go to $0) |
| OA7 | E | Open several accounts in a row | Each gets a unique id; totals stay correct |

## 5. Transfer Funds — `transfer.htm`

Screens: `09-transfer-funds.png`, `10-transfer-empty-amount.png`,
`11-transfer-invalid-amount.png`, `12-transfer-success.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| TF1 | P | Transfer a valid amount between two own accounts | "Transfer Complete! ${amt} has been transferred from account #{from} to account #{to}." Balances update; both activity pages show the entry |
| TF2 | P | Decimal amount with 2 places (e.g. 10.50) | Exact amount transferred |
| TF3 | N | Empty amount | Should show a field validation message. ⚠️ Shows "An internal error has occurred" |
| TF4 | N | Non-numeric amount (`abc`) | Should show a validation message. ⚠️ Shows the internal error |
| TF5 | N | Negative amount (`-5`) | Should be rejected. ⚠️ Accepted: "-$5.00 has been transferred" |
| TF6 | N | Amount > available balance (`99999`) | Should be rejected for insufficient funds. ⚠️ Accepted, so the account goes deeply negative |
| TF7 | N | Same account for From and To | Should be rejected. ⚠️ Accepted |
| TF8 | E | More than 2 decimal places (`1.999`) | ⚠️ Silently rounded to $2.00. Should be rejected or handled explicitly |
| TF9 | E | Zero amount | Should be rejected |
| TF10 | N | Tamper with `fromAccountId` to use another customer's account (API / devtools) | Rejected (authorization) |

## 6. Bill Pay — `billpay.htm`

Screens: `13-bill-pay.png`, `14-bill-pay-validation-errors.png`,
`15-bill-pay-account-mismatch.png`, `16-bill-pay-success.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| BP1 | P | All payee fields valid, Account # = Verify Account #, valid amount | "Bill Payment Complete. Bill Payment to {payee} in the amount of ${amt} from account {id} was successful." |
| BP2 | P | Balance of the From account decreases by the amount; activity shows a Bill Payment debit | Verified on a healthy instance ($100 → $85). An earlier no-op run was caused by a data reset |
| BP3 | N | Submit empty | 9 errors: Payee name / Address / City / State / Zip Code / Phone number / Account number (×2) are required; "The amount cannot be empty." |
| BP4 | N | Account # ≠ Verify Account # | "The account numbers do not match." |
| BP5 | N | Non-numeric Account / Verify | "Please enter a valid number." |
| BP6 | N | Non-numeric amount | "Please enter a valid amount." |
| BP7 | N | Negative or zero amount | Should be rejected (verify) |
| BP8 | N | Amount > balance | Should be rejected for insufficient funds (verify; Transfer allows overdraft) |
| BP9 | N | Each required field blank on its own (data-driven) | Only that field's error is shown |
| BP10 | E | Note: on this page, Phone # is **required** (unlike Registration) | — |

## 7. Find Transactions — `findtrans.htm`

Screens: `17-find-transactions.png`, `18-find-transactions-validation.png`,
`19-find-transactions-results.png`

Four search modes, each with its own **FIND TRANSACTIONS** button
(`#findById`, `#findByDate`, `#findByDateRange`, `#findByAmount`), plus an
account selector (`#accountId`).

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| FT1 | P | Find by a valid Transaction ID | "Transaction Results" table with that one transaction |
| FT2 | P | Find by Date (`MM-DD-YYYY`) with a known transaction date | Matching rows |
| FT3 | P | Find by Date Range covering known transactions | Matching rows |
| FT4 | P | Find by Amount equal to a known transaction amount | Matching rows |
| FT5 | P | Switching the account selector limits the results to that account | — |
| FT6 | N | Empty Transaction ID | "Invalid transaction ID" |
| FT7 | N | Invalid date format (`2026/13/45`) | "Invalid date format" |
| FT8 | N | Empty date range | "Invalid date format" (dateRangeError) |
| FT9 | N | Non-numeric amount (`abc`) | "Invalid amount" |
| FT10 | N | Unknown Transaction ID (`99999999`) | Should show a "no transactions found" message. ⚠️ Shows an empty results table with no message (API returns 404) |
| FT11 | N | Amount with no matching transactions | Should be an empty state. ⚠️ Renders a bogus row "NaN-NaN-NaN undefined" |
| FT12 | E | From date after To date; future dates; leap day `02-29-2028` | Handled gracefully |
| FT13 | N | Transaction ID that belongs to another customer | Not returned (authorization) |

## 8. Update Contact Info — `updateprofile.htm`

Screens: `20-update-contact-info.png`, `21-update-contact-info-validation.png`,
`22-update-contact-info-success.png`

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| UC1 | P | Form is pre-filled with the current profile (first, last, street, city, state, zip, phone) | Values match registration data |
| UC2 | P | Change city and submit | "Profile Updated. Your updated address and phone number have been added to the system." |
| UC3 | P | Reopen the page | Updated values are kept |
| UC4 | P | Clear the phone (optional) and submit | Succeeds; phone saved as empty |
| UC5 | P | Welcome name in the left panel updates after a first or last name change | Verify |
| UC6 | N | Clear all fields and submit | First name / Last name / Address / City / State / Zip Code "is required" (phone has no error) |
| UC7 | N | Each required field blank on its own (data-driven) | Only that field's error is shown |
| UC8 | E | Very long values, script/HTML input (`<script>`) | Stored or escaped safely, with no XSS when the value is shown again |

## 9. Request Loan — `requestloan.htm`

Screens: `23-request-loan.png`, `24-request-loan-approved.png`,
`25-request-loan-denied.png`, `26-request-loan-empty.png`

Fields: Loan Amount (`#amount`), Down Payment (`#downPayment`), From account
(`#fromAccountId`), **Apply Now**.

| # | Type | Scenario | Expected |
|---|------|----------|----------|
| RL1 | P | Small loan that can be afforded (amount 200, down payment 20, balance $100) | "Loan Request Processed". Provider: ParaBank; Date = today; Status: **Approved**; "Your new account number: {id}" |
| RL2 | P | After approval: a new loan account holds the loan amount, and the down payment is taken from the From account | Observed: From $100 → $80, new account $200 |
| RL3 | N | Loan amount too high for the funds (1000/50 or 1000000/10) | Status: **Denied**. "We cannot grant a loan in that amount with your available funds." |
| RL4 | N | Down payment > From-account balance (500/5000) | Status: **Denied**. "You do not have sufficient funds for the given down payment." |
| RL5 | N | Both fields empty | Should show field validation. ⚠️ Shows "An internal error has occurred" |
| RL6 | N | Non-numeric amount (`abc`) | Should show field validation. ⚠️ Shows the internal error |
| RL7 | N | Negative loan amount | Should be rejected by validation (currently "Denied" with the funds message) |
| RL8 | E | Down payment > loan amount; zero values; decimals | Handled consistently |
| RL9 | E | Find the approval threshold (data-driven over amount vs. balance) | Document the rule so tests don't depend on chance |

---

## 10. Cross-cutting scenarios

| # | Type | Scenario |
|---|------|----------|
| X1 | P | End-to-end: register → open account → transfer → bill pay → find the transaction → request loan → totals reconcile on Overview |
| X2 | N | Every protected page (`openaccount`, `overview`, `transfer`, `billpay`, `findtrans`, `updateprofile`, `requestloan`, `activity`) while logged out redirects to login |
| X3 | N | Session isolation: two users in separate browser contexts never see each other's accounts |
| X4 | P | API parity: balances in the UI match `GET services_proxy/bank/accounts/{id}` |
| X5 | P | No page shows `Error! An internal error has occurred` during the positive flows |

## 11. REST API — `/parabank/services/bank`

Send `Accept: application/json`; without it, responses come back as XML. Endpoints are
listed in the WADL at `services/bank?_wadl`. There is **no registration endpoint**, so
API tests register users through the UI and then call `login/{username}/{password}` to
get the customer id.

| # | Type | Scenario | Expected / observed |
|---|------|----------|---------------------|
| API1 | P | `GET login/{u}/{p}` | 200, customer JSON (id, name, address, phone, ssn) |
| API2 | N | Login with a wrong password | 400, text `Invalid username and/or password` |
| API3 | P | `GET customers/{id}/accounts` | 200, `[{id, customerId, type, balance}]` |
| API4 | P | `GET accounts/{id}` | 200, the same object as in the list |
| API5 | N | Unknown account / customer / transaction | 400, text `Could not find account #…`, `…customer #…`, `…transaction #…` |
| API6 | P | `POST transfer?fromAccountId&toAccountId&amount` | 200, **plain text** `Successfully transferred $X from account #A to account #B`, although the header says JSON |
| API7 | N | Transfer to an unknown account | 400, `Could not find account number A and/or B`; no money moves |
| API8 | N | Transfer with a non-numeric amount | 404; a missing amount gives 500 with an HTML error page |
| API9 | P | `POST createAccount?customerId&newAccountType(0=CHECKING,1=SAVINGS)&fromAccountId` | 200; $100 moves to the new account |
| API10 | P | Transactions: list, by id, `/amount/{n}`, `/fromDate/{d}/toDate/{d}`, `/onDate/{d}`, `/month/{All|name}/type/{All|Credit|Debit}` (dates MM-DD-YYYY) | 200, filtered list; `[]` when nothing matches |
| API11 | P | A transfer made in the UI shows up in the API balances and transactions | Covered by `tests/api/ui-transfer-api-balance.spec.ts` |

**API environment notes**
- `cleanDB` and `initializeDB` can be called by anyone without authentication. They
  probably cause the frequent resets described in §0. Tests must never call them.
- Cloudflare rate-limits bursts of API calls with HTTP 429 (error 1015, `retry_after: 30`).
  The API client waits as the server asks, and the `api` project runs on one worker.

## Defect summary (from exploration)

| ID | Area | Observation |
|----|------|-------------|
| D1 | Transfer | Negative amounts accepted |
| D2 | Transfer | Overdraft beyond the balance accepted |
| D3 | Transfer | Same From/To account accepted |
| D4 | Transfer | Empty or non-numeric amount gives a generic internal error instead of field validation |
| D5 | Transfer | Amounts with more than 2 decimals are silently rounded |
| D6 | Loan | Empty or non-numeric inputs give a generic internal error |
| D7 | Find Tx | No-match amount search renders a "NaN-NaN-NaN undefined" row |
| D8 | Find Tx | Unknown ID shows an empty table with no message |
| D9 | Auth | Unauthenticated access to protected pages shows an internal error instead of redirecting |
| D10 | Auth | During resets, any credentials logged into another customer's account (intermittent) |
| D11 | Bill Pay | ~~Success shown but balance unchanged~~. Not reproducible on a healthy instance; it was a data reset |
| D12 | A11y | Registration inputs have no programmatic labels (Bill Pay and other forms likely the same, not yet checked) |
| D13 | API / Security | No authentication: any customer's profile, accounts and transactions can be read, and transfers made, by anonymous callers |
| D14 | API | `createAccount` responds with `balance: 0`, although the new account holds $100 |
| D15 | API | Negative and zero transfer amounts are accepted (D1 at the API level) |
| D16 | API | `transfer` sends plain text with `Content-Type: application/json`; a missing amount gives 500 with HTML instead of 400 |
