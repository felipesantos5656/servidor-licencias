const express = require('express');
const cors    = require('cors');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// Permite peticiones desde cualquier origen (GitHub Pages, etc.)
app.use(cors());
app.use(express.json());

// Clave secreta para administrar (cámbiala por una propia)
const ADMIN_KEY = process.env.ADMIN_KEY || 'mi_clave_secreta_2026';

// ── Función para leer clientes ──
function getClientes() {
  try {
    return JSON.parse(fs.readFileSync('./clientes.json', 'utf8'));
  } catch(e) {
    return {};
  }
}

// ── Función para guardar clientes ──
function saveClientes(data) {
  fs.writeFileSync('./clientes.json', JSON.stringify(data, null, 2));
}

// ══════════════════════════════════════════════
// ENDPOINT PRINCIPAL — el sistema lo consulta
// GET /api/licencia/:clienteId
// ══════════════════════════════════════════════
app.get('/api/licencia/:clienteId', (req, res) => {
  const { clienteId } = req.params;
  const clientes = getClientes();
  const cliente  = clientes[clienteId];

  if (!cliente) {
    return res.json({ activa: false, mensaje: 'Cliente no registrado' });
  }

  // Verificar si venció
  const hoy    = new Date();
  const vence  = new Date(cliente.vence);
  const activa = cliente.activa && vence > hoy;

  res.json({
    activa,
    nombre:  cliente.nombre,
    plan:    cliente.plan,
    vence:   cliente.vence,
    mensaje: activa ? 'Licencia activa' : 'Licencia suspendida o vencida'
  });
});

// ══════════════════════════════════════════════
// ENDPOINTS DE ADMINISTRACIÓN (solo tú los usas)
// ══════════════════════════════════════════════

// Ver todos los clientes
app.get('/admin/clientes', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  res.json(getClientes());
});

// Activar un cliente
app.post('/admin/activar/:clienteId', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const clientes = getClientes();
  if (!clientes[req.params.clienteId]) {
    return res.status(404).json({ error: 'Cliente no existe' });
  }
  clientes[req.params.clienteId].activa = true;
  saveClientes(clientes);
  res.json({ ok: true, mensaje: 'Cliente activado' });
});

// Suspender un cliente (no pagó)
app.post('/admin/suspender/:clienteId', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const clientes = getClientes();
  if (!clientes[req.params.clienteId]) {
    return res.status(404).json({ error: 'Cliente no existe' });
  }
  clientes[req.params.clienteId].activa = false;
  saveClientes(clientes);
  res.json({ ok: true, mensaje: 'Cliente suspendido' });
});

// Crear cliente nuevo
app.post('/admin/cliente', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { id, nombre, plan, vence, dominios } = req.body;
  if (!id || !nombre) {
    return res.status(400).json({ error: 'Faltan campos: id y nombre son requeridos' });
  }
  const clientes = getClientes();
  clientes[id] = {
    nombre,
    activa:   true,
    vence:    vence || '2027-12-31',
    plan:     plan  || 'estandar',
    dominios: dominios || []
  };
  saveClientes(clientes);
  res.json({ ok: true, mensaje: 'Cliente creado', cliente: clientes[id] });
});

// ── Inicio ──
app.listen(PORT, () => {
  console.log(`Servidor de licencias corriendo en puerto ${PORT}`);
});