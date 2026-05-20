const express = require('express');
const cors    = require('cors');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS: acepta peticiones desde cualquier origen ──
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-admin-key','Authorization']
}));

// Responder preflight OPTIONS
app.options('*', cors());

app.use(express.json());

const ADMIN_KEY = process.env.ADMIN_KEY || 'cambiar_esta_clave';

// ── Leer / guardar clientes ──
function getClientes() {
  try {
    if (!fs.existsSync('./clientes.json')) {
      fs.writeFileSync('./clientes.json', JSON.stringify({
        "DEMO_EMPRESA": {
          "nombre": "Empresa Demo",
          "activa": true,
          "vence": "2027-12-31",
          "plan": "estandar",
          "dominios": []
        }
      }, null, 2));
    }
    return JSON.parse(fs.readFileSync('./clientes.json', 'utf8'));
  } catch(e) {
    return {};
  }
}

function saveClientes(data) {
  fs.writeFileSync('./clientes.json', JSON.stringify(data, null, 2));
}

// ── Health check ──
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor de licencias activo' });
});

// ── Verificar licencia (el sistema de inventarios llama esto) ──
app.get('/api/licencia/:clienteId', (req, res) => {
  const clientes = getClientes();
  const cliente  = clientes[req.params.clienteId];
  if (!cliente) return res.json({ activa: false, mensaje: 'Cliente no registrado' });
  const activa = cliente.activa && new Date(cliente.vence) > new Date();
  res.json({ activa, nombre: cliente.nombre, plan: cliente.plan, vence: cliente.vence });
});

// ── Admin: ver clientes ──
app.get('/admin/clientes', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'No autorizado' });
  res.json(getClientes());
});

// ── Admin: crear cliente ──
app.post('/admin/cliente', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'No autorizado' });
  const { id, nombre, plan, vence, dominios } = req.body;
  if (!id || !nombre) return res.status(400).json({ error: 'Faltan campos id y nombre' });
  const clientes = getClientes();
  clientes[id] = { nombre, activa: true, vence: vence||'2027-12-31', plan: plan||'estandar', dominios: dominios||[] };
  saveClientes(clientes);
  res.json({ ok: true, cliente: clientes[id] });
});

// ── Admin: activar ──
app.post('/admin/activar/:id', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'No autorizado' });
  const clientes = getClientes();
  if (!clientes[req.params.id]) return res.status(404).json({ error: 'No existe' });
  clientes[req.params.id].activa = true;
  saveClientes(clientes);
  res.json({ ok: true });
});

// ── Admin: suspender ──
app.post('/admin/suspender/:id', (req, res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ error: 'No autorizado' });
  const clientes = getClientes();
  if (!clientes[req.params.id]) return res.status(404).json({ error: 'No existe' });
  clientes[req.params.id].activa = false;
  saveClientes(clientes);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
