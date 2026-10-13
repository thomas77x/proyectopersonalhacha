// Controles del visor: todo se aplica sobre los materiales del GLB ya cargado,
// sin volver a descargar el modelo.

const visor = document.querySelector('#visor');
const estado = document.querySelector('#estado-acabado');
const controles = document.querySelectorAll('fieldset.control');

const MAPAS = ['basecolor', 'orm', 'normal'];
const VISTAS = {
  completa: { orbita: '35deg 78deg 2.3m', objetivo: '0m 0.5m 0m' },
  cabeza: { orbita: '25deg 72deg 0.95m', objetivo: '0m 0.88m 0m' },
  pomo: { orbita: '40deg 70deg 0.5m', objetivo: '0m 0.08m 0m' },
};

const juegos = new Map();   // nombre -> Promise<[base, orm, normal]>

function marcar(grupo, activo) {
  for (const b of grupo.querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b === activo));
  }
}

function cargarJuego(nombre) {
  if (!juegos.has(nombre)) {
    juegos.set(nombre, Promise.all(
      MAPAS.map((m) => visor.createTexture(`texturas/${nombre}/${m}.jpg`, 'image/jpeg'))));
  }
  return juegos.get(nombre);
}

// 1) Juego de texturas: limpio / desgastado. Los tres materiales comparten atlas.
async function aplicarJuego(nombre) {
  estado.textContent = 'cargando…';
  try {
    const [base, orm, normal] = await cargarJuego(nombre);
    for (const mat of visor.model.materials) {
      mat.pbrMetallicRoughness.baseColorTexture.setTexture(base);
      mat.pbrMetallicRoughness.metallicRoughnessTexture.setTexture(orm);
      mat.occlusionTexture.setTexture(orm);
      mat.normalTexture.setTexture(normal);
    }
    estado.textContent = '';
  } catch (e) {
    juegos.delete(nombre);
    estado.textContent = 'no se pudieron cargar las texturas';
    throw e;
  }
}

// 2 y 3) Tinte del acero y de la madera: factor de color base del material.
function tintar(material, color) {
  visor.model.getMaterialByName(material).pbrMetallicRoughness.setBaseColorFactor(color);
}

const ctlAcabado = document.querySelector('#ctl-acabado');
ctlAcabado.addEventListener('click', async (ev) => {
  const b = ev.target.closest('button[data-juego]');
  if (!b || b.getAttribute('aria-pressed') === 'true') return;
  const anterior = ctlAcabado.querySelector('[aria-pressed="true"]');
  marcar(ctlAcabado, b);
  try {
    await aplicarJuego(b.dataset.juego);
  } catch {
    marcar(ctlAcabado, anterior);
  }
});

for (const [id, material] of [['#ctl-acero', 'Acero'], ['#ctl-madera', 'Madera']]) {
  const grupo = document.querySelector(id);
  grupo.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-color]');
    if (!b) return;
    marcar(grupo, b);
    tintar(material, b.dataset.color);
  });
}

const vistas = document.querySelector('.vistas');
vistas.addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-vista]');
  if (!b) return;
  const v = VISTAS[b.dataset.vista];
  visor.resetTurntableRotation(0);   // el giro automático rota el modelo, no la cámara
  visor.cameraTarget = v.objetivo;
  visor.cameraOrbit = v.orbita;
  marcar(vistas, b);
});

const btnGiro = document.querySelector('#btn-giro');
btnGiro.addEventListener('click', () => {
  visor.autoRotate = !visor.autoRotate;
  btnGiro.setAttribute('aria-pressed', String(visor.autoRotate));
});

document.querySelector('#btn-reset').addEventListener('click', async () => {
  for (const g of controles) marcar(g, g.querySelector('button'));
  tintar('Acero', '#ffffff');
  tintar('Madera', '#ffffff');
  vistas.querySelector('button').click();
  await aplicarJuego('limpio');
});

visor.addEventListener('load', () => {
  for (const g of controles) g.disabled = false;
  cargarJuego('desgastado').catch(() => juegos.delete('desgastado'));   // precarga en segundo plano
});
