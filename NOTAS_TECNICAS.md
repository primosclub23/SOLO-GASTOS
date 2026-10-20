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
{ "expenses": [ { "id", "name", "cat", "amount", "freq": "week|month|bimonth|quarter|biannual|year",
                  "kind": "fixed|variable" (solo gastos), "inc": true (solo ingresos), "variable": false, "payments": [{"m": "AAAA-MM", "v": 0}], "due": ["AAAA-MM"],
                  "next": "AAAA-MM-DD|''", "remind": 0|1|3|7|15|30, "since": "AAAA-MM", "note" } ],
  "demo": false, "notif": false }
```

- Todo se normaliza a **equivalente mensual** (`amount × FREQ[freq].m`): un seguro de 480 €/año cuenta 40 €/mes.
- `next` se avanza solo (`rollNext`) cuando la fecha ya pasó, según la frecuencia.
- La gráfica mes a mes se **deriva** de `since` (no hay snapshots): un gasto cuenta desde su mes `since`. Por eso el formulario pide «Pagándolo desde».
- Categorías editables, guardadas en `S.cats` (`{id,name,color,icon}`); `DEFAULT_CATS` solo siembra la primera vez. Al borrar una categoría, sus gastos pasan a «Otros» (o a la primera que quede). Siempre debe quedar al menos una.
- `domain` (opcional) por gasto: web para el logo. Si está vacío se deduce del nombre con el diccionario `BRANDS` (`guess()`).

## 3-bis. Navegación, tipos e ingresos (2026-10-18)

- **Un solo array `S.expenses`**: los ingresos son entradas con `inc:true` y `cat:'__inc'` (`INC_CAT`); los gastos llevan `kind: 'fixed'|'variable'` (si falta, es fijo). Hay que filtrar siempre con `EXP()` / `INC()`; `total(kind)`, `incomeTotal()`, `catStats(kind)`.
- **Dos ejes independientes:** `kind` (qué es: compromiso fijo o gasto del día a día; decide la pestaña) y `variable` (si el importe cambia cada vez; activa cobros y media). El agua, por ejemplo, es fijo con importe que cambia.
- **Menú inferior (`#dock`)**: pastilla de cristal con 5 huecos (Inicio · Fijos · + · Variables · Ingresos) y una burbuja (`.bub`) que se desliza con `--i`. `view` es la pestaña activa; `setView()` re-renderiza con transición direccional (`.vin`). El «+» abre el formulario con el tipo de la pestaña actual (`addKind()`). Se oculta con `body.sheet-open`.
- **Inicio** muestra «Ingresos», «Te quedan» (ingresos − gastos) y una barra con el % que se gasta; sin ingresos, una tarjeta invita a añadirlos.
- El formulario tiene un selector Gasto fijo / Gasto variable / Ingreso; con Ingreso se oculta la categoría. Los gastos anteriores a este cambio se consideran fijos.

## 3-ter. Búsqueda

La lupa de la cabecera (`#btn-search`, `openSearch()`) busca por nombre, nota, web, categoría o tipo (`matchItems()`, ignora mayúsculas y acentos, todas las palabras deben aparecer). Los resultados (`searchHTML()`) dan «este mes», media y acumulado, un gráfico de barras y la lista mes a mes (`seriesFor(items)`, el mismo cálculo que el historial de Inicio, ahora compartido) y las coincidencias. Limitación: la app guarda un importe por mes y gasto (los cobros registrados), no tickets sueltos; los pagos anuales/trimestrales se reparten entre los meses.

## 3-quater. Varias compras (2026-10-18)

Tercer modo de «Importe» (además de *Siempre igual* y *Cambia cada cobro*): `buys:true` + `entries:[{id,d:'AAAA-MM-DD',v}]`. Sirve para supermercado, gasolina, etc., donde hay varias compras al mes.
- `syncEntries(e)` recalcula `payments` (una suma por mes) a partir de las compras; así el historial, la búsqueda y las gráficas reutilizan lo existente. Se llama al cargar, importar y guardar.
- `base(e)` = máx(media de los 3 últimos meses cerrados o la estimación, lo gastado en el mes en curso) (`buysBase`). Estos gastos no generan avisos de «¿cuánto cobraron?» y su frecuencia se fuerza a mensual.
- Los meses sin compras cuentan 0 en historial y búsqueda.
- La búsqueda muestra cada mes como `<details>` con las compras sueltas (fecha e importe) y una línea «Total» (`contribLines()`, `monthsHTML()`). El mes en curso va desplegado.
- **Gastos de tipo variable** no tienen «Cada cuánto», «Próximo pago» ni «Avisarme antes»: al guardar se fuerzan `freq:'month'`, `next:''`, `remind:0`. Sus modos de importe son «Importe estimado» y «Varias compras»; los de tipo fijo/ingreso ofrecen «Siempre igual» y «Cambia cada cobro» (`modesFor()`).
- En el formulario, «Compras» permite apuntar (fecha + importe) y borrar; en gastos existentes se guarda al instante, en gastos nuevos al pulsar Guardar.

## 3-quinquies. «Tu mes» (resumen mensual compartible)

Pantalla a pantalla completa (`#rcp`) que se abre desde el botón verde «Tu mes» de la cabecera, junto a la lupa (`#open-recap`, 2026-10-20; antes era una tarjeta en Inicio y la cabecera llevaba la marca «Solo Gastos» con el punto azul, ambas eliminadas). Muestra el mes anterior completo (o el último con datos) y permite navegar por los meses con datos (`recapMonths()`).
- **Cálculo:** `aggMonth(k)` suma por gasto lo que cuenta en el mes `k` (compras sueltas, cobro registrado o importe habitual; los ingresos igual) y `recapData(k)` deriva total, variación frente al mes anterior, ranking de categorías y los 3 gastos que más pesaron (también calcula compras y ahorro, hoy sin usar en pantalla).
- **Contenido (decidido el 2026-10-18):** el resumen se centra en el total gastado y **dónde se gastó más**: cifra grande + variación, barra de reparto, ranking de las 5 categorías con importe, % y barra animada, los 3 gastos que más pesaron y una frase final (`recapQuote()`). Se quitaron las tarjetas de «te sobró», «más compras», etc.
- **Imagen:** `drawRecap()` pinta en un `<canvas>` de 1080×1920 (formato historia) con el mismo diseño; se prepara como JPEG (`rcBlob`) al renderizar para que `navigator.share({files})` se invoque dentro del gesto del toque, con descarga como respaldo. «Sin cifras» sustituye los importes por `•••` y deja los porcentajes (útil para compartir sin enseñar dinero).
- `scripts/mklogos.py` y `logos.js` no tienen relación; el pie de la imagen enlaza a la web de la app.

## 3a. Gastos variables

`variable: true` + `payments` (un cobro real por mes, ordenado). El importe que cuenta es la **media de los últimos 3 cobros** (`base()`/`monthly()`); sin cobros usa `amount` como estimación. Se eligen 3 y no «todos» para que reaccione pronto a cambios de tarifa.
- La gráfica mes a mes usa el cobro real de ese mes si existe (`history()`); el total del hero usa la media.
- La **campanilla** (`#btn-bell`, `notifs()`, `openBell()`) reúne los cobros por registrar (`needsPay()`) y los vencimientos dentro de su plazo de aviso (`remind`); el número del badge es la suma. Registrar el cobro desde ahí refresca la hoja. Con avisos activados, `checkReminders()` también lanza una notificación del sistema por cobro pendiente (una por gasto y mes).
- **Cuándo hay un cobro pendiente:** `rollNext()` avanza `next` el día **después** de la fecha de cobro y, si el gasto es variable, anota ese mes en `due` (máx. 3). `needsPay(e)` = `due` no vacío; al registrar el cobro (`addPayment`) se quita de `due`. Así el aviso aparece el día siguiente al cobro y no antes.
- Al **crear** un gasto variable con fecha, el importe se guarda como último cobro (mes del periodo anterior a `next`), para que el primer aviso sea el del siguiente cobro.
- **Bug corregido (2026-10-17):** antes `needsPay` miraba el día del mes y avisaba del cobro del mes en curso aunque aún faltaran semanas.

## 3b. Logos de empresas

Cada gasto tiene un dominio (`domain`, o deducido del nombre con `BRANDS`/`guess()`). `resolveLogo()` busca el logo en cascada y lo guarda en `localStorage` (`sologastos.logos`):

1. **Simple Icons** (jsDelivr, `simple-icons@13.21.0`): logo vectorial inline, en el color de marca de `SI_COLOR` (blanco si no está), grande sobre baldosa negra.
2. **`/apple-touch-icon.png`** de la propia web: icono a sangre completa.
3. **Logos incrustados** (`logos.js`, `window.LOGOS`, ~48 marcas españolas y comunes, ≤64 px, generados con `scripts/mklogos.py` a partir de `BRANDS`): se usan sin red.
4. **Favicon**, probando en orden Google (`s2/favicons`), DuckDuckGo (`icons.duckduckgo.com/ip3`) y `/favicon.ico` de la propia web (con y sin `www`): sobre baldosa negra, con margen.
5. Si nada carga, se queda el icono duotono de la categoría.

`hydrateLogos()` (con `MutationObserver`) pinta los logos en cualquier `.ico[data-d]` nuevo.
**Privacidad:** el navegador pide a jsDelivr, a la web de la empresa y/o a Google el dominio de la empresa (nunca importes ni datos del usuario).
**Lección:** Google y las webs no envían CORS, así que no se puede analizar el píxel del favicon (p. ej. para invertir logos oscuros); por eso Simple Icons va primero y lleva su propio color.
Borrado de gastos: deslizar a la izquierda en la vista de categoría (o botón en la edición) con «Deshacer» durante 5 s.

## 3c. Animaciones

- Scroll-reveal con `IntersectionObserver` (`.rise` → `.in`) solo en la primera pintura; los re-render posteriores quitan `.rise` para no parpadear.
- Contadores (`.cnt`, `runCounters`) arrancan al entrar en pantalla; al editar parten del valor anterior.
- Parallax del hero (`.par`, variable `--p`), FAB que se compacta al bajar (`.compact`) y se oculta con `body.sheet-open`, orbes de fondo con `transform`.
- **Confirmación al guardar (`success()`, `#ok`):** réplica de la animación de Face ID, hecha a partir de una grabación de pantalla (fotogramas a 20 fps). Línea de tiempo de 2 s: la baldosa nace en el centro de la pantalla y crece (`clip-path` + `scale`), aparece el glifo de cara borroso, tres aros giran formando una esfera, queda un círculo, se dibuja la V y la baldosa se desvanece reduciéndose y desenfocándose. Cada fase es un `<svg>` aparte porque Safari no aplica `filter` a elementos internos de un SVG. Se llama al guardar un gasto, una categoría o un cobro.
- Todo se desactiva con `prefers-reduced-motion`.

## 3d. Iconos propios

Los iconos de categoría (y el de reserva cuando no hay favicon) son SVG **duotono** definidos en `ICONS`: cada uno lleva una capa rellena (`class="f"`, 26 % de opacidad) y un trazo de 1,7 px. La baldosa `.ico` es un degradado radial del color de la categoría con borde, brillo superior y resplandor. Para añadir un icono: nueva entrada en `ICONS` con ese formato; aparece solo en el selector de categorías.

## 3e. Secciones plegables

«Próximos vencimientos» se pliega con una animación de altura (`.fold` con `grid-template-rows:0fr→1fr`). La elección se guarda en `localStorage` (`sologastos.ui`, clave `up`; por defecto abierta) y plegada muestra un resumen («5 · en 2 días»).

## 3f. Gráfico de categorías: barra o donut

En «Por categorías», el botón de gráfico (`#btn-donut`) alterna la barra apilada y un donut SVG (`chartHTML()`, `toggleChart()`); la elección se guarda en `sologastos.ui` (`donut`). Cada segmento es un `<circle>` con `stroke-dasharray`/`dashoffset` calculados con la circunferencia (`DN_C`) y se dibuja en cascada con una transición; tocar un segmento (`pickCat()`) lo resalta y muestra categoría, importe y % en el centro; tocar el hueco vuelve al total.

## 3g. Icono de la app

Icono del zorro (2026-10-20), a partir de la imagen que aportó el usuario (sin el texto «Grok Bot»): se recortó el zorro por luminancia y se recompuso sobre un fondo oscuro a sangre (sin esquinas redondeadas, iOS aplica la máscara) con una sombra suave; el zorro ocupa ~60 % del lado. Archivos: `icon-512.png` (manifiesto, «any maskable»), `icon-192.png` (manifiesto y favicon) e `icon-180.png` (`apple-touch-icon`). Se eliminó `icon.svg`. Si se cambia el icono, subir `VERSION` en `sw.js` y, en iOS, borrar y volver a añadir la app a la pantalla de inicio (iOS guarda el icono al instalarla).

## 4. Avisos

Notification API, comprobación **al abrir la app** (y al volver a primer plano). Un aviso por gasto y vencimiento (`sologastos.notified`).
**Límite:** sin servidor no hay push en segundo plano; si la app no se abre, no avisa. En iPhone solo funciona con la app añadida a la pantalla de inicio (iOS 16.4+).

## 5. Pruebas locales

Servir la carpeta con cualquier servidor estático (el service worker no corre en `file://`).
Al subir cambios, subir `VERSION` en `sw.js`.

## 6. Bugs y lecciones

- **Actualizaciones que no llegaban al iPhone (2026-10-17):** GitHub Pages envía `cache-control: max-age=600` y el service worker (red primero) leía de la caché HTTP, así que la app instalada podía mostrar una versión de hasta 10 min atrás, y a veces dos aperturas. Arreglo: `fetch(..., {cache:'no-cache'})` en `sw.js`, recarga automática cuando un SW nuevo toma el control y versión visible en Ajustes. **Al publicar, subir `VERSION` en `sw.js` y el número de versión de Ajustes.**

- El servidor de previsualización de la app no puede leer `~/Desktop` (permisos de macOS): se probó sirviendo una copia desde el scratchpad.

- **Exportar en iPhone (2026-10-17):** una descarga con `<a download>` abre un visor sin forma obvia de guardar. Ahora se usa `navigator.share({files})` (hoja de compartir → «Guardar en Archivos»), con la descarga clásica como respaldo en ordenador.

- **Logos que no salían (2026-10-18):** la hidratación de logos (`MutationObserver` → `requestAnimationFrame`) se quedaba bloqueada para siempre si el navegador pausaba el frame (app en segundo plano), y los fallos de red se recordaban toda la sesión. Ahora usa `setTimeout`, reintenta a los 60 s, se relanza al volver a primer plano y el formulario muestra «Logo encontrado ✓» o «No encuentro logo…».

- **Logos con imagen invisibles desde la v13 (2026-10-18):** la clase `ok` que ponía a la `<img>` al cargar chocaba con `.ok` de la animación de guardado (`position:fixed; opacity:0…`), así que todo logo basado en `<img>` (Repsol, Mercadona…) se quedaba invisible; los de Simple Icons (SVG en línea) no. Ahora la clase es `ld`. **Evitar nombres de clase genéricos (`ok`, `show`, `on`) sin prefijo.** El service worker tampoco intercepta ya peticiones de otros orígenes.

## 7. Pendiente / ideas

Ver la ficha del proyecto en `Cerebro/proyectos/solo-gastos.md`.
