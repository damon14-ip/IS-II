const pool = require('../config/db');

const Persona = {
    // Buscar una persona por su DNI
    async buscarPorDNI(dni) {
        const sql = "SELECT * FROM persona WHERE dni = ? LIMIT 1";
        const [rows] = await pool.query(sql, [dni]);
        
        // Retorna el primer resultado o undefined si no existe
        return rows[0];
    }
};

module.exports = Persona;