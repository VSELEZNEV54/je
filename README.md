# Jump Evolution — сайт экшен-шоу

Прототип нового сайта [jumpevolution.ru](https://jumpevolution.ru): паркур, акробатика, танец и свет для событий. Статический фронт без бэкенда, форма заявки — заглушка.

## Структура

- `index.html` — главная
- `uslugi.html` — все форматы шоу
- `shou/parkur-shou.html`, `shou/tancevalnoe-shou.html` — посадочные страницы форматов
- `404.html` — страница ошибки (пути абсолютные, от корня домена)
- `assets/css/style.css` — дизайн-система, `assets/js/main.js` — поведение, `assets/js/vendor/` — GSAP, ScrollTrigger, Lenis
- `assets/video/` — фоновые петли из роликов клиента (`*-m.mp4` — лёгкие версии для телефонов, подменяются скриптом)

## Запуск локально

Нужен любой статический сервер с поддержкой HTTP Range (для видео в Safari), например:

```bash
npx serve .
```
