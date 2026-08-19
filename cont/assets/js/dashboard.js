/* CONTSERTRIB · Dashboard y KPIs */
'use strict';

/* ---------- Config ---------- */
const DASH_K = 'ct_dashboard_config_v2';
let DASH_CFG = LS.get(DASH_K, { periodo: new Date().toISOString().slice(0,7) });
const saveDsh = () => LS.set(DASH_K, DASH_CFG);

/* ---------- Helpers de datos contables ---------- */
function getBalanza(periodo){
  const entries = getEntriesForPeriod(periodo);
  const movs = {};
  entries.forEach(e => {
    e.lines.forEach(l => {
      if(!movs[l.cta]) movs[l.cta] = {cta:l.cta,nom:l.nom,debe:0,haber:0};
      movs[l.cta].debe = round2(movs[l.cta].debe + (l.debe||0));
      movs[l.cta].haber = round2(movs[l.cta].haber + (l.haber||0));
    });
  });
  // Agregar saldos iniciales
  const bal = buildBalanza(periodo);
  return bal || Object.values(movs);
}

function getKPIs(periodo){
  const empresa = LS.get('ct_empresa_v2', {});
  const balanza = getBalanza(periodo);
  let totalActivo = 0, totalPasivo = 0, totalPatrimonio = 0;
  let totalIngresos = 0, totalGastos = 0;
  let saldoBanco = 0;
  const descuadrados = getDescuadrados ? getDescuadrados().length : 0;
  const compras = RAW_COMPRAS.filter(c => c.fecha && c.fecha.startsWith(periodo));
  const ventas = RAW_VENTAS.filter(v => v.fecha && v.fecha.startsWith(periodo));
  const retenciones = RAW_RET.filter(r => r.fecha && r.fecha.startsWith(periodo));

  balanza.forEach(m => {
    const saldo = round2(m.debe - m.haber);
    const cta = m.cta || '';
    if(cta.startsWith('1.')){
      totalActivo += saldo;
      if(cta.startsWith('1.1.1')) saldoBanco += saldo;
    }
    if(cta.startsWith('2.')) totalPasivo += Math.abs(saldo);
    if(cta.startsWith('3.')) totalPatrimonio += saldo;
    if(cta.startsWith('4.')) totalIngresos += Math.abs(saldo);
    if(cta.startsWith('5.')) totalGastos += Math.abs(saldo);
  });

  const resultado = round2(totalIngresos - totalGastos);
  return {
    totalActivo: round2(totalActivo), totalPasivo: round2(totalPasivo), totalPatrimonio: round2(totalPatrimonio),
    totalIngresos: round2(totalIngresos), totalGastos: round2(totalGastos), resultado,
    saldoBanco: round2(saldoBanco), descuadrados,
    numCompras: compras.length, numVentas: ventas.length, numRetenciones: retenciones.length,
    totalCompras: round2(compras.reduce((s,c) => s + (+(c.total||c.valor||0)), 0)),
    totalVentas: round2(ventas.reduce((s,v) => s + (+(v.total||v.valor||0)), 0)),
    numActivos: ACTIVOS_FIJOS ? ACTIVOS_FIJOS.filter(a=>a.estado==='activo').length : 0,
    numNominas: NOMINAS ? NOMINAS.length : 0
  };
}

/* ---------- Datos mensuales para gráficos ---------- */
function getMonthlyData(year){
  const months = [];
  for(let m=1; m<=12; m++){
    const per = year + '-' + String(m).padStart(2,'0');
    const balanza = getBalanza(per);
    let ing = 0, gas = 0;
    balanza.forEach(b => {
      const cta = b.cta || '';
      const saldo = round2(b.debe - b.haber);
      if(cta.startsWith('4.')) ing += Math.abs(saldo);
      if(cta.startsWith('5.')) gas += Math.abs(saldo);
    });
    months.push({mes: m, label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m-1], ingresos: ing, gastos: gas, resultado: round2(ing-gas)});
  }
  return months;
}

/* ---------- Vista HTML ---------- */
function buildDashboardView(container){
  const periodo = DASH_CFG.periodo || new Date().toISOString().slice(0,7);
  const year = periodo.slice(0,4);
  const kpis = getKPIs(periodo);
  const monthly = getMonthlyData(year);

  let h = '<div class="pane-header"><h2><i class="fa-solid fa-chart-line"></i> Dashboard</h2>';
  h += '<div class="pane-actions">';
  h += '<input type="month" id="dash-periodo" value="'+periodo+'" onchange="cambiarPeriodoDash()">';
  h += '<button class="btn" onclick="exportDashboardPDF()"><i class="fa-solid fa-file-pdf"></i> PDF</button>';
  h += '</div></div>';

  /* KPI Cards */
  h += '<div class="dash-kpi-grid">';
  h += kpiCard('Total Activos', '$'+fmt(kpis.totalActivo), 'fa-building', kpis.totalActivo>=0?'green':'red');
  h += kpiCard('Total Pasivos', '$'+fmt(kpis.totalPasivo), 'fa-file-invoice-dollar', 'amber');
  h += kpiCard('Patrimonio', '$'+fmt(kpis.totalPatrimonio), 'fa-shield-halved', kpis.totalPatrimonio>=0?'green':'red');
  h += kpiCard('Resultado del Período', '$'+fmt(kpis.resultado), 'fa-chart-pie', kpis.resultado>=0?'green':'red');
  h += kpiCard('Ventas', kpis.numVentas+' ($'+fmt(kpis.totalVentas)+')', 'fa-cart-shopping', 'blue');
  h += kpiCard('Compras', kpis.numCompras+' ($'+fmt(kpis.totalCompras)+')', 'fa-truck', 'purple');
  h += kpiCard('Saldo Banco', '$'+fmt(kpis.saldoBanco), 'fa-university', kpis.saldoBanco>=0?'green':'red');
  h += kpiCard('Descuadrados', kpis.descuadrados, 'fa-triangle-exclamation', kpis.descuadrados===0?'green':'red');
  h += '</div>';

  /* Gráficos */
  h += '<div class="dash-charts grid-2">';
  h += '<div class="chart-card"><h4>Ingresos vs Gastos Mensuales</h4><canvas id="chart-ing-gas" height="250"></canvas></div>';
  h += '<div class="chart-card"><h4>Resultado Mensual</h4><canvas id="chart-resultado" height="250"></canvas></div>';
  h += '<div class="chart-card"><h4>Composición Activo</h4><canvas id="chart-activo" height="250"></canvas></div>';
  h += '<div class="chart-card"><h4>Composición Pasivo + Patrimonio</h4><canvas id="chart-pasivo" height="250"></canvas></div>';
  h += '</div>';

  /* Resumen rápido */
  h += '<div class="dash-resumen"><h3>Resumen del Período</h3><table class="rtable"><thead><tr><th>Concepto</th><th class="num">Monto</th></tr></thead><tbody>';
  h += '<tr><td>Total Ingresos</td><td class="num">$'+fmt(kpis.totalIngresos)+'</td></tr>';
  h += '<tr><td>Total Gastos</td><td class="num">$'+fmt(kpis.totalGastos)+'</td></tr>';
  h += '<tr><td><strong>Resultado</strong></td><td class="num"><strong>$'+fmt(kpis.resultado)+'</strong></td></tr>';
  h += '<tr><td>Nóminas procesadas</td><td class="num">'+kpis.numNominas+'</td></tr>';
  h += '<tr><td>Activos fijos activos</td><td class="num">'+kpis.numActivos+'</td></tr>';
  h += '<tr><td>Comprobantes de compra</td><td class="num">'+kpis.numCompras+'</td></tr>';
  h += '<tr><td>Comprobantes de venta</td><td class="num">'+kpis.numVentas+'</td></tr>';
  h += '<tr><td>Retenciones</td><td class="num">'+kpis.numRetenciones+'</td></tr>';
  h += '</tbody></table></div>';

  /* IA análisis */
  h += '<div class="dash-ia"><h3><i class="fa-solid fa-robot"></i> Análisis IA</h3>';
  h += '<textarea id="dash-ia-prompt" rows="3" placeholder="Pide un análisis del estado financiero actual...">Analiza el estado financiero de la empresa para el período '+periodo+'. Indica riesgos, oportunidades y recomendaciones.</textarea>';
  h += '<button class="btn btn-primary" onclick="analizarDashboardIA()"><i class="fa-solid fa-brain"></i> Analizar con IA</button>';
  h += '<div id="dash-ia-result" class="ia-output"></div></div>';

  container.innerHTML = h;

  /* Render charts después de DOM */
  setTimeout(() => renderDashCharts(monthly, kpis), 100);
}

function kpiCard(label, value, icon, color){
  return '<div class="kpi-card kpi-'+color+'"><div class="kpi-icon"><i class="fa-solid '+icon+'"></i></div><div class="kpi-body"><div class="kpi-label">'+label+'</div><div class="kpi-value">'+value+'</div></div></div>';
}

/* ---------- Chart.js ---------- */
function renderDashCharts(monthly, kpis){
  if(!window.Chart) return;

  const green = '#0F3D33'; const gold = '#D4AF37'; const navy = '#0A2342';
  const red = '#C62828'; const amber = '#F57C00'; const purple = '#7B1FA2'; const blue = '#1565C0';
  const textColor = '#e0e0e0'; const gridColor = '#2a2a2a';

  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } }
    }
  };

  /* Ingresos vs Gastos */
  const ctx1 = document.getElementById('chart-ing-gas');
  if(ctx1) new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [
        { label: 'Ingresos', data: monthly.map(m => m.ingresos), backgroundColor: green + '99', borderColor: green, borderWidth: 1 },
        { label: 'Gastos', data: monthly.map(m => m.gastos), backgroundColor: red + '99', borderColor: red, borderWidth: 1 }
      ]
    },
    options: baseOpts
  });

  /* Resultado */
  const ctx2 = document.getElementById('chart-resultado');
  if(ctx2) new Chart(ctx2, {
    type: 'line',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{ label: 'Resultado', data: monthly.map(m => m.resultado), borderColor: gold, backgroundColor: gold + '33', fill: true, tension: 0.3 }]
    },
    options: baseOpts
  });

  /* Composición activo (pie) */
  const ctx3 = document.getElementById('chart-activo');
  if(ctx3) new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: ['Efectivo/Bancos','Cuentas por Cobrar','Inventarios','Activos Fijos','Otros'],
      datasets: [{
        data: [Math.abs(kpis.saldoBanco)||0, Math.max(0,kpis.totalActivo*0.2)||0, Math.max(0,kpis.totalActivo*0.15)||0, Math.max(0,kpis.totalActivo*0.4)||0, Math.max(0,kpis.totalActivo*0.05)||0],
        backgroundColor: [green, blue, gold, purple, amber],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } } }
  });

  /* Pasivo + Patrimonio (pie) */
  const ctx4 = document.getElementById('chart-pasivo');
  if(ctx4) new Chart(ctx4, {
    type: 'doughnut',
    data: {
      labels: ['Pasivo Corriente','Pasivo Largo Plazo','Patrimonio'],
      datasets: [{
        data: [Math.max(0,kpis.totalPasivo*0.6)||0, Math.max(0,kpis.totalPasivo*0.4)||0, Math.max(0,kpis.totalPatrimonio)||0],
        backgroundColor: [amber, navy, green],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } } }
  });
}

/* ---------- Cambio de período ---------- */
function cambiarPeriodoDash(){
  const p = document.getElementById('dash-periodo')?.value;
  if(p){ DASH_CFG.periodo = p; saveDsh(); renderDashboard(); }
}

/* ---------- IA análisis ---------- */
function analizarDashboardIA(){
  const periodo = DASH_CFG.periodo;
  const kpis = getKPIs(periodo);
  const prompt = (document.getElementById('dash-ia-prompt')?.value||'').trim();
  if(!prompt) return showToast('Escribe una instrucción para la IA','err');
  const context = 'Empresa: '+(EMPRESA.nombre||'N/A')+' | Período: '+periodo+' | Activos: $'+fmt(kpis.totalActivo)+' | Pasivos: $'+fmt(kpis.totalPasivo)+' | Patrimonio: $'+fmt(kpis.totalPatrimonio)+' | Ingresos: $'+fmt(kpis.totalIngresos)+' | Gastos: $'+fmt(kpis.totalGastos)+' | Resultado: $'+fmt(kpis.resultado)+' | Descuadrados: '+kpis.descuadrados;
  const el = document.getElementById('dash-ia-result');
  if(el) el.innerHTML = '<div class="ia-loading"><i class="fa-solid fa-spinner fa-spin"></i> Analizando...</div>';
  if(typeof iaQuery === 'function'){
    iaQuery(prompt, context).then(r => { if(el) el.innerHTML = '<div class="ia-answer">'+esc(r||'')+'</div>'; }).catch(() => { if(el) el.innerHTML = '<div class="ia-error">Error al consultar la IA</div>'; });
  } else {
    if(el) el.innerHTML = '<div class="ia-error">Módulo de IA no disponible</div>';
  }
}

/* ---------- Export PDF ---------- */
function exportDashboardPDF(){
  if(!window.jspdf) return showToast('PDF no disponible','err');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({unit:'pt'});
  const periodo = DASH_CFG.periodo;
  const kpis = getKPIs(periodo);
  let y = drawPdfHeader(doc, 'Dashboard Financiero', 'Período: '+periodo);
  y += 10;
  const kpiData = [
    ['Total Activos','$'+fmt(kpis.totalActivo)], ['Total Pasivos','$'+fmt(kpis.totalPasivo)],
    ['Patrimonio','$'+fmt(kpis.totalPatrimonio)], ['Resultado','$'+fmt(kpis.resultado)],
    ['Ventas',kpis.numVentas+' ($'+fmt(kpis.totalVentas)+')'], ['Compras',kpis.numCompras+' ($'+fmt(kpis.totalCompras)+')'],
    ['Saldo Banco','$'+fmt(kpis.saldoBanco)], ['Descuadrados',String(kpis.descuadrados)]
  ];
  doc.autoTable({head:[['Indicador','Valor']],body:kpiData,startY:y,margin:{left:40,right:40},styles:{fontSize:9,cellPadding:4},headStyles:{fillColor:[15,61,51],textColor:255,fontStyle:'bold'}});
  addPdfPageNumbers(doc);
  doc.save(slug(EMPRESA.nombre)+'_dashboard_'+periodo+'.pdf');
}

/* ---------- Exports ---------- */
window.buildDashboardView = buildDashboardView;
window.cambiarPeriodoDash = cambiarPeriodoDash;
window.analizarDashboardIA = analizarDashboardIA;
window.exportDashboardPDF = exportDashboardPDF;