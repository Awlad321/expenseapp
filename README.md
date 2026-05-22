# ExpensApp Mobile

React Native mobile app for ExpensApp, built with Expo and TypeScript.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Axios
- Expo SecureStore
- React Hook Form
- Zod

## Structure

```text
src/
  app/navigation
  app/providers
  app/routes
  services/api
  services/query
  shared/components
  shared/theme
  shared/types
  shared/utils
  features/auth
  features/dashboard
  features/accounts
  features/transactions
  features/transfers
  features/categories
  features/reports
```

Screens implemented:

- Login
- Register
- Dashboard
- Accounts
- Add Account
- Transaction List
- Add Income
- Add Expense
- Transfer List
- Add Transfer
- Reports

## Local Setup

This project requires Node 18 or newer. Node 20 LTS is recommended.

```bash
cd /home/user/Personal/Expensapp/frontend
npm install
npm run typecheck
npm run start
```

For Android Emulator, the default API URL is:

```text
http://10.0.2.2:8080/api
```

Override it with:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api npm run start
```

## Backend Contract

The frontend calls the Spring Boot backend endpoints:

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/accounts`
- `/api/categories`
- `/api/transactions`
- `/api/transactions/income`
- `/api/transactions/expense`
- `/api/transfers`
- `/api/dashboard/summary`

Transfers are shown and submitted separately from income and expense transactions.
