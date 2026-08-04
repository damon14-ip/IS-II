const Cita = require("../models/Cita");
const pool = require('../config/db'); 
const fs = require('fs'); 

// EXPRESIONES REGULARES DE SEGURIDAD (RS011)
const DNI_REGEX = /^\d{8}$/; 
const PHONE_REGEX = /^\d{9}$/; 

exports.getCitas = async (req, res) => {
  console.log("🔥 [Ruta Pública] - Petición de citas autorizada sin token"); 
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (fechaInicio && fechaFin) {
        const rows = await Cita.obtenerEnRango(fechaInicio, fechaFin);
        return res.json(rows);
    } else {
        const lista = await Cita.listar();
        return res.json(lista);
    }
  } catch (error) {
    console.error("❌ Error en getCitas:", error);
    res.status(500).json({ error: "Error al obtener citas" });
  }
};

exports.crearCita = async (req, res) => {
  try {
    let { nombre, dni, telefono, idServicio, fechaHora } = req.body;

    nombre = nombre ? String(nombre).trim() : '';
    dni = dni ? String(dni).trim() : '';
    telefono = telefono ? String(telefono).trim() : '';
    fechaHora = fechaHora ? String(fechaHora).trim() : '';

    if (!nombre || !dni || !idServicio || !fechaHora) {
      return res.status(400).json({ error: "Faltan datos obligatorios o envió campos vacíos." });
    }

    if (!DNI_REGEX.test(dni)) {
        return res.status(400).json({ error: "El DNI es inválido." });
    }

    if (telefono && !PHONE_REGEX.test(telefono)) {
        return res.status(400).json({ error: "El teléfono es inválido." });
    }

    const idCita = await Cita.crear({
      nombre, dni, telefono: telefono || null,
      idServicio: Number(idServicio), fechaHora
    });

    return res.status(201).json({ message: "Cita creada", idCita });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        return res.status(409).json({ success: false, message: "¡Horario ocupado!" });
    }
    console.error(error);
    return res.status(500).json({ error: "Error interno" });
  }
};

exports.crearCitaConComprobante = async (req, res) => {
    try {
        const fileComprobante = req.files.find(f => f.fieldname === 'comprobante');
        const fileCita = req.files.find(f => f.fieldname === 'cita');

        if (!fileComprobante || (!fileCita && !req.body.cita)) {
            return res.status(400).json({ error: "Faltan datos o no se adjuntó la imagen." });
        }

        let datosCita;
        if (req.body.cita) {
            datosCita = JSON.parse(req.body.cita);
        } else {
            datosCita = JSON.parse(fs.readFileSync(fileCita.path, 'utf8'));
            fs.unlinkSync(fileCita.path); 
        }

        const { nombre, dni, telefono, idServicio, fechaHora } = datosCita;
        
        if (!DNI_REGEX.test(dni)) return res.status(400).json({ error: "DNI inválido." });

        const idCita = await Cita.crear({
            nombre, dni, telefono: telefono || null,
            idServicio: Number(idServicio), fechaHora,
            comprobantePago: fileComprobante.filename 
        });

        return res.status(201).json({ message: "Cita creada con voucher", idCita });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ success: false, message: "¡Horario ocupado!" });
        }
        console.error(error);
        return res.status(500).json({ error: "Error interno al procesar comprobante" });
    }
};

// === ACTUALIZADO: MANEJO DEL "LIMBO" (Corregido a 5 minutos) ===
exports.actualizarEstadoCita = async (req, res) => {
    try {
        const { id } = req.params;
        let { estado, fechaHoraFin } = req.body;
        estado = estado ? String(estado).trim() : '';

        if (!['Confirmada', 'Cancelada', 'Observado'].includes(estado)) {
             return res.status(400).json({ error: "Estado no permitido o manipulado." });
        }

        if (estado === 'Confirmada') {
             await Cita.confirmar(Number(id), fechaHoraFin);
        } else if (estado === 'Cancelada') {
             await Cita.eliminar(Number(id)); 
        } else if (estado === 'Observado') {
             await Cita.actualizarEstadoSimple(Number(id), 'Observado');
             
             // ⏱️ INICIA EL RELOJ DE 5 MINUTOS (300,000 milisegundos exactos)
             setTimeout(async () => {
                 try {
                     const citaActual = await Cita.buscarPorId(Number(id));
                     // Si pasaron 5 mins y la cita sigue en 'Observado', se cancela sola
                     if (citaActual && citaActual.estado === 'Observado') {
                         await Cita.eliminar(Number(id));
                         console.log(`⏳ LIMBO: Cita ${id} cancelada automáticamente (Expiró el tiempo de validación).`);
                     }
                 } catch (err) {
                     console.error("Error ejecutando la autoliberación:", err);
                 }
             }, 300000); 
        }

        res.json({ message: `Cita actualizada a ${estado}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar cita" });
    }
};

exports.getServicios = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM servicio");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo servicios" });
    }
};

exports.consultarEstado = async (req, res) => {
    try {
        let { dni } = req.params;
        dni = dni ? String(dni).trim() : '';

        if (!DNI_REGEX.test(dni)) {
            return res.status(400).json({ success: false, message: 'DNI con formato inválido.' });
        }

        const cita = await Cita.buscarPorDNI(dni);
        if (!cita) {
            return res.status(404).json({ success: false, message: 'No se encontraron citas.' });
        }
        return res.json({ success: true, cita });
    } catch (error) {
        console.error("Error al consultar estado:", error);
        res.status(500).json({ success: false, error: "Error interno" });
    }
};

exports.generarReporteRango = async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        if (!inicio || !fin || inicio.trim() === '' || fin.trim() === '') {
            return res.status(400).json({ success: false, message: 'Faltan fechas.' });
        }
        
        const reporte = await Cita.generarReporte(inicio, fin);
        
        const datosLimpios = {
            totalCitas: reporte.totalCitas || 0,
            pendientes: reporte.pendientes || 0,
            confirmadas: reporte.confirmadas || 0,
            canceladas: reporte.canceladas || 0
        };

        return res.json({ success: true, datos: datosLimpios });
    } catch (error) {
        console.error("Error al generar reporte:", error);
        res.status(500).json({ success: false, error: "Error interno" });
    }
};

exports.obtenerHistorialPaciente = async (req, res) => {
    try {
        let { dni } = req.params;
        dni = dni ? String(dni).trim() : '';

        if (!DNI_REGEX.test(dni)) {
            return res.status(400).json({ success: false, message: 'DNI con formato inválido.' });
        }

        const historial = await Cita.obtenerHistorialPorDNI(dni);
        return res.json({ success: true, historial });
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ success: false, error: "Error interno" });
    }
};