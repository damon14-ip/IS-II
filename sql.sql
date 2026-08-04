DROP DATABASE IF EXISTS clinicadental;
CREATE DATABASE clinicadental;
USE clinicadental;

CREATE TABLE persona (
    idPersona INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    genero ENUM('Masculino','Femenino','Otro'),
    rol ENUM('Doctor','Paciente') NOT NULL,
    usuarioLogin VARCHAR(50) UNIQUE,
    contrasena VARCHAR(255),
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE servicio (
    idServicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    duracionMinutos INT
) ENGINE=InnoDB;

CREATE TABLE disponibilidad (
    idDisponibilidad INT AUTO_INCREMENT PRIMARY KEY,
    idPersonaDoctor INT NOT NULL,
    fechaHoraInicio DATETIME NOT NULL,
    fechaHoraFin DATETIME NOT NULL,
    estado ENUM('Disponible','Reservada','Inactiva') DEFAULT 'Disponible',
    CONSTRAINT fk_disponibilidad_doctor
        FOREIGN KEY (idPersonaDoctor)
        REFERENCES persona(idPersona)
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cita (
    idCita INT AUTO_INCREMENT PRIMARY KEY,
    idPersonaPaciente INT NOT NULL,
    idPersonaDoctor INT NOT NULL,
    idServicio INT NOT NULL,
    idDisponibilidad INT,
    fechaHora DATETIME NOT NULL,
    fechaHoraFin DATETIME,
    estado ENUM('Pendiente','Confirmada','Cancelada','Completada') DEFAULT 'Pendiente',
    costo DECIMAL(10,2),
    comentarioPaciente TEXT,
    notasDoctor TEXT,
    CONSTRAINT fk_cita_paciente
        FOREIGN KEY (idPersonaPaciente)
        REFERENCES persona(idPersona)
        ON UPDATE CASCADE,
    CONSTRAINT fk_cita_doctor
        FOREIGN KEY (idPersonaDoctor)
        REFERENCES persona(idPersona)
        ON UPDATE CASCADE,
    CONSTRAINT fk_cita_servicio
        FOREIGN KEY (idServicio)
        REFERENCES servicio(idServicio)
        ON UPDATE CASCADE,
    CONSTRAINT fk_cita_disponibilidad
        FOREIGN KEY (idDisponibilidad)
        REFERENCES disponibilidad(idDisponibilidad)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE historiaclinica (
    idHistorial INT AUTO_INCREMENT PRIMARY KEY,
    idPersonaPaciente INT NOT NULL,
    idPersonaDoctor INT NOT NULL,
    idCita INT,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    diagnostico TEXT,
    tratamiento TEXT,
    notas TEXT,
    CONSTRAINT fk_historiaclinica_paciente
        FOREIGN KEY (idPersonaPaciente)
        REFERENCES persona(idPersona)
        ON UPDATE CASCADE,
    CONSTRAINT fk_historiaclinica_doctor
        FOREIGN KEY (idPersonaDoctor)
        REFERENCES persona(idPersona)
        ON UPDATE CASCADE,
    CONSTRAINT fk_historiaclinica_cita
        FOREIGN KEY (idCita)
        REFERENCES cita(idCita)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE recomendacion (
    idRecomendacion INT AUTO_INCREMENT PRIMARY KEY,
    idPersonaPaciente INT,
    textoRecomendacion TEXT NOT NULL,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recomendacion_paciente
        FOREIGN KEY (idPersonaPaciente)
        REFERENCES persona(idPersona)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reporte (
    idReporte INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    tipoReporte VARCHAR(80),
    descripcion VARCHAR(255),
    fechaGeneracion DATE,
    idPersonaDoctor INT,
    idCita INT,
    CONSTRAINT fk_reporte_doctor
        FOREIGN KEY (idPersonaDoctor)
        REFERENCES persona(idPersona)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_reporte_cita
        FOREIGN KEY (idCita)
        REFERENCES cita(idCita)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO persona (nombre, dni, telefono, genero, rol, usuarioLogin, contrasena)
VALUES ('Yo', '88888888', '987654321', 'Masculino', 'Doctor', 'yo', '$2b$10$3bM7LG7bT5IHYJXx6ziGC.YHQMJAZK0/1RmpAMkJI3dBU1N0x7Z22');

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE servicio;

INSERT INTO servicio (nombre, descripcion, duracionMinutos) VALUES
('Odontología General', 'Limpieza, curaciones y revisión general', 30),
('Prótesis Parcial', 'Prótesis removibles metálicas o acrílicas', 60),
('Ortodoncia', 'Brackets, alineadores y corrección de mordida', 45),
('Prótesis', 'Coronas, puentes y prótesis fija', 90),
('Implantes', 'Colocación de implantes de titanio', 120),
('Coronas', 'Restauración completa del diente', 60),
('Puentes de Zirconio', 'Estructuras fijas de alta estética', 90),
('Zirconio', 'Prótesis libres de metal', 90),
('Carillas', 'Estética dental frontal', 60),
('Blanqueamientos', 'Aclaramiento dental', 45),
('Curaciones', 'Restauración con resina', 30);

SET FOREIGN_KEY_CHECKS = 1;

SHOW TABLES;
SELECT * FROM persona;
SELECT * FROM servicio;

USE clinicadental;

CREATE TABLE IF NOT EXISTS bloqueo_agenda (
    idBloqueo INT AUTO_INCREMENT PRIMARY KEY,
    fechaInicio DATETIME NOT NULL,
    fechaFin DATETIME NOT NULL,
    motivo VARCHAR(100), -- Ej: "Feriado", "Congreso", "Enfermedad"
    idPersonaDoctor INT NULL, -- Si es NULL, es bloqueo general (feriado nacional)
    CONSTRAINT fk_bloqueo_doc FOREIGN KEY (idPersonaDoctor) REFERENCES persona(idPersona)
) ENGINE=InnoDB;

ALTER TABLE cita ADD CONSTRAINT unique_agenda_doctor UNIQUE (idPersonaDoctor, fechaHora);
   SELECT idPersona, usuarioLogin, contrasena, rol 
FROM persona 
WHERE rol = 'Doctor';

ALTER TABLE cita ADD COLUMN comprobantePago VARCHAR(255) NULL;
ALTER TABLE cita MODIFY COLUMN estado ENUM('Pendiente', 'Confirmada', 'Cancelada', 'NoAsistio', 'Observado') DEFAULT 'Pendiente';
