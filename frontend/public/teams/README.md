# Escudos de equipos

Guarda aquí las fotos/escudos de los equipos del Banco de Equipos. No hay
que tocar ningún archivo de código de la app — en cuanto el archivo exista
con el nombre correcto, aparece solo.

## Cuántos equipos hay y cuáles son

Eso se controla en `backend/src/teams.js`:

- `TEAM_COUNT` — cuántos equipos quieres en total (ej. 12, 30, 48).
- `NAMED_TEAMS` — la lista de nombres reales que ya tienes. Si pones menos
  nombres que `TEAM_COUNT`, los espacios que faltan se llenan solos con
  "Equipo 31", "Equipo 32", etc. — para que siempre haya el número exacto
  que pediste, sin que te tengas que preocupar por contarlos.

## Cómo se llama cada archivo de foto

El nombre sale del nombre del equipo, en minúsculas, sin acentos, con
guiones en vez de espacios. Ejemplos:

- "Real Madrid" → `real-madrid.png`
- "México" → `mexico.png`
- "Inter de Milán" → `inter-de-milan.png`
- "Equipo 31" → `equipo-31.png`

## Para sustituir un equipo por otro

1. Abre `backend/src/teams.js` y cambia el nombre en `NAMED_TEAMS` (ej.
   cambia `"Boca Juniors"` por `"Corinthians"`, o rellena un "Equipo 31"
   con el nombre real que quieras).
2. Sube la foto correspondiente aquí con su nombre exacto (`corinthians.png`).
3. Sube los dos cambios (backend y esta carpeta) juntos en el mismo Commit.

Si un equipo no tiene foto todavía, la app muestra un escudo genérico
mientras tanto — no se rompe nada por dejarlo pendiente.

Recomendado: imágenes cuadradas, fondo transparente o sólido, menos de
150 KB cada una.
