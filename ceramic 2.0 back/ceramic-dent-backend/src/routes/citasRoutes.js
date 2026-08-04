const express = require('express');
const router = express.Router();
const multer = require('multer'); // <-- NUEVO: Librería para atrapar archivos
const path = require('path');
const fs = require('fs');

// 1. IMPORTACIONES DE CONTROLADORES
const { login } = require('../controllers/authController');
const { getCitas, crearCita, crearCitaConComprobante, actualizarEstadoCita, getServicios, consultarEstado, generarReporteRango, obtenerHistorialPaciente } = require('../controllers/citaController');
const { getBloqueos, crearBloqueo, eliminarBloqueo } = require('../controllers/BloqueoController');
const { consultarDNI } = require('../controllers/reniecController');
const { listarPacientes, buscarPorDNI } = require('../controllers/personaController'); 

// 2. IMPORTACIÓN DEL MIDDLEWARE DE SEGURIDAD (RS012)
const { verificarToken } = require('../middlewares/authMiddleware');

// ==========================================
// 📁 CONFIGURACIÓN DE MULTER (ALMACENAMIENTO DE IMÁGENES)
// ==========================================
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        if (file.fieldname === 'comprobante') {
            const ext = path.extname(file.originalname) || '.png';
            cb(null, 'voucher-' + uniqueSuffix + ext); // Guarda la imagen con nombre único
        } else {
            cb(null, 'data-' + uniqueSuffix + '.json'); // Atrapa el JSON de Angular
        }
    }
});
const upload = multer({ storage });

// ==========================================
// 🟢 RUTAS PÚBLICAS (No requieren Token JWT)
// ==========================================
router.post('/login', login); 
router.get('/servicios', getServicios); 
router.post('/citas', crearCita); 
router.post('/reniec', consultarDNI); 
router.get('/citas/estado/:dni', consultarEstado); 
router.get('/citas', getCitas);       
router.get('/bloqueos', getBloqueos); 

// 👉 NUEVA RUTA PÚBLICA: Para recibir la cita + Imagen Yape
router.post('/citas/con-comprobante', upload.any(), crearCitaConComprobante);

// ==========================================
// 🔴 RUTAS PRIVADAS (Protegidas por Token JWT)
// ==========================================
router.put('/citas/:id', verificarToken, actualizarEstadoCita);
router.post('/bloqueos', verificarToken, crearBloqueo);
router.delete('/bloqueos/:id', verificarToken, eliminarBloqueo);
router.get('/personas/pacientes', verificarToken, listarPacientes); 
router.get('/persona/:dni', verificarToken, buscarPorDNI);
router.get('/citas/reporte', verificarToken, generarReporteRango);
router.get('/citas/historial/:dni', verificarToken, obtenerHistorialPaciente);

module.exports = router;