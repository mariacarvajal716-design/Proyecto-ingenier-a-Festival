// Se crea el ID unico de los asistentes - HU1
document.getElementById('formulario-registro').addEventListener('submit', function(evento) {
    evento.preventDefault();
    const nombre = document.getElementById('nombre').value;
    
   //Aqui exactamente es donde se genera el Id
    const idUnico = 'NB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('id-generado').innerText = idUnico;
    document.getElementById('resultado-id').classList.remove('hidden');
    document.getElementById('formulario-registro').reset();
});

///FILA VIRTUAL - HU 2
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

    btnCerrarFila.addEventListener('click', () => {
        modalFila.classList.add('hidden');
        clearInterval(intervaloFila); 
        tiempoTexto.innerText = "05:00"; 
        tiempoTexto.classList.replace('text-green-500', 'text-white');
        personasTexto.innerText = "1,204"; // Reinicia las personas si cierras
    });

    // --- LÓGICA DE PERFIL DE ASISTENTE (HU 6) ---
    const modalPerfil = document.getElementById('modal-perfil');
    const btnAbrirPerfil = document.getElementById('abrir-perfil');
    const btnCerrarPerfil = document.getElementById('cerrar-perfil');

    btnAbrirPerfil.addEventListener('click', () => modalPerfil.classList.remove('hidden'));
    btnCerrarPerfil.addEventListener('click', () => modalPerfil.classList.add('hidden'));