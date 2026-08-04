const pool = require('../config/db');

// 1. Obtener bloqueos (Rango de fechas para el calendario)
exports.getBloqueos = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        let sql = `SELECT * FROM bloqueo_agenda`;
        const params = [];

        // Si envían fechas, filtramos (opcional, pero recomendado)
        if (fechaInicio && fechaFin) {
             sql += ` WHERE (fechaInicio BETWEEN ? AND ?) OR (fechaFin BETWEEN ? AND ?)`;
             params.push(`${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`, `${fechaInicio} 00:00:00`, `${fechaFin} 23:59:59`);
        }

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error("Error getBloqueos:", error);
        res.status(500).json({ message: 'Error al obtener bloqueos' });
    }
};

// 2. Crear bloqueo (Para el Admin)
exports.crearBloqueo = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, motivo, idPersonaDoctor } = req.body;
        
        const [result] = await pool.query(
            'INSERT INTO bloqueo_agenda (fechaInicio, fechaFin, motivo, idPersonaDoctor) VALUES (?, ?, ?, ?)',
            [fechaInicio, fechaFin, motivo, idPersonaDoctor || null]
        );
        
        res.json({ id: result.insertId, message: 'Bloqueo creado' });
    } catch (error) {
        console.error("Error crearBloqueo:", error);
        res.status(500).json({ message: 'Error al crear bloqueo' });
    }
};

// 3. Eliminar bloqueo
exports.eliminarBloqueo = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM bloqueo_agenda WHERE idBloqueo = ?', [id]);
        res.json({ message: 'Bloqueo eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar bloqueo' });
    }
};