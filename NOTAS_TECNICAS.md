# NOTAS TÉCNICAS · SOLO GASTOS

Documento vivo. Se actualiza en el mismo commit que el cambio que documenta.

## 1. Qué es

App móvil (PWA) para tener controlados **todos los gastos al céntimo** y sus vencimientos.
(La tarjeta de «número de libertad financiera» se quitó el 2026-10-16.)

No es Numo: Numo (`Proyectos/gastos`) lleva movimientos, cuentas e inversiones.
SOLO GASTOS solo cuida los gastos recurrentes y sus vencimientos, con foco en
sencillez y diseño.

## 2. Arquitectura (v1)

- `index.html` único y autocontenido: HTML + CSS + JS vanilla. Sin build, sin CDN, sin dependencias.
- `manifest.json` + `sw.js` + iconos → instalable en la pantalla de inicio y abre sin conexión.
- **Datos solo en `localStorage`** (clave `sologastos.v1`) del dispositivo. No hay servidor ni repo de datos todavía.
- Copia de seguridad: exportar/importar JSON desde Ajustes.

## 3. Modelo de datos

```json
{ "expenses": [ { "id", "name", "cat", "amount", "freq": "week|month|quarter|biannual|year",
                  "variable": false, "payments": [{"m": "AAAA-MM", "v": 0}],
                  "next": "AAAA-MM-DD|''", "remind": 0|1|3|7|15|30, "since": "AAAA-MM", "note" } ],
  "demo": false, "notif": false }
```

- Todo se normaliza a **equivalente mensual** (`amount × FREQ[freq].m`): un seguro de 480 €/año cuenta 40 €/mes.
- `next` se avanza solo (`rollNext`) cuando la fecha ya pasó, según la frecuencia.
- La gráfica mes a mes se **deriva** de `since` (no hay snapshots): un gasto cuenta desde su mes `since`. Por eso el formulario pide «Pagándolo desde».
- Categorías editables, guardadas en `S.cats` (`{id,name,color,icon}`); `DEFAULT_CATS` solo siembra la primera vez. Al borrar una categoría, sus gastos pasan a «Otros» (o a la primera que quede). Siempre debe quedar al menos una.
- `domain` (opcional) por gasto: web para el logo. Si está vacío se deduce del nombre con el diccionario `BRANDS` (`guess()`).

## 3a. Gastos variables

`variable: true` + `payments` (un cobro real por mes, ordenado). El importe que cuenta es la **media de los últimos 3 cobros** (`base()`/`monthly()`); sin cobros usa `amount` como estimación. Se eligen 3 y no «todos» para que reaccione pronto a cambios de tarifa.
- La gráfica mes a mes usa el cobro real de ese mes si existe (`history()`); el total del hero usa la media.
- La tarjeta «¿Cuánto te cobraron?» (`needsPay()`) sale en gastos variables **mensuales con fecha** cuando ya llegó el día del mes y no hay cobro registrado. Los trimestrales/anuales variables se registran a mano desde la edición.

## 3b. Logos de empresas

Cada gasto tiene un dominio (`domain`, o deducido del nombre con `BRANDS`/`guess()`). `resolveLogo()` busca el logo en cascada y lo guarda en `localStorage` (`sologastos.logos`):

1. **Simple Icons** (jsDelivr, `simple-icons@13.21.0`): logo vectorial inline, en el color de marca de `SI_COLOR` (blanco si no está), grande sobre baldosa negra.
2. **`/apple-touch-icon.png`** de la propia web: icono a sangre completa.
3. **Favicon de Google** (`s2/favicons`, 64 px): sobre baldosa negra, con margen.
4. Si nada carga, se queda el icono duotono de la categoría.

`hydrateLogos()` (con `MutationObserver`) pinta los logos en cualquier `.ico[data-d]` nuevo.
**Privacidad:** el navegador pide a jsDelivr, a la web de la empresa y/o a Google el dominio de la empresa (nunca importes ni datos del usuario).
**Lección:** Google y las webs no envían CORS, así que no se puede analizar el píxel del favicon (p. ej. para invertir logos oscuros); por eso Simple Icons va primero y lleva su propio color.
Borrado de gastos: deslizar a la izquierda en la vista de categoría (o botón en la edición) con «Deshacer» durante 5 s.

## 3c. Animaciones

- Scroll-reveal con `IntersectionObserver` (`.rise` → `.in`) solo en la primera pintura; los re-render posteriores quitan `.rise` para no parpadear.
- Contadores (`.cnt`, `runCounters`) arrancan al entrar en pantalla; al editar parten del valor anterior.
- Parallax del hero (`.par`, variable `--p`), FAB que se compacta al bajar (`.compact`) y se oculta con `body.sheet-open`, orbes de fondo con `transform`.
- Todo se desactiva con `prefers-reduced-motion`.

## 3d. Iconos propios

Los iconos de categoría (y el de reserva cuando no hay favicon) son SVG **duotono** definidos en `ICONS`: cada uno lleva una capa rellena (`class="f"`, 26 % de opacidad) y un trazo de 1,7 px. La baldosa `.ico` es un degradado radial del color de la categoría con borde, brillo superior y resplandor. Para añadir un icono: nueva entrada en `ICONS` con ese formato; aparece solo en el selector de categorías.

## 4. Avisos

Notification API, comprobación **al abrir la app** (y al volver a primer plano). Un aviso por gasto y vencimiento (`sologastos.notified`).
**Límite:** sin servidor no hay push en segundo plano; si la app no se abre, no avisa. En iPhone solo funciona con la app añadida a la pantalla de inicio (iOS 16.4+).

## 5. Pruebas locales

Servir la carpeta con cualquier servidor estático (el service worker no corre en `file://`).
Al subir cambios, subir `VERSION` en `sw.js`.

## 6. Bugs y lecciones

- El servidor de previsualización de la app no puede leer `~/Desktop` (permisos de macOS): se probó sirviendo una copia desde el scratchpad.

## 7. Pendiente / ideas

Ver la ficha del proyecto en `Cerebro/proyectos/solo-gastos.md`.
