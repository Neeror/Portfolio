КОЛІЯ · лендінг шиномонтажу
================================

Структура
  index.html   розмітка (без <style> і без inline-скриптів)
  style.css    усі стилі
  script.js    уся логіка: 3D-колесо на canvas, інтро, скрол-анімація, акордеон, ціни, галерея, форма
  img/         фото і favicon

Фото
  Шляхи до фото вже прописані в index.html (img/...).
  1) Windows: двічі клацніть download-images.bat
     macOS / Linux: bash download-images.sh
     Скрипт завантажить 8 фото в папку img.
  2) Поки фото не завантажені, сайт сам підтягне їх з інтернету (атрибут data-fallback), тому нічого не зламається.

Джерела (безкоштовна ліцензія Unsplash / Pexels):
- img/tread-dark.jpg  ←  https://images.unsplash.com/photo-1753030148904-16130157a3e5?auto=format&fit=crop&w=2000&q=80
- img/garage-tire.jpg  ←  https://images.unsplash.com/photo-1645445522156-9ac06bc7a767?auto=format&fit=crop&w=1400&q=80
- img/master-wheel.jpg  ←  https://images.unsplash.com/photo-1687845542154-0063ce9e4fad?auto=format&fit=crop&w=1400&q=80
- img/tread-close.jpg  ←  https://images.unsplash.com/photo-1751601397743-fed8bbfd2965?auto=format&fit=crop&w=1400&q=80
- img/mechanic-detail.jpg  ←  https://images.pexels.com/photos/37809550/pexels-photo-37809550.jpeg?auto=compress&cs=tinysrgb&w=1400
- img/wheel-sport.jpg  ←  https://images.unsplash.com/photo-1699325490806-902b139a6682?auto=format&fit=crop&w=1400&q=80
- img/tire-wrench.jpg  ←  https://images.unsplash.com/photo-1702146713922-613313be011d?auto=format&fit=crop&w=1400&q=80
- img/workshop.jpg  ←  https://images.pexels.com/photos/4116231/pexels-photo-4116231.jpeg?auto=compress&cs=tinysrgb&w=1400

Анімація героя
  Колесо не картинка і не відео: це 3D-модель, яку script.js малює на canvas (шина з протектором, диск,
  спиці, гальмівний диск, супорт, світлове кільце). Інтро: темрява → U-подібне світлове кільце → спалах →
  студійне світло. На скролі колесо розвертається з фронтального виду в бічний, крутиться і показує виноски.
  Кольори, кут і швидкість змінюються в розділі «3. 3D-колесо» та «4. Hero-сцена» у script.js.

Форма
  Зараз відправка симулюється (setTimeout у розділі 10 script.js). Туди підключається бекенд або Telegram-бот.

Шрифти: Unbounded + Onest (Google Fonts, підключені в <head>).
