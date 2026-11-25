# Night Bass Festival

## Backend PostgreSQL local

El proyecto incluye una API Express para registro, inicio/cierre de sesión y almacenamiento de entradas. La API usa las tablas del modelo del festival (`Asistente`, `Tipo_Entrada`, `Entrada` y las demás), además de `Credencial_Asistente` y `Sesion_Asistente` para autenticar de forma segura sin añadir contraseñas a la tabla `Asistente`. PostgreSQL guarda las cuentas, sesiones y entradas; las contraseñas se almacenan con hash bcrypt. No conectes el navegador directamente a PostgreSQL.

1. Instala Node.js 18 o posterior y PostgreSQL.
2. En pgAdmin 4 usa la base de datos que quieres conectar (por ejemplo, `NightBass`) o crea una llamada `festival`.
3. En la terminal, desde la carpeta del proyecto, instala las dependencias:

   ```powershell
   npm install
   ```

4. Copia `.env.example` como `.env`; configura la contraseña PostgreSQL y el nombre de la base elegida en `DATABASE_URL`.
5. Inicia el sitio y el backend:

   ```powershell
   npm start
   ```

6. Abre `http://localhost:3000`. Las tablas que falten se crean al iniciar el servidor. Puedes comprobar la conexión en `http://localhost:3000/api/health`.

El registro solicita nombre, identificación (máximo 10 caracteres), correo y contraseña; el teléfono es opcional. Se crea inicialmente el tipo de entrada General a `$120.000 COP` si aún no existe. Puedes administrar categorías y precios en `Tipo_Entrada` desde pgAdmin; el formulario carga automáticamente los tipos con precio válido. El inicio de sesión usa cookies `HttpOnly`, y cada entrada queda asociada al asistente autenticado mediante `num_identificacion`. Las compras son una demostración y no procesan pagos. No publiques `.env` ni uses esta configuración de desarrollo directamente en producción.

El campo `Asistente.rol` habilita los permisos de administración. Además, `jacob289355@gmail.com` siempre recibe permisos de administrador, aunque su columna `rol` tenga otro valor. La aplicación activa automáticamente las herramientas al iniciar sesión con ese correo (no hay botón de modo); el backend protege las rutas de artistas, mapa y servicios. El esquema crea las tablas auxiliares que guardan los detalles visuales de artistas y el mapa.

Los administradores pueden ubicar puntos de hidratación, comida, asistencia médica y accesibilidad sobre el plano cargado, y publicar/editar/eliminar avisos oficiales desde la sección “Avisos y última hora”. Los avisos se almacenan en `aviso_festival`. El enlace de ubicación abre el mapa de Parque Norte, Medellín, para consultar el recinto y cómo llegar.

Para dar permisos a un perfil desde pgAdmin, asigna su rol por correo:

```sql
UPDATE asistente
SET rol = 'administrador'
WHERE LOWER(correo_electronico) = LOWER('correo@ejemplo.com');
```

La aplicación reflejará el cambio al volver a iniciar sesión o recargarla.

Las cuentas y entradas que existían únicamente en `localStorage` no se migran a PostgreSQL; crea una cuenta nueva con el backend activo. El navegador elimina el almacenamiento local antiguo de credenciales para no conservar contraseñas en texto plano.