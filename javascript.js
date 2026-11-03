// --- CONTROL DE ROL DE ADMINISTRADOR ---
    let esAdministrador = false;
    const btnToggleAdmin = document.getElementById('toggle-admin');
    const estadoRol = document.getElementById('estado-rol');
    const instruccionesMapa = document.getElementById('instrucciones-mapa');
    const btnLimpiarMapa = document.getElementById('btn-limpiar-mapa');
    const labelCargarMapa = document.getElementById('label-cargar-mapa');
    const subtextoPlaceholder = document.getElementById('subtexto-placeholder');

    if (btnToggleAdmin) {
    btnToggleAdmin.addEventListener('click', () => {
        esAdministrador = !esAdministrador;
        const btnAdminArtista = document.getElementById('btn-abrir-modal-artista');
        if (esAdministrador) {
            estadoRol.innerText = "Activado (Admin)";
            btnToggleAdmin.classList.replace('bg-zinc-800', 'bg-orange-600');
            btnToggleAdmin.classList.replace('text-orange-400', 'text-zinc-950');

            if (btnLimpiarMapa) btnLimpiarMapa.classList.remove('!hidden');
            if (labelCargarMapa) labelCargarMapa.classList.remove('!hidden');
            if (btnAdminArtista) btnAdminArtista.classList.remove('!hidden');

            if (subtextoPlaceholder) subtextoPlaceholder.innerText = "Haz clic en 'Cargar Imagen del Mapa' arriba para agregar una imagen.";
            if (instruccionesMapa) instruccionesMapa.innerHTML = '⚠️ <span class="text-orange-400 font-bold">Modo Administrador Activo:</span> Carga el mapa del recinto o haz clic sobre la imagen para <strong>crear/editar servicios</strong>.';
        } else {
            estadoRol.innerText = "Apagado";
            btnToggleAdmin.classList.replace('bg-orange-600', 'bg-zinc-800');
            btnToggleAdmin.classList.replace('text-zinc-950', 'text-orange-400');

            if (btnLimpiarMapa) btnLimpiarMapa.classList.add('!hidden');
            if (labelCargarMapa) labelCargarMapa.classList.add('!hidden');
            if (btnAdminArtista) btnAdminArtista.classList.add('!hidden');

            if (subtextoPlaceholder) subtextoPlaceholder.innerText = "El mapa oficial estará disponible próximamente.";
            if (instruccionesMapa) instruccionesMapa.innerHTML = 'ℹ️ <span class="text-gray-200">Modo Asistente:</span> Puedes ver todos los servicios oficiales activos en el mapa interactivo.';
        }
        cargarServiciosGuardados();
    });
}

    // --- INICIO DE SESIÓN ---
    const modalLogin = document.getElementById('modal-login');
    const abrirLogin = document.getElementById('abrir-login');
    const cerrarLogin = document.getElementById('cerrar-login');
    const formularioLogin = document.getElementById('formulario-login');
    const resultadoLogin = document.getElementById('resultado-login');

    if (abrirLogin && modalLogin) {
    abrirLogin.addEventListener('click', () => modalLogin.classList.remove('hidden'));
}
    if (cerrarLogin && modalLogin) {
    cerrarLogin.addEventListener('click', () => {
        modalLogin.classList.add('hidden');
        if (resultadoLogin) resultadoLogin.classList.add('hidden');
    });
}

    if (formularioLogin) {
    formularioLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        if (resultadoLogin) resultadoLogin.classList.remove('hidden');
        setTimeout(() => {
            if (modalLogin) modalLogin.classList.add('hidden');
            if (resultadoLogin) resultadoLogin.classList.add('hidden');
            formularioLogin.reset();
        }, 1500);
    });
}

    // --- LÓGICA DE REGISTRO Y GENERACIÓN DE ID (HU 1) ---
    const modalRegistro = document.getElementById('modal-registro');
    const abrirModalRegistro = document.getElementById('abrir-modal');
    const cerrarModalRegistro = document.getElementById('cerrar-modal');
    const formularioRegistro = document.getElementById('formulario-registro');

    if (abrirModalRegistro && modalRegistro) {
    abrirModalRegistro.addEventListener('click', () => {
        modalRegistro.classList.remove('hidden');
    });
}

    if (cerrarModalRegistro && modalRegistro) {
    cerrarModalRegistro.addEventListener('click', () => {
        modalRegistro.classList.add('hidden');
        const resultadoId = document.getElementById('resultado-id');
        if (resultadoId) resultadoId.classList.add('hidden');
    });
}

    if (formularioRegistro) {
    formularioRegistro.addEventListener('submit', function(evento) {
        evento.preventDefault();
        const idUnico = 'NB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const idGenerado = document.getElementById('id-generado');
        const resultadoId = document.getElementById('resultado-id');

        if (idGenerado) idGenerado.innerText = idUnico;
        if (resultadoId) resultadoId.classList.remove('hidden');

        // Guardar automáticamente en el historial de entradas (HU 7)
        let entradas = JSON.parse(localStorage.getItem('entradas_usuario') || '[]');
        entradas.push({
            titulo: 'Entrada General - Festival 2027',
            fecha: '12-14 Feb 2027 • Parque Norte',
            id: idUnico,
            estado: 'Activo'
        });
        localStorage.setItem('entradas_usuario', JSON.stringify(entradas));
        cargarEntradasPerfil();

        this.reset();
    });
}

    /// FILA VIRTUAL - HU 2
    const modalFila = document.getElementById('modal-fila');
    const btnAbrirFilaNav = document.getElementById('abrir-fila');
    const btnAbrirFilaCentro = document.getElementById('abrir-fila-centro');
    const btnCerrarFila = document.getElementById('cerrar-fila');
    const tiempoTexto = document.getElementById('tiempo-espera');
    const personasTexto = document.getElementById('personas-fila');
    let intervaloFila;

    function iniciarFila() {
    if (!modalFila) return;
    modalFila.classList.remove('hidden');
    let tiempoRestante = 300;
    const totalPersonas = 1204;

    intervaloFila = setInterval(() => {
    let minutos = Math.floor(tiempoRestante / 60);
    let segundos = tiempoRestante % 60;
    if (tiempoTexto) tiempoTexto.innerText = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

    let personasRestantes = Math.floor((tiempoRestante / 300) * totalPersonas);
    if (personasTexto) personasTexto.innerText = personasRestantes.toLocaleString();

    if (tiempoRestante > 0) {
    tiempoRestante--;
} else {
    clearInterval(intervaloFila);
    if (tiempoTexto) {
    tiempoTexto.innerText = "00:00";
    tiempoTexto.classList.replace('text-white', 'text-green-500');
}
    if (personasTexto) personasTexto.innerText = "0";
}
}, 1000);
}

    if (btnAbrirFilaNav) btnAbrirFilaNav.addEventListener('click', iniciarFila);
    if (btnAbrirFilaCentro) btnAbrirFilaCentro.addEventListener('click', iniciarFila);

    if (btnCerrarFila && modalFila) {
    btnCerrarFila.addEventListener('click', () => {
        modalFila.classList.add('hidden');
        clearInterval(intervaloFila);
        if (tiempoTexto) {
            tiempoTexto.innerText = "05:00";
            tiempoTexto.classList.replace('text-green-500', 'text-white');
        }
        if (personasTexto) personasTexto.innerText = "1,204";
    });
}

    // --- HU 7: CONSULTAR HISTORIAL Y ESTADO DE ENTRADAS (Asistente) ---
    const modalPerfil = document.getElementById('modal-perfil');
    const btnAbrirPerfil = document.getElementById('abrir-perfil');
    const btnCerrarPerfil = document.getElementById('cerrar-perfil');

    if (btnAbrirPerfil && modalPerfil) {
    btnAbrirPerfil.addEventListener('click', () => {
        cargarEntradasPerfil();
        modalPerfil.classList.remove('hidden');
    });
}
    if (btnCerrarPerfil && modalPerfil) {
    btnCerrarPerfil.addEventListener('click', () => modalPerfil.classList.add('hidden'));
}

    function cargarEntradasPerfil() {
    const listaEntradas = document.getElementById('lista-entradas-perfil');
    if (!listaEntradas) return;

    let entradas = JSON.parse(localStorage.getItem('entradas_usuario') || '[]');
    if (entradas.length === 0) {
    entradas = [
{ titulo: 'Entrada General - Día 1', fecha: '12 Feb 2027 • Parque Norte', id: 'NB-9X82PL', estado: 'Activo' }
    ];
    localStorage.setItem('entradas_usuario', JSON.stringify(entradas));
}

    listaEntradas.innerHTML = '';
    entradas.forEach(e => {
    const div = document.createElement('div');
    div.className = 'bg-zinc-950 p-4 rounded border border-zinc-800 flex justify-between items-center cursor-pointer hover:border-orange-500 transition-colors';
    div.innerHTML = `
                <div>
                    <p class="font-bold text-orange-500 uppercase text-sm">${e.titulo}</p>
                    <p class="text-xs text-gray-400 mt-1">${e.fecha} • ID: ${e.id}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="bg-green-500/20 text-green-500 text-xs px-3 py-1 rounded font-bold uppercase">${e.estado}</span>
                    <span class="text-xs text-orange-400 font-bold underline">Ver QR ↗</span>
                </div>
            `;
    // Al hacer clic abre la HU 8 (Código QR con tamaño y contraste óptimos)
    div.addEventListener('click', () => abrirModalQR(e.titulo, e.fecha, e.id));
    listaEntradas.appendChild(div);
});
}

    // --- HU 8: MOSTRAR ENTRADA MEDIANTE CÓDIGO QR (Asistente) ---
    const modalQR = document.getElementById('modal-qr');
    const cerrarQR = document.getElementById('cerrar-qr');
    const qrTituloEntrada = document.getElementById('qr-titulo-entrada');
    const qrDetalleFecha = document.getElementById('qr-detalle-fecha');
    const qrIdBoleto = document.getElementById('qr-id-boleto');

    window.abrirModalQR = function(titulo, fecha, idBoleto) {
    if (qrTituloEntrada) qrTituloEntrada.innerText = titulo;
    if (qrDetalleFecha) qrDetalleFecha.innerText = fecha;
    if (qrIdBoleto) qrIdBoleto.innerText = idBoleto;
    if (modalQR) modalQR.classList.remove('hidden');
};

    if (cerrarQR && modalQR) {
    cerrarQR.addEventListener('click', () => modalQR.classList.add('hidden'));
}

    // --- HU 9: AGREGAR UN NUEVO ARTISTA AL LINE-UP (Organizador) ---
    const modalArtista = document.getElementById('modal-artista');
    const btnAbrirModalArtista = document.getElementById('btn-abrir-modal-artista');
    const cerrarModalArtista = document.getElementById('cerrar-modal-artista');
    const btnCancelarArtista = document.getElementById('btn-cancelar-artista');
    const formArtista = document.getElementById('form-artista');
    const gridLineup = document.getElementById('grid-lineup');

    if (btnAbrirModalArtista && modalArtista) {
    btnAbrirModalArtista.addEventListener('click', () => modalArtista.classList.remove('hidden'));
}
    const cerrarArtistaFn = () => {
    if (modalArtista) modalArtista.classList.add('hidden');
};
    if (cerrarModalArtista) cerrarModalArtista.addEventListener('click', cerrarArtistaFn);
    if (btnCancelarArtista) btnCancelarArtista.addEventListener('click', cerrarArtistaFn);

    if (formArtista) {
    formArtista.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('artista-nombre').value;
        const genero = document.getElementById('artista-genero').value;
        const escenario = document.getElementById('artista-escenario').value;
        const horario = document.getElementById('artista-horario').value;
        const fotoInput = document.getElementById('artista-foto');

        const file = fotoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fotoBase64 = event.target.result;
                guardarYRenderizarArtista({ nombre, genero, escenario, horario, foto: fotoBase64 });
                formArtista.reset();
                if (modalArtista) modalArtista.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

    function guardarYRenderizarArtista(artista) {
    let artistas = JSON.parse(localStorage.getItem('artistas_festival') || '[]');
    artistas.push(artista);
    localStorage.setItem('artistas_festival', JSON.stringify(artistas));
    cargarArtistasLineup();
}

    function cargarArtistasLineup() {
    if (!gridLineup) return;
    let artistas = JSON.parse(localStorage.getItem('artistas_festival') || '[]');

    if (artistas.length === 0) {
    artistas = [
{ nombre: 'Skrillex', genero: 'Dubstep / Electro', escenario: 'Escenario Principal - Tarima Norte', horario: '12 Feb • 23:00 hrs', foto: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60' },
{ nombre: 'Rezz', genero: 'Midtempo Bass', escenario: 'Bass Arena - Carpa 2', horario: '13 Feb • 22:00 hrs', foto: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60' }
    ];
    localStorage.setItem('artistas_festival', JSON.stringify(artistas));
}

    gridLineup.innerHTML = '';
    artistas.forEach(a => {
    const card = document.createElement('div');
    card.className = 'bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-orange-500 transition-all group';
    card.innerHTML = `
                <div class="h-48 overflow-hidden relative">
                    <img src="${a.foto}" alt="${a.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <span class="absolute top-3 right-3 bg-zinc-950/80 text-orange-400 text-xs px-2.5 py-1 rounded font-bold uppercase border border-orange-500/30">${a.genero}</span>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold text-white mb-1">${a.nombre}</h3>
                    <p class="text-xs text-orange-500 font-semibold mb-2">📍 ${a.escenario}</p>
                    <p class="text-xs text-gray-400">🕒 ${a.horario}</p>
                </div>
            `;
    gridLineup.appendChild(card);
});
}

    window.addEventListener('DOMContentLoaded', () => {
    cargarEntradasPerfil();
    cargarArtistasLineup();
});

    // --- GESTIÓN DE MAPA Y SERVICIOS ---
    const contenedorMapa = document.getElementById('contenedor-mapa');
    const capaPines = document.getElementById('capa-pines');
    const modalMarcador = document.getElementById('modal-marcador');
    const formMarcador = document.getElementById('form-marcador');
    const btnCancelarMarcador = document.getElementById('cancelar-marcador');
    const btnCancelModal = document.getElementById('btn-cancelar-modal');
    const btnEliminarServicio = document.getElementById('btn-eliminar-servicio');
    const tituloModalAdmin = document.getElementById('titulo-modal-admin');
    const inputIndiceServicio = document.getElementById('indice-servicio');
    const inputTipo = document.getElementById('tipo-marcador');
    const inputDesc = document.getElementById('desc-marcador');
    const inputMapa = document.getElementById('input-mapa');
    const imagenMapa = document.getElementById('imagen-mapa');
    const placeholderMapa = document.getElementById('placeholder-mapa');

    let clickCoords = { x: 0, y: 0 };

    if (inputMapa) {
    inputMapa.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Image = event.target.result;
                localStorage.setItem('mapa_festival_img', base64Image);
                mostrarImagenMapa(base64Image);
            };
            reader.readAsDataURL(file);
        }
    });
}

    function mostrarImagenMapa(src) {
    if (imagenMapa) {
    imagenMapa.src = src;
    imagenMapa.classList.remove('hidden');
}
    if (placeholderMapa) placeholderMapa.classList.add('hidden');
    if (contenedorMapa) contenedorMapa.classList.remove('border-2', 'border-dashed');
}

    function ocultarImagenMapa() {
    if (imagenMapa) {
    imagenMapa.removeAttribute('src');
    imagenMapa.classList.add('hidden');
}
    if (placeholderMapa) placeholderMapa.classList.remove('hidden');
    if (contenedorMapa) contenedorMapa.classList.add('border-2', 'border-dashed');
}

    window.addEventListener('DOMContentLoaded', () => {
    const mapaGuardado = localStorage.getItem('mapa_festival_img');
    if (mapaGuardado) {
    mostrarImagenMapa(mapaGuardado);
} else {
    ocultarImagenMapa();
}
    cargarServiciosGuardados();
});

    if (contenedorMapa) {
    contenedorMapa.addEventListener('click', (e) => {
        if (!esAdministrador) return;
        if (e.target.closest('.pin-element')) return;

        const rect = contenedorMapa.getBoundingClientRect();
        clickCoords = {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };

        if (inputIndiceServicio) inputIndiceServicio.value = "";
        if (inputTipo) inputTipo.value = "💧 Puntos de hidratación";
        if (inputDesc) inputDesc.value = "";
        if (tituloModalAdmin) tituloModalAdmin.innerText = "⚙️ [ADMIN] Crear Servicio en el Mapa";
        if (btnEliminarServicio) btnEliminarServicio.classList.add('hidden');

        if (modalMarcador) modalMarcador.classList.remove('hidden');
    });
}

    const cerrarModalAdmin = () => {
    if (modalMarcador) modalMarcador.classList.add('hidden');
};
    if (btnCancelarMarcador) btnCancelarMarcador.addEventListener('click', cerrarModalAdmin);
    if (btnCancelModal) btnCancelModal.addEventListener('click', cerrarModalAdmin);

    if (formMarcador) {
    formMarcador.addEventListener('submit', (e) => {
        e.preventDefault();
        const tipo = inputTipo ? inputTipo.value : "";
        const descripcion = inputDesc ? inputDesc.value : "";
        const index = inputIndiceServicio ? inputIndiceServicio.value : "";

        let servicios = JSON.parse(localStorage.getItem('servicios_festival') || '[]');

        if (index === "") {
            const nuevoServicio = { x: clickCoords.x, y: clickCoords.y, tipo, descripcion };
            servicios.push(nuevoServicio);
        } else {
            servicios[index].tipo = tipo;
            servicios[index].descripcion = descripcion;
        }

        localStorage.setItem('servicios_festival', JSON.stringify(servicios));
        cargarServiciosGuardados();
        if (modalMarcador) modalMarcador.classList.add('hidden');
    });
}

    if (btnEliminarServicio) {
    btnEliminarServicio.addEventListener('click', () => {
        const index = inputIndiceServicio ? inputIndiceServicio.value : "";
        if (index !== "") {
            let servicios = JSON.parse(localStorage.getItem('servicios_festival') || '[]');
            servicios.splice(index, 1);
            localStorage.setItem('servicios_festival', JSON.stringify(servicios));
            cargarServiciosGuardados();
            if (modalMarcador) modalMarcador.classList.add('hidden');
        }
    });
}

    function cargarServiciosGuardados() {
    if (!capaPines) return;
    capaPines.innerHTML = '';
    let servicios = JSON.parse(localStorage.getItem('servicios_festival') || '[]');
    servicios.forEach((s, idx) => renderizarPin(s, idx));
}

    function renderizarPin(s, idx) {
    const pin = document.createElement('div');
    pin.className = 'absolute pin-marker pin-element pointer-events-auto cursor-pointer group flex flex-col items-center';
    pin.style.left = `${s.x}%`;
    pin.style.top = `${s.y}%`;

    pin.innerHTML = `
            <div class="bg-orange-600 text-white font-bold p-2 rounded-full shadow-lg text-sm transform transition-transform group-hover:scale-125 border border-white flex items-center justify-center">
                ${s.tipo.split(' ')[0]}
            </div>
            <div class="hidden group-hover:flex flex-col items-center absolute bottom-full mb-2 z-30 pointer-events-none">
                <div class="bg-zinc-950 border border-orange-500 text-white text-xs p-2 rounded shadow-xl whitespace-nowrap">
                    <p class="font-bold text-orange-500">${s.tipo}</p>
                    <p class="text-gray-300">${s.descripcion}</p>
                    ${esAdministrador ? '<p class="text-[10px] text-orange-400 mt-1">🖱️ Clic para editar/eliminar</p>' : ''}
                </div>
            </div>
        `;

    pin.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!esAdministrador) return;

    if (inputIndiceServicio) inputIndiceServicio.value = idx;
    if (inputTipo) inputTipo.value = s.tipo;
    if (inputDesc) inputDesc.value = s.descripcion;
    if (tituloModalAdmin) tituloModalAdmin.innerText = "⚙️ [ADMIN] Actualizar o Eliminar Servicio";
    if (btnEliminarServicio) btnEliminarServicio.classList.remove('hidden');

    if (modalMarcador) modalMarcador.classList.remove('hidden');
});

    if (capaPines) capaPines.appendChild(pin);
}

    if (btnLimpiarMapa) {
    btnLimpiarMapa.addEventListener('click', () => {
        if (confirm("¿Estás seguro de eliminar la imagen del mapa y TODOS los servicios creados?")) {
            localStorage.removeItem('mapa_festival_img');
            localStorage.removeItem('servicios_festival');
            if (capaPines) capaPines.innerHTML = '';
            if (inputMapa) inputMapa.value = '';
            ocultarImagenMapa();
        }
    });
}
