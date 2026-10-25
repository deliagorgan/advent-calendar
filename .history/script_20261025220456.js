const SUPABASE_URL = 'https://xpxeplflvkrrdofgbofh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-AHWG_siQSYls6s4HV3sgw_vIY_Aqas';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------------------------------
// BAZA DE DATE LOCALĂ (Configurează-le tu aici)
// ----------------------------------------------------
const citate = [
    "„Crăciunul nu este o perioadă, ci o stare de spirit.”",
    "„Cel mai frumos cadou este timpul petrecut cu tine.”",
    "„Fiecare zi este un mic cadou, dar tu ești cel mai mare.”",
    "„Bucuria de a dărui este secretul fericirii.”",
    "„Zâmbetul tău e mai luminos decât luminițele de Crăciun.”",
    // Adaugă aici mai multe citate până ai destule...
];

const cadouriDisponibile = [
    "Cadou A", "Cadou B", "Cadou C", "Cadou D", "Cadou E" // Poți adăuga exact câte vrei
];

// Numele imaginilor (trebuie să le urci pe vercel în același folder)
const IMG_SILUETA = "silueta.png";
const IMG_PRODUS = "produs.png";

// ----------------------------------------------------

const urlParams = new URLSearchParams(window.location.search);
const aScanatAzi = urlParams.get('scan') === '1';

// Obținem data curentă reală
const azi = new Date();
const lunaCurenta = azi.getMonth(); // 11 înseamnă Decembrie în JavaScript (0=Ianuarie)
const ziuaCurenta = azi.getDate(); 

window.onload = () => {
    if (aScanatAzi) {
        document.getElementById('ecran-zi').style.display = "block";
        proceseazaScanareAzi();
    } else {
        document.getElementById('ecran-acasa').style.display = "block";
        arataHome();
    }
}

// --- LOGICA DE HOME ---
async function arataHome() {
    // 1. Verificăm Countdown-ul până la 1 Decembrie
    const anCurent = azi.getFullYear();
    const dataInceput = new Date(anCurent, 11, 1); // 1 Decembrie, ora 00:00

    if (azi < dataInceput) {
        document.getElementById('countdown-container').style.display = "block";
        document.getElementById('buton-scanare-container').style.display = "none";
        
        setInterval(() => {
            const acum = new Date();
            const diferenta = dataInceput - acum;
            const zile = Math.floor(diferenta / (1000 * 60 * 60 * 24));
            const ore = Math.floor((diferenta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minute = Math.floor((diferenta % (1000 * 60 * 60)) / (1000 * 60));
            const secunde = Math.floor((diferenta % (1000 * 60)) / 1000);
            
            document.getElementById('countdown-timer').innerText = 
                `${zile}z : ${ore}o : ${minute}m : ${secunde}s`;
        }, 1000);
    } else {
        // Suntem în Decembrie (sau mai târziu), permitem scanarea
        document.getElementById('buton-scanare-container').style.display = "block";
    }

    // 2. Afișăm Calendarul din Supabase
    try {
        let { data: zileDb, error } = await db.from('zile_advent').select('*').order('zi', { ascending: true });
        if (error) throw error;

        const grid = document.getElementById('grid-zile');
        grid.innerHTML = ""; 

        zileDb.forEach(z => {
            let div = document.createElement('div');
            let isCurrentDay = (lunaCurenta === 11 && z.zi === ziuaCurenta);
            
            div.className = "zi-item";
            if (isCurrentDay) div.classList.add("zi-curenta");
            if (z.zi > ziuaCurenta || lunaCurenta < 11) div.classList.add("zi-viitoare");

            let continutHTML = `<span>Z${z.zi}</span>`;

            if (z.scanat) {
                // Dacă a fost scanat, verificăm dacă a câștigat "Cadou" sau "Citat"
                let eCadouFizic = !z.premiu_obtinut.startsWith("CITAT:");
                if (eCadouFizic) {
                    continutHTML += `<img src="${IMG_PRODUS}" class="poza-calendar" alt="Cadou Câștigat">`;
                } else {
                    continutHTML += `<div style="font-size: 24px; margin-top:5px;">📜</div>`;
                }
            } else {
                // Nu a fost scanat încă (Siluetă + Semn de întrebare)
                continutHTML += `<img src="${IMG_SILUETA}" class="poza-calendar" alt="Necunoscut">`;
            }

            div.innerHTML = continutHTML;
            grid.appendChild(div);
        });
    } catch (err) {
        console.error("Eroare la încărcarea calendarului:", err);
    }
}

function pornesteScanerul() {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            html5QrCode.stop(); 
            // Când citește un QR, redirecționează către site cu parametrul ?scan=1
            window.location.href = decodedText; 
        },
        (errorMessage) => {}
    ).catch((err) => {
        alert("Eroare la deschiderea camerei!");
    });
}

function inapoiAcasa() {
    window.location.href = "/";
}

// --- LOGICA DE EXTRAGERE (Când ajunge pe ?scan=1) ---

async function proceseazaScanareAzi() {
    // if (lunaCurenta !== 11) {
    //     document.getElementById('descriere-rezultat').innerHTML = "<b>Nu trișa!</b> Crăciunul este abia în Decembrie! 🎅";
    //     return;
    // }

    // if (ziuaCurenta > 24) {
    //     document.getElementById('descriere-rezultat').innerHTML = "Crăciunul a trecut deja! Sper că a fost magic! 🎄";
    //     return;
    // }

    try {
        let { data, error } = await db.from('zile_advent').select('*').eq('zi', ziuaCurenta).single();
        
        if (error || !data) {
            document.getElementById('descriere-rezultat').innerText = "Eroare: Ziua de azi nu e setată în baza de date.";
            return;
        }

        if (data.scanat === true) {
            document.getElementById('descriere-rezultat').innerHTML = "❌ <b>Ai tras deja la sorți astăzi!</b> Acesta a fost rezultatul tău:";
            afiseazaRezultatVizual(data.premiu_obtinut);
        } else {
            document.getElementById('descriere-rezultat').innerText = "Ai extras cu succes biletul de azi! Să vedem ce îți aduce norocul...";
            document.getElementById('btnExtragere').style.display = "block";
        }
    } catch (err) {
        console.error(err);
    }
}

async function trageLaSorti() {
    document.getElementById('btnExtragere').style.display = "none";
    document.getElementById('ruleta').style.display = "block";
    document.getElementById('descriere-rezultat').style.display = "none";

    let rezultatFinalText = "";

    try {
        // Stabilim șansa (Weekend: 70%, Săptămână: 30%)
        let ziSaptamana = azi.getDay(); // 0 = Duminică, 6 = Sâmbătă
        let isWeekend = (ziSaptamana === 0 || ziSaptamana === 6);
        let sansaCastig = isWeekend ? 0.70 : 0.30;
        
        let aCastigatCadou = Math.random() < sansaCastig;

        if (aCastigatCadou && cadouriDisponibile.length > 0) {
            // Alege un cadou random din array
            let indexCadou = Math.floor(Math.random() * cadouriDisponibile.length);
            rezultatFinalText = cadouriDisponibile[indexCadou];
        } else {
            // Nu a câștigat / Nu mai sunt cadouri -> Dăm Citat
            let indexCitat = Math.floor(Math.random() * citate.length);
            rezultatFinalText = "CITAT:" + citate[indexCitat];
        }

        // Salvăm în baza de date
        await db.from('zile_advent').update({ scanat: true, premiu_obtinut: rezultatFinalText }).eq('zi', ziuaCurenta);
        
    } catch (err) {
        console.error("Eroare la baza de date", err);
        rezultatFinalText = "CITAT:„Te iubesc chiar și când serverul dă eroare.”";
    }

    // Suspans de 2.5 secunde
    setTimeout(() => {
        document.getElementById('ruleta').style.display = "none";
        afiseazaRezultatVizual(rezultatFinalText);
    }, 2500);
}

function afiseazaRezultatVizual(premiuString) {
    document.getElementById('rezultat-final').style.display = "block";
    
    let mesajEl = document.getElementById('mesaj-rezultat');
    let imgEl = document.getElementById('imagine-rezultat');
    let citatEl = document.getElementById('citat-rezultat');

    if (premiuString.startsWith("CITAT:")) {
        mesajEl.innerText = "Azi primești o îmbrățișare și un gând frumos! ✨";
        citatEl.innerText = premiuString.replace("CITAT:", "");
        citatEl.style.display = "block";
        imgEl.style.display = "none";
    } else {
        mesajEl.innerText = `🎉 Felicitări! Ai câștigat un cadou: ${premiuString}!`;
        imgEl.src = IMG_PRODUS; // Arată poza produsului
        imgEl.style.display = "block";
        citatEl.style.display = "none";
    }
}