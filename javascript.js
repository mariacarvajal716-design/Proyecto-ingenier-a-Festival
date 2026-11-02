// --- LÓGICA DE LA HU 1 (Registro de Asistentes) ---
document.getElementById('formulario-registro').addEventListener('submit', function(evento) {
    evento.preventDefault();
    const nombre = document.getElementById('nombre').value;

    // Aquí exactamente es donde se genera el ID único
    const idUnico = 'NB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('id-generado').innerText = idUnico;
    document.getElementById('resultado-id').classList.remove('hidden');
    document.getElementById('formulario-registro').reset();
});

const modalRegistro = document.getElementById('modal-registro');
const btnAbrirRegistro = document.getElementById('abrir-modal');
const btnCerrarRegistro = document.getElementById('cerrar-modal');

if (btnAbrirRegistro) btnAbrirRegistro.addEventListener('click', () => modalRegistro.classList.remove('hidden'));
if (btnCerrarRegistro) {
    btnCerrarRegistro.addEventListener('click', () => {
        modalRegistro.classList.add('hidden');
        document.getElementById('resultado-id').classList.add('hidden');
    });
}


// --- LÓGICA DE LA HU 2 (Fila Virtual) ---
const modalFila = document.getElementById('modal-fila');
const btnAbrirFilaNav = document.getElementById('abrir-fila');
const btnAbrirFilaCentro = document.getElementById('abrir-fila-centro');
const btnCerrarFila = document.getElementById('cerrar-fila');
const tiempoTexto = document.getElementById('tiempo-espera');
const personasTexto = document.getElementById('personas-fila');
let intervaloFila;

function iniciarFila() {
    modalFila.classList.remove('hidden');
    let tiempoRestante = 300;
    const totalPersonas = 1204;

    intervaloFila = setInterval(() => {
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        tiempoTexto.innerText = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

        let personasRestantes = Math.floor((tiempoRestante / 300) * totalPersonas);
        personasTexto.innerText = personasRestantes.toLocaleString();

        if (tiempoRestante > 0) {
            tiempoRestante--;
        } else {
            clearInterval(intervaloFila);
            tiempoTexto.innerText = "00:00";
            tiempoTexto.classList.replace('text-white', 'text-green-500');
            personasTexto.innerText = "0";
        }
    }, 1000);
}

if (btnAbrirFilaNav) btnAbrirFilaNav.addEventListener('click', iniciarFila);
if (btnAbrirFilaCentro) btnAbrirFilaCentro.addEventListener('click', iniciarFila);

if (btnCerrarFila) {
    btnCerrarFila.addEventListener('click', () => {
        modalFila.classList.add('hidden');
        clearInterval(intervaloFila);
        tiempoTexto.innerText = "05:00";
        tiempoTexto.classList.replace('text-green-500', 'text-white');
        personasTexto.innerText = "1,204";
    });
}


// --- LÓGICA DE LA HU 6 (Perfil de Asistente e Historial) ---
const modalPerfil = document.getElementById('modal-perfil');
const btnAbrirPerfil = document.getElementById('abrir-perfil');
const btnCerrarPerfil = document.getElementById('cerrar-perfil');

if (btnAbrirPerfil) btnAbrirPerfil.addEventListener('click', () => modalPerfil.classList.remove('hidden'));
if (btnCerrarPerfil) btnCerrarPerfil.addEventListener('click', () => modalPerfil.classList.add('hidden'));


// --- LÓGICA DE INICIO DE SESIÓN CON CONTROL DE ROLES ---
const modalLogin = document.getElementById('modal-login');
const btnAbrirLogin = document.getElementById('abrir-login');
const btnCerrarLogin = document.getElementById('cerrar-login');

if (btnAbrirLogin) btnAbrirLogin.addEventListener('click', () => modalLogin.classList.remove('hidden'));
if (btnCerrarLogin) btnCerrarLogin.addEventListener('click', () => modalLogin.classList.add('hidden'));

document.getElementById('formulario-login').addEventListener('submit', function(e) {
    e.preventDefault();
    const correo = document.getElementById('login-correo').value;
    const btnAgregarArtista = document.getElementById('abrir-nuevo-artista');

    // Validación por rol simulada según el correo electrónico
    if (correo.toLowerCase().includes('admin') || correo.toLowerCase().includes('@nightbass.com')) {
        alert(`¡Sesión iniciada como ORGANIZADOR (${correo})! Se habilitó el panel de gestión.`);
        btnAgregarArtista.classList.remove('hidden'); // Muestra el botón de creador de artistas
    } else {
        alert(`¡Sesión iniciada como ASISTENTE (${correo})!`);
        btnAgregarArtista.classList.add('hidden'); // Mantiene oculto el botón administrativo
    }

    modalLogin.classList.add('hidden');
    document.getElementById('formulario-login').reset();
});


// --- LÓGICA DE LA HU 7 (Mostrar entrada mediante código QR ) ---
const modalQR = document.getElementById('modal-qr');
const btnCerrarQR = document.getElementById('cerrar-qr');
const contenedorQR = document.getElementById('contenedor-qr');
const qrTicketId = document.getElementById('qr-ticket-id');

document.querySelectorAll('.btn-ver-qr').forEach(boton => {
    boton.addEventListener('click', function() {
        const idTicket = this.getAttribute('data-id');

        // impiar contenedor
        contenedorQR.innerHTML = "";
        qrTicketId.innerText = `Código Ticket: ${idTicket}`;

        // QR onichan
        new QRCode(contenedorQR, {
            text: `NIGHTBASS-TICKET-VALIDATION:${idTicket}`,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        modalQR.classList.remove('hidden');
    });
});

if (btnCerrarQR) btnCerrarQR.addEventListener('click', () => modalQR.classList.add('hidden'));


// --- LÓGICA DE LA HU 8 / HU 9 (Agregar un nuevo artista al Line up - organizador) ---
const modalNuevoArtista = document.getElementById('modal-nuevo-artista');
const btnAbrirNuevoArtista = document.getElementById('abrir-nuevo-artista');
const btnCerrarNuevoArtista = document.getElementById('cerrar-nuevo-artista');
const gridLineup = document.getElementById('grid-lineup');

if (btnAbrirNuevoArtista) btnAbrirNuevoArtista.addEventListener('click', () => modalNuevoArtista.classList.remove('hidden'));
if (btnCerrarNuevoArtista) btnCerrarNuevoArtista.addEventListener('click', () => modalNuevoArtista.classList.add('hidden'));

document.getElementById('formulario-artista').addEventListener('submit', function(evento) {
    evento.preventDefault();

    // datos del formulario de creación
    const nombre = document.getElementById('artista-nombre').value;
    const genero = document.getElementById('artista-genero').value;
    const escenario = document.getElementById('artista-escenario').value;
    const horario = document.getElementById('artista-horario').value;
    const foto = document.getElementById('artista-foto').value;

    // Creación de la tarjeta de presentación
    const tarjetaArtista = document.createElement('div');
    tarjetaArtista.className = 'bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col';
    tarjetaArtista.innerHTML = `
        <img src="${foto}" alt="${nombre}" class="h-48 w-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'">
        <div class="p-4">
            <span class="text-xs font-bold text-orange-500 uppercase">${genero}</span>
            <h3 class="text-xl font-bold mt-1">${nombre}</h3>
            <p class="text-xs text-gray-400 mt-2">Escenario: <span class="text-white">${escenario}</span></p>
            <p class="text-xs text-gray-400">Horario: <span class="text-white">${horario}</span></p>
        </div>
    `;


    gridLineup.appendChild(tarjetaArtista);

    modalNuevoArtista.classList.add('hidden');
    document.getElementById('formulario-artista').reset();
});