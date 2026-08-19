# 🚀 CONTSERTRIB — Guía de Despliegue en Vercel

## Problema original
El sitio en producción (https://contser.vercel.app/) devolvía **404 en todos los archivos JS**.
La causa: el proyecto se diseñó para Netlify (netlify.toml) pero se desplegó en Vercel
sin `vercel.json`, por lo que Vercel no encontraba los assets estáticos.

---

## Solución aplicada

### 1. Correcciones de código (12 bugs)
Ver `BUGFIX_REPORT.md` para el detalle completo de cada corrección.

### 2. Configuración de despliegue (`vercel.json`)
Se añadió `vercel.json` mínimo con `"version": 2`, suficiente para que
Vercel reconozca el directorio como un sitio estático y sirva todos los
archivos correctamente.

---

## Instrucciones de despliegue en Vercel

### Opción A: Despliegue directo (CLI)
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Ir al directorio del proyecto
cd /ruta/a/contsertrib/

# Desplegar (Vercel detecta automáticamente sitio estático)
vercel --prod

# Si ya existe el proyecto, puedes especificar el nombre:
vercel --prod --yes
```

### Opción B: Despliegue vía GitHub
1. Subir el contenido de esta carpeta a un repositorio GitHub
2. En Vercel Dashboard → "New Project" → importar el repositorio
3. Framework Preset: **Other** (no Next.js, no React)
4. Build Command: dejar vacío
5. Output Directory: `.` (raíz) o dejar vacío
6. Click "Deploy"

### Opción C: Reemplazar el proyecto existente
Si el proyecto ya existe en Vercel:
1. Ir a Settings → General → Root Directory → verificar que apunte a `/`
2. Verificar que no hay un `build` command activo
3. Redesplegar con `vercel --prod` desde esta carpeta

---

## Estructura de archivos requerida

```
contsertrib/
├── index.html              ← Página principal
├── vercel.json             ← Config Vercel
├── assets/
│   ├── css/
│   │   └── app.css         ← Estilos (38 KB)
│   └── js/
│       ├── core.js         ← Constantes K, utilidades, config
│       ├── db.js           ← LocalStorage helpers
│       ├── data.js          ← Datos de cuentas, importación
│       ├── supabase.js     ← Auth Supabase
│       ├── import.js       ← Importación de comprobantes
│       ├── nomina.js       ← Roles, empleados, pagos
│       ├── reports.js      ← Exportación Excel/PDF
│       ├── ui.js            ← Renderizado de paneles
│       ├── ia.js            ← Clasificación IA
│       ├── conciliacion.js  ← Conciliación bancaria
│       ├── activos-fijos.js ← Depreciación
│       ├── dashboard.js     ← Indicadores
│       ├── enlace-magico.js ← Sincronización
│       └── app.js           ← Orquestador (último en cargar)
```

## Orden de carga de scripts (todos con `defer`)
```
core.js → db.js → data.js → supabase.js → import.js → nomina.js
→ reports.js → ui.js → ia.js → conciliacion.js → activos-fijos.js
→ dashboard.js → enlace-magico.js → app.js (ÚLTIMO)
```

## CDN dependencies (cargadas externamente)
- Chart.js 4.4.0
- XLSX (SheetJS) 0.18.5
- jsPDF 2.5.1 + AutoTable 3.8.2
- JSZip 3.10.1
- Supabase JS v2

## Esquema de colores
- Verde: #0F3D33
- Azul marino: #0A2342
- Dorado: #D4AF37
- Dark: #121212
- Fuentes: Inter + Roboto

---

## Verificación post-despliegue
1. Abrir la URL del sitio
2. Verificar que la consola del navegador no muestra errores 404
3. Verificar que la consola no muestra errores de JS (ReferenceError, etc.)
4. Probar: abrir un modal, cambiar tema, agregar cuenta, exportar Excel/PDF
5. Probar login con Supabase (si está configurado)
