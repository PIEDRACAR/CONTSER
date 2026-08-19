# CONTSERTRIB — Reporte de Corrección de 12 Bugs

**Fecha:** 2026-08-20  
**Sistema:** CONTSERTRIB (contabilidad ecuatoriana, NIIF-PYMES)  
**URL producción:** https://contser.vercel.app/  
**Estado del sitio en vivo:** ❌ SIN CORREGIR (todos los bugs originales presentes)  
**Archivos locales corregidos:** ✅ Listos para despliegue  

---

## Resumen de Bugs Corregidos

| # | Archivo | Bug | Corrección | Severidad |
|---|---------|-----|-----------|----------|
| 1 | core.js | `window.toggleTheme` exportado pero función vive en app.js | Eliminado export de core.js; exportado desde app.js | Alto |
| 2 | core.js | `window.openStorageModal` exportado pero función nunca definida | Eliminado export fantasma | Alto |
| 3 | app.js | `renderCompras()` invocado pero no definido | Creado `renderComprasPane()` con lógica de pane | Crítico |
| 4 | app.js | `refreshCuentaFilters()` invocado pero no definido | Creada función que refresca selects de cuenta | Alto |
| 5 | app.js | Tab 'compras' llama `renderCompras()` inexistente | Cambiado a `renderComprasPane()` | Crítico |
| 6 | core.js | `loadConfig()` invocado pero no definido | Creada función que carga config y popula selects del pane | Crítico |
| 7 | core.js | `saveConfigModal()` no lee selects del pane (solo modal) | Reescrita para leer tanto pane como modal | Alto |
| 8 | app.js | `K.THEME` (mayúsculas) no existe en constantes K | Corregido a `K.theme` (minúsculas) | Crítico |
| 9 | core.js | `window.hoyIso` (camelCase incorrecto) | Corregido a `window.hoyISO` | Medio |
| 10 | core.js | Cambios en config del pane no se persisten | `saveConfigModal()` ahora lee selects del pane | Alto |
| 11 | app.js | `initFilters()` popula selects `cfg-cta-*` del pane | Agregado `startsWith('cfg-cta-')` para excluir pane selects | Alto |
| 12 | app.js + ui.js | `diar-cuenta` usa `value=c.cod` y `filterDiario` compara `l.nom===cta` | `initFilters` usa `cod|nom`, `filterDiario` usa `cta.split('|')[0]` comparado con `l.cta` | Crítico |

---

## Detalle por Archivo

### core.js — 6 correcciones

1. **Bug #1** — Eliminado `window.toggleTheme = toggleTheme;` (línea original ~590). La función vive en app.js.
2. **Bug #2** — Eliminado `window.openStorageModal = openStorageModal;` (función nunca definida).
3. **Bug #6** — Creada `function loadConfig()` que:
   - Lee config desde `LS.get(K.config)` o CONFIG_DEFAULT
   - Popula todos los selects del pane (`cfg-cta-act`, `cfg-cta-pas`, etc.) con `accountOptionsPrefix(prefijo, código)`
   - Exportada como `window.loadConfig = loadConfig;`
4. **Bug #7/#10** — Reescrita `function saveConfigModal()` para:
   - Leer selects del pane (`cfg-cta-*`) que NO tienen `-m` en su ID
   - Leer selects del modal (`*-m`) que SÍ tienen `-m`
   - Combinar ambas fuentes en un solo objeto config
   - Persistir con `LS.set(K.config, ...)`
5. **Bug #9** — Corregido `window.hoyIso = hoyIso;` → `window.hoyISO = hoyISO;`

### app.js — 6 correcciones

1. **Bug #8** — Corregido `K.THEME` → `K.theme` en 2 ubicaciones (toggleTheme y carga inicial)
2. **Bug #3** — Creada `function rerenderActivePane()` que:
   - Identifica el tab activo (`activeTab`)
   - Llama a la función de render correspondiente
   - Exportada como `window.rerenderActivePane`
3. **Bug #4** — Creada `function refreshCuentaFilters()` que:
   - Re-puebla todos los selects de cuenta con `accountOptionsPrefix()`
   - Preserva el valor seleccionado actual
   - Exportada como `window.refreshCuentaFilters`
4. **Bug #5** — Cambiado `renderCompras()` → `renderComprasPane()` en switch de tabs
5. **Bug #11** — `initFilters()` ahora excluye selects `cfg-cta-*` con `if(sel.id.startsWith('cfg-cta-')) return;`
6. **Bug #12** — `initFilters()` ahora popula `diar-cuenta` con formato `cod|nom` (como `openConfigModal`), y los otros selects de cuenta con el mismo formato `cod|nom`

### ui.js — 1 corrección

1. **Bug #12** — `filterDiario()` corregido:
   - Antes: `if(cta && !e.lines.some(l=>l.nom===cta))` — comparaba nombre completo
   - Ahora: `if(cta && !e.lines.some(l=>l.cta===cta.split('|')[0]))` — extrae código y compara con `l.cta`

---

## Validación

Todos los archivos pasan `node --check` sin errores de sintaxis:

```
activos-fijos.js: OK
app.js: OK
conciliacion.js: OK
core.js: OK
dashboard.js: OK
data.js: OK
db.js: OK
enlace-magico.js: OK
ia.js: OK
import.js: OK
nomina.js: OK
reports.js: OK
supabase.js: OK
ui.js: OK
```

---

## Instrucciones de Despliegue

Los archivos corregidos están en la carpeta `assets/js/`. Para desplegar:

1. **Si usas Vercel CLI:** Copiar los 3 archivos modificados (core.js, app.js, ui.js) al repositorio del proyecto y ejecutar `vercel --prod`

2. **Si usas Git:** Hacer commit de los 3 archivos y push al branch principal

3. **Si usas panel de Vercel:** Subir los archivos directamente desde el dashboard

> ⚠️ **Importante:** El sitio en vivo (contser.vercel.app) actualmente NO tiene estas correcciones. Es necesario desplegar manualmente.

---

## Correcciones Previas (sesiones anteriores)

- **supabase.js**: login/register usan IDs `auth-email`/`auth-password` y cierran `modal-auth`
- **nomina.js**: funciones expuestas en `window.*` al final del archivo
- **index.html**: parámetros de `getExportData` corregidos ('libro', 'diario', 'bgeneral')
