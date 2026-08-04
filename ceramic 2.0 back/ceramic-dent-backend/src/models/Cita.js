const pool = require("../config/db");

const Cita = {
  
  async crear(datos) {
    const { nombre, dni, telefono, idServicio, fechaHora, comprobantePago } = datos;

    const [serv] = await pool.query("SELECT duracionMinutos FROM servicio WHERE idServicio = ?", [idServicio]);
    const duracion = serv[0]?.duracionMinutos || 30;

    const inicioDate = new Date(fechaHora);
    const finDate = new Date(inicioDate.getTime() + duracion * 60000);
    const pad = (n) => n.toString().padStart(2, '0');
    const formatear = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const fechaHoraInicio = formatear(inicioDate);
    const fechaHoraFin = formatear(finDate);

    // === ACTUALIZADO: UPSERT DEL TELÉFONO (Punto 4) ===
    const [existe] = await pool.query("SELECT idPersona, telefono FROM persona WHERE dni = ? LIMIT 1", [dni]);
    let idPaciente; 
    
    if (existe.length > 0) {
        idPaciente = existe[0].idPersona; 
        
        // Si el paciente envía un teléfono diferente al que teníamos, lo actualizamos silenciosamente
        if (telefono && existe[0].telefono !== telefono) {
            await pool.query("UPDATE persona SET telefono = ? WHERE idPersona = ?", [telefono, idPaciente]);
            console.log(`📱 Teléfono actualizado en BD para el DNI: ${dni}`);
        }
    } else {
        // Paciente Nuevo
        const [nuevo] = await pool.query(
            `INSERT INTO persona (nombre, dni, telefono, rol, fechaRegistro) VALUES (?, ?, ?, 'Paciente', NOW())`,
            [nombre, dni, telefono]
        );
        idPaciente = nuevo.insertId; 
    }

    const [cita] = await pool.query(
        `INSERT INTO cita (idPersonaPaciente, idPersonaDoctor, idServicio, fechaHora, fechaHoraFin, estado, comprobantePago)
         VALUES (?, 1, ?, ?, ?, 'Pendiente', ?)`,
        [idPaciente, idServicio, fechaHoraInicio, fechaHoraFin, comprobantePago || null]
    );
    return cita.insertId;
  },

  async listar() {
    const sql = `
      SELECT c.*, p.nombre AS paciente, p.telefono, p.dni, s.nombre AS nombreServicio 
      FROM cita c
      JOIN persona p ON c.idPersonaPaciente = p.idPersona
      JOIN servicio s ON c.idServicio = s.idServicio
      ORDER BY c.fechaHora DESC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },

  async listarConfirmadas() {
    const sql = `
      SELECT c.*, p.nombre AS paciente, p.telefono, p.dni, s.nombre AS nombreServicio 
      FROM cita c
      JOIN persona p ON c.idPersonaPaciente = p.idPersona
      JOIN servicio s ON c.idServicio = s.idServicio
      WHERE c.estado = 'Confirmada'
      ORDER BY c.fechaHora ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },

  async confirmar(idCita, fechaHoraFin) {
    let fechaLimpia = fechaHoraFin;
    if (fechaHoraFin.includes('T')) {
      fechaLimpia = fechaHoraFin.split('T')[0] + ' ' + fechaHoraFin.split('T')[1].substring(0, 8);
    }
    const [result] = await pool.query(
      "UPDATE cita SET estado = 'Confirmada', fechaHoraFin = ? WHERE idCita = ?",
      [fechaLimpia, idCita]
    );
    return result.affectedRows;
  },

  async actualizarEstadoSimple(idCita, estado) {
    const [result] = await pool.query("UPDATE cita SET estado = ? WHERE idCita = ?", [estado, idCita]);
    return result.affectedRows;
  },

  async buscarPorId(idCita) {
    const [rows] = await pool.query("SELECT * FROM cita WHERE idCita = ?", [idCita]);
    return rows[0];
  },

  async eliminar(idCita) {
    const [result] = await pool.query(
      "UPDATE cita SET estado = 'Cancelada' WHERE idCita = ?", 
      [idCita]
    );
    return result.affectedRows;
  },

  async obtenerEnRango(fechaInicio, fechaFin) {
    const inicioBusqueda = `${fechaInicio} 00:00:00`;
    const finBusqueda = `${fechaFin} 23:59:59`;

    const sql = `
        SELECT fechaHora, fechaHoraFin 
        FROM cita 
        WHERE fechaHora BETWEEN ? AND ? 
        AND estado != 'Cancelada' 
    `;
    const [rows] = await pool.query(sql, [inicioBusqueda, finBusqueda]);
    return rows;
  },

  async buscarPorDNI(dni) {
    const sql = `
      SELECT c.estado, c.fechaHora, s.nombre AS nombreServicio, p.nombre AS paciente
      FROM cita c
      JOIN persona p ON c.idPersonaPaciente = p.idPersona
      JOIN servicio s ON c.idServicio = s.idServicio
      WHERE p.dni = ?
      ORDER BY c.fechaHora DESC
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [dni]);
    return rows[0]; 
  },

  async generarReporte(fechaInicio, fechaFin) {
    const inicio = `${fechaInicio} 00:00:00`;
    const fin = `${fechaFin} 23:59:59`;

    const sql = `
      SELECT 
        COUNT(*) AS totalCitas,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'Confirmada' THEN 1 ELSE 0 END) AS confirmadas,
        SUM(CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END) AS canceladas
      FROM cita
      WHERE fechaHora BETWEEN ? AND ?
    `;
    const [rows] = await pool.query(sql, [inicio, fin]);
    return rows[0]; 
  },

  async obtenerHistorialPorDNI(dni) {
    const sql = `
      SELECT c.fechaHora, c.estado, s.nombre AS nombreServicio
      FROM cita c
      JOIN persona p ON c.idPersonaPaciente = p.idPersona
      JOIN servicio s ON c.idServicio = s.idServicio
      WHERE p.dni = ?
      ORDER BY c.fechaHora DESC
    `;
    const [rows] = await pool.query(sql, [dni]);
    return rows;
  }
};

module.exports = Cita;