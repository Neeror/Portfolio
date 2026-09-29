# ORVELLE · лендінг годинникового бутика

Структура:
- `index.html` — тільки розмітка (жодних `<style>` і вбудованих `<script>`)
- `css/style.css` — усі стилі
- `js/main.js` — уся логіка й анімації (без бібліотек)
- `images/` — фото, вже підключені в HTML

## Фото
Якщо папка `images/` порожня, запустіть один раз:
- Windows: `download-images.bat` (двічі клікнути)
- macOS / Linux: `bash download-images.sh`

Поки файлів немає, сайт сам підтягує ті самі фото напряму з Pexels (потрібен інтернет).

## Анімації
- Інтро: у темряві загорається люм, стрілки біжать до поточного часу, потім світло відкриває годинник (за мотивом rideradian.com).
- Hero на скролі: наближення до циферблата, поворот, перетворення на картку зі специфікаціями.
- Калібр: закріплений список, фото змінюються шторкою.
- Історія: золота лінія малюється під час скролу.
- Токени руху Material 3 (emphasized decelerate / standard), підтримка prefers-reduced-motion.

## Джерела фото (Pexels, free license)
| Файл | Сторінка |
|---|---|
| images/cta-wrist.jpg | https://www.pexels.com/photo/3656125/ |
| images/feature-crystal.jpg | https://www.pexels.com/photo/30838491/ |
| images/feature-hand.jpg | https://www.pexels.com/photo/8327755/ |
| images/feature-lume.jpg | https://www.pexels.com/photo/15019856/ |
| images/feature-movement.jpg | https://www.pexels.com/photo/209255/ |
| images/feature-reserve.jpg | https://www.pexels.com/photo/8327684/ |
| images/hero-angle.jpg | https://www.pexels.com/photo/34894931/ |
| images/hero-chrono.jpg | https://www.pexels.com/photo/5447382/ |
| images/n-ceremony.jpg | https://www.pexels.com/photo/15671805/ |
| images/n-classique.jpg | https://www.pexels.com/photo/9203637/ |
| images/n-regatta.jpg | https://www.pexels.com/photo/5659200/ |
| images/quote-atelier.jpg | https://www.pexels.com/photo/29268616/ |
| images/reel-1.jpg | https://www.pexels.com/photo/36845965/ |
| images/reel-2.jpg | https://www.pexels.com/photo/25682459/ |
| images/reel-3.jpg | https://www.pexels.com/photo/13703305/ |
| images/timeline-1982.jpg | https://www.pexels.com/photo/8327526/ |
| images/timeline-1994.jpg | https://www.pexels.com/photo/8327876/ |
| images/timeline-2008.jpg | https://www.pexels.com/photo/128206/ |
| images/timeline-2019.jpg | https://www.pexels.com/photo/35017724/ |
| images/w-aurum.jpg | https://www.pexels.com/photo/4235659/ |
| images/w-gem.jpg | https://www.pexels.com/photo/10445217/ |
| images/w-heritage.jpg | https://www.pexels.com/photo/13703305/ |
| images/w-meridian.jpg | https://www.pexels.com/photo/190819/ |
| images/w-nocturne.jpg | https://www.pexels.com/photo/25682459/ |
| images/w-rosee.jpg | https://www.pexels.com/photo/14410757/ |
| images/w-sentinel.jpg | https://www.pexels.com/photo/9305747/ |
