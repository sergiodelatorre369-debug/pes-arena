# PES ARENA — Fase 1

Aplicación web real (no un artifact de Claude) para conectar jugadores de PES PPSSPP Online.
Backend con Node + Express + Socket.IO. Frontend con React + Vite + Tailwind.

## Qué incluye esta Fase 1

- Modo invitado: sin cuenta, sin base de datos.
- Partida rápida (emparejamiento automático) y Elegir rival (lista en tiempo real).
- Sala de conexión: compartir IP de ZeroTier, botones rápidos y chat, todo en tiempo real vía WebSockets.
- Contador de jugadores en línea.

## Qué falta (Fase 2 y 3, no incluido todavía)

- Cuentas registradas, base de datos (Postgres), historial y ranking.
- Torneos (Liga y Copa).
- Agente de IA que lee capturas de resultado.

Esta Fase 1 ya está construida para crecer hacia eso: el backend está separado del frontend,
y se puede agregar una base de datos y autenticación sin tocar la lógica de matchmaking.

## Estructura

```
pes-arena/
  backend/     Servidor Node + Socket.IO (matchmaking y salas)
  frontend/    App React + Vite (interfaz)
```

## Correrlo en tu computadora

Necesitas Node.js 18 o más nuevo instalado.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Debe quedar corriendo en `http://localhost:3001`. Puedes revisar `http://localhost:3001/health`
para ver cuántos jugadores hay en cola.

### 2. Frontend

En otra terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abre `http://localhost:5173` — ahí ya puedes buscar partida. Abre dos pestañas (o compártelo
con un amigo en la misma red) para probar el emparejamiento real.

## Desplegarlo en internet (para que cualquiera lo use, no solo tú)

### Backend → Railway o Render

1. Sube esta carpeta a un repositorio de GitHub.
2. En Railway o Render, crea un nuevo servicio apuntando a la carpeta `backend/`.
3. Comando de build: `npm install`. Comando de arranque: `npm start`.
4. Define la variable de entorno `CLIENT_URL` con la URL de tu frontend ya desplegado
   (ej. `https://pesarena.vercel.app`). Sin esto, el navegador bloqueará la conexión por CORS.
5. Copia la URL pública que te da el servicio (ej. `https://pesarena-backend.up.railway.app`).

Nota: el backend necesita quedarse corriendo todo el tiempo (WebSockets), así que un hosting
serverless como Vercel Functions no sirve para esta parte — por eso Railway/Render/Fly.io.

### Frontend → Vercel o Netlify

1. Conecta el mismo repositorio, apuntando a la carpeta `frontend/`.
2. Comando de build: `npm run build`. Carpeta de salida: `dist`.
3. Define la variable de entorno `VITE_SERVER_URL` con la URL de tu backend ya desplegado.
4. Despliega. Te dan una URL pública (ej. `https://pesarena.vercel.app`) que puedes mandar
   directo al grupo de WhatsApp de la comunidad — nadie necesita cuenta de nada para usarla.

### Orden recomendado

Despliega primero el backend (para tener su URL), luego el frontend con `VITE_SERVER_URL`
apuntando a esa URL, y al final regresa al backend a poner `CLIENT_URL` con la URL final
del frontend.

## Limitaciones conocidas de esta Fase 1

- El estado (cola y salas) vive en memoria del servidor. Si el backend se reinicia, se pierde
  la cola actual (nadie pierde su cuenta porque todavía no hay cuentas).
- Si algún día despliegas más de una instancia del backend para soportar más tráfico, vas a
  necesitar mover ese estado a Redis — con una sola instancia funciona perfecto.
- No hay protección contra spam o abuso todavía (rate limiting, moderación de chat). Para un
  grupo cerrado de comunidad está bien; para algo más público conviene agregarlo antes.
