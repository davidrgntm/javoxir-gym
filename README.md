# Javoxir Gym — Telegram Mini App

Mashg'ulot rejasi, tarix, ovqat, vazn va AI murabbiy (tarozi rasmi, tana rasmi, ovqat rasmi, savollar).

- `public/` — ilova sahifasi va mashq fotolari
- `api/ai.js` — AI so'rovlari (API kalit faqat serverda turadi)
- `api/send.js`, `api/file.js` — progress fotolar va CSV bot chatida saqlanadi
- Ma'lumotlar Telegram CloudStorage'da (bot bo'yicha, faqat sizga ko'rinadi)

## Vercel sozlamalari (Environment Variables)

| Nomi | Qiymati |
|---|---|
| `BOT_TOKEN` | @BotFather bergan token |
| `AI_API_KEY` | AI kalitingiz (Claude `sk-ant-…`, OpenAI `sk-…` yoki Gemini `AIza…` — turi o'zi aniqlanadi) |
| `ALLOWED_IDS` | Telegram ID'ingiz (bir nechta bo'lsa vergul bilan) |

Ixtiyoriy: `AI_MODEL_FAST`, `AI_MODEL_SMART` (model nomi), `AI_PRICE_IN`, `AI_PRICE_OUT` (narxi noma'lum model uchun, $ / 1M token).

Standart modellar: Claude — `claude-haiku-5-5` (tarozi, ovqat, savol) va `claude-sonnet-5-5` (tana tahlili); OpenAI — `gpt-5.4-mini`; Gemini — `gemini-3.5-flash`.

## O'zgartirish

`src/` dagi fayllarni tahrirlab, `node build.mjs` — `public/index.html` qayta yig'iladi.
