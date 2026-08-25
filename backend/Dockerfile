# Dokładny przepis na środowisko panelu.
# Bez tego pliku hosting sam dobiera wersję Node.js i potrafi trafić na taką,
# w której biblioteka bazy danych (better-sqlite3) nie ma gotowej paczki
# i próbuje się kompilować — a wtedy potrzebuje kompilatora C++.
# Tutaj mamy jedno i drugie: sprawdzoną wersję Node i komplet narzędzi.

FROM node:22-bookworm-slim

# python3, make i g++ są potrzebne wyłącznie na czas instalacji better-sqlite3
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Zależności instalujemy przed skopiowaniem reszty — dzięki temu zmiana w kodzie
# nie unieważnia tego kroku i kolejne wdrożenia są szybsze.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Katalog na bazę danych. Na hostingu podmontuj tu wolumen (dysk trwały).
RUN mkdir -p /app/data
ENV NODE_ENV=production \
    DATA_DIR=/app/data

EXPOSE 4000
CMD ["node", "src/server.js"]
