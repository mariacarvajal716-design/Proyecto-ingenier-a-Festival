CREATE TABLE IF NOT EXISTS tipo_zona (
    id_tipo VARCHAR(10) PRIMARY KEY,
    tipo VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ubicacion (
    id_ubicacion VARCHAR(10) PRIMARY KEY,
    ubicacion VARCHAR(100),
    nombre_zona VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS zona (
    id_zona VARCHAR(10) PRIMARY KEY,
    capacidad_maxima INTEGER,
    id_tipo VARCHAR(10) REFERENCES tipo_zona(id_tipo),
    id_ubicacion VARCHAR(10) REFERENCES ubicacion(id_ubicacion)
);

CREATE TABLE IF NOT EXISTS tipo_escenario (
    id_tipo VARCHAR(10) PRIMARY KEY,
    tipo_escenario VARCHAR(50),
    especificaciones_tecnicas VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS escenario (
    id_escenario VARCHAR(10) PRIMARY KEY,
    nombre_escenario VARCHAR(100),
    cap_maxima_asistentes INTEGER,
    id_tipo VARCHAR(10) REFERENCES tipo_escenario(id_tipo),
    id_zona VARCHAR(10) REFERENCES zona(id_zona)
);

CREATE TABLE IF NOT EXISTS artista (
    id_artista VARCHAR(10) PRIMARY KEY,
    genero_musical VARCHAR(50),
    pais VARCHAR(50),
    numero_integrantes INTEGER,
    nombre_artistico VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS presentacion (
    codigo VARCHAR(10) PRIMARY KEY,
    hora_inicio TIME,
    duracion INTERVAL,
    fecha DATE,
    artista_id VARCHAR(10) REFERENCES artista(id_artista),
    escenario_id VARCHAR(10) REFERENCES escenario(id_escenario)
);

CREATE TABLE IF NOT EXISTS asistente (
    num_identificacion VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100),
    telefono VARCHAR(20),
    correo_electronico VARCHAR(100)
);

ALTER TABLE asistente
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'asistente';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asistente_rol_valido'
          AND conrelid = 'asistente'::regclass
    ) THEN
        ALTER TABLE asistente
            ADD CONSTRAINT asistente_rol_valido
            CHECK (rol IN ('asistente', 'administrador'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS asistente_correo_electronico_unique_idx
    ON asistente (LOWER(correo_electronico));

CREATE TABLE IF NOT EXISTS tipo_entrada (
    id_tipo_entrada VARCHAR(10) PRIMARY KEY,
    tipo_entrada VARCHAR(50),
    precio DECIMAL(10, 2)
);

INSERT INTO tipo_entrada (id_tipo_entrada, tipo_entrada, precio)
SELECT 'GEN', 'General', 120000
WHERE NOT EXISTS (
    SELECT 1 FROM tipo_entrada WHERE LOWER(tipo_entrada) = LOWER('General')
)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS entrada (
    cod_entrada VARCHAR(10) PRIMARY KEY,
    id_tipo_entrada VARCHAR(10) REFERENCES tipo_entrada(id_tipo_entrada),
    fecha_compra DATE,
    num_identificacion VARCHAR(10) REFERENCES asistente(num_identificacion)
);

CREATE INDEX IF NOT EXISTS entrada_asistente_idx
    ON entrada (num_identificacion);

CREATE TABLE IF NOT EXISTS asistente_asiste_presentacion (
    codigo VARCHAR(10) REFERENCES presentacion(codigo),
    num_identificacion VARCHAR(10) REFERENCES asistente(num_identificacion),
    PRIMARY KEY (codigo, num_identificacion)
);

CREATE TABLE IF NOT EXISTS credencial_asistente (
    num_identificacion VARCHAR(10) PRIMARY KEY
        REFERENCES asistente(num_identificacion) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesion_asistente (
    token_hash CHAR(64) PRIMARY KEY,
    num_identificacion VARCHAR(10) NOT NULL
        REFERENCES asistente(num_identificacion) ON DELETE CASCADE,
    expira_en TIMESTAMPTZ NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sesion_asistente_expira_idx
    ON sesion_asistente (expira_en);

CREATE TABLE IF NOT EXISTS festival_artista_detalle (
    id_artista VARCHAR(10) PRIMARY KEY
        REFERENCES artista(id_artista) ON DELETE CASCADE,
    escenario VARCHAR(100) NOT NULL,
    horario VARCHAR(100) NOT NULL,
    foto_data_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mapa_festival (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    imagen_data_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS servicio_mapa (
    id BIGSERIAL PRIMARY KEY,
    x NUMERIC(5, 2) NOT NULL CHECK (x >= 0 AND x <= 100),
    y NUMERIC(5, 2) NOT NULL CHECK (y >= 0 AND y <= 100),
    tipo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200) NOT NULL
);
