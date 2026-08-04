const pool = require('../config/db'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Importamos bcrypt[cite: 1]

exports.login = async (req, res) => {
    const { usuario, contrasena } = req.body; 

    try {
        // 1. Buscamos al usuario por su login (sin incluir la contraseña en el WHERE)[cite: 1]
        const [rows] = await pool.query(
            "SELECT * FROM persona WHERE usuarioLogin = ? AND rol = 'Doctor'",
            [usuario] 
        );

        if (rows.length > 0) {
            const doctor = rows[0];
            
            // 2. Comparamos el hash guardado con la contraseña que viene del frontend
            const match = await bcrypt.compare(contrasena, doctor.contrasena);

            if (match) {
                // Si coinciden, generamos el token (RS012)
                const token = jwt.sign(
                    { id: doctor.idPersona, rol: doctor.rol },
                    process.env.JWT_SECRET || 'llave_super_secreta_ceramic_dent',
                    { expiresIn: '8h' }
                );

                return res.json({
                    success: true,
                    message: 'Bienvenido Doctor',
                    token: token,
                    doctor: {
                        id: doctor.idPersona,
                        nombre: doctor.nombre
                    }
                });
            }
        }
        
        // Si no existe el usuario o la contraseña no coincide (mensajes genéricos por seguridad)
        return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });

    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};