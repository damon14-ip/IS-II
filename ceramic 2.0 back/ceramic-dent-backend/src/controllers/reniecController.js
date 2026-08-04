const axios = require('axios');

// EXPRESIÓN REGULAR PARA DNI
const DNI_REGEX = /^\d{8}$/;

exports.consultarDNI = async (req, res) => {
    let { dni } = req.body;
    
    // Sanitización
    dni = dni ? String(dni).trim() : '';

    const token = 'apis-token-12953.B9MDGaSEwHJRCGhJOALhrXcv3DBSawcC';

    // Validación estricta: No solo verificamos tamaño, sino que sean EXCLUSIVAMENTE números
    if (!dni || !DNI_REGEX.test(dni)) {
        return res.status(400).json({ success: false, message: "DNI inválido. Debe contener exactamente 8 dígitos numéricos." });
    }

    try {
        const response = await axios.get(`https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = response.data;
        const nombreCompleto = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;

        res.json({ 
            success: true, 
            nombreCompleto: nombreCompleto,
            data: data 
        });

    } catch (error) {
        console.error("Error API RENIEC:", error.message);
        res.status(404).json({ success: false, message: "DNI no encontrado o error de servicio." });
    }
};