const pool = require('../config/db'); 
const Persona = require('../models/Persona'); 

// EXPRESIÓN REGULAR PARA DNI
const DNI_REGEX = /^\d{8}$/;

// 1. LISTAR TODOS LOS PACIENTES
exports.listarPacientes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM persona WHERE rol = 'Paciente' ORDER BY fechaRegistro DESC"
        );
        res.json(rows);
    } catch (error) {
        console.error("Error listarPacientes:", error);
        res.status(500).json({ message: "Error al obtener pacientes" });
    }
};

// 2. BUSCAR POR DNI (CON SANITIZACIÓN)
exports.buscarPorDNI = async (req, res) => {
    let { dni } = req.params;
    
    // Sanitización
    dni = dni ? String(dni).trim() : '';

    // Validación Estricta
    if (!DNI_REGEX.test(dni)) {
        return res.status(400).json({ message: "DNI inválido. Formato incorrecto." });
    }

    try {
        const persona = await Persona.buscarPorDNI(dni);
        if (persona) {
            return res.json(persona);
        } else {
            return res.status(404).json({ message: "Persona no encontrada" });
        }
    } catch (error) {
        console.error("Error buscarPorDNI:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
};