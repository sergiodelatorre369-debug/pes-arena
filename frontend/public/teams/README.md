# Escudos de equipos

Guarda aquí las fotos/escudos de los equipos. Desde la Mejora 2 (Banco de
Equipos independiente), **cada tipo de torneo tiene su propia carpeta**:

- `copa/` — escudos de selecciones (equipos nacionales).
- `liga/` — escudos de clubes.

No hay que tocar ningún archivo de código — en cuanto el archivo exista
con el nombre correcto en la carpeta correcta, aparece solo dentro de la
app.

## Cuáles equipos hay en cada banco

Eso se controla en `backend/src/teams.js`:

- `COPA_TEAM_COUNT` / `COPA_NAMED_TEAMS` — banco de la Copa.
- `LIGA_TEAM_COUNT` / `LIGA_NAMED_TEAMS` — banco de la Liga.

Si pones menos nombres que el `*_COUNT`, los espacios que faltan se llenan
solos con "Selección N" o "Club N" temporal.

**Importante:** estas listas solo afectan a los torneos que se crean
DESPUÉS de que las cambies — un torneo que ya está corriendo se queda con
el banco que le tocó al nacer (así nadie ve que le "cambiaron el equipo"
a media competencia).

## Cómo se llama cada archivo de foto

El nombre sale del nombre del equipo, en minúsculas, sin acentos, con
guiones en vez de espacios. Ejemplos:

- Copa: "México" → `copa/mexico.png`
- Copa: "Corea del Sur" → `copa/corea-del-sur.png`
- Liga: "Real Madrid" → `liga/real-madrid.png`
- Liga: "Inter de Milán" → `liga/inter-de-milan.png`

## Para sustituir un equipo por otro

1. Abre `backend/src/teams.js` y cambia el nombre en la lista que
   corresponda (Copa o Liga).
2. Sube la foto correspondiente a la carpeta correcta con su nombre exacto.
3. Sube los dos cambios (backend y esta carpeta) juntos en el mismo Commit.

Si un equipo no tiene foto todavía, la app muestra un escudo genérico
mientras tanto — no se rompe nada por dejarlo pendiente.

Recomendado: imágenes cuadradas, fondo transparente o sólido, menos de
150 KB cada una.
