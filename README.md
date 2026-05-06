# BassThermal Cloudflare Worker (Static Assets + Visits Telemetry)

## Local setup

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Visits telemetry (Level 1)

- D1 database used: `bassthermal_visits`
- Database ID: `6bfc14be-bcae-45d2-a56c-a01e7bf1c80e`
- Tables are auto-created by the Worker on first visit.
- Deploy.
- Type `/visits`.
