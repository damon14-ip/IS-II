const mysql = require('mysql2/promise');
require('dotenv').config();

// src/config/db.js

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '-05:00', 
    // AGREGA ESTA LÍNEA CLAVE:
    dateStrings: true, 
    waitForConnections: true,
    connectionLimit: 10
});

// Test de conexión
(async () => {
    try {
        const connection = await pool.getConnection();
        // Verificamos la hora actual del servidor MySQL para confirmar sincronización
        const [rows] = await connection.query("SELECT NOW() as horaActual");
        connection.release();
        console.log('✅ Conectado a MySQL (Puerto 3307)');
        console.log('⏰ Hora del Servidor DB:', rows[0].horaActual);
    } catch (error) {
        console.error('❌ Error de conexión MySQL:', error.message);
    }
})();

module.exports = pool;