const SUPABASE_URL = 'https://xpxeplflvkrrdofgbofh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-AHWG_siQSYls6s4HV3sgw_vIY_Aqas';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';
const ziCurenta = parseInt(urlParams.get('zi')); // Va fi NaN dacă nu e setat

// RUTARE: Decidem ce ecran să arătăm
if (isAdmin) {
    // PROTECȚIE CU PAROLĂ PENTRU ADMIN
    let parola = prompt("Introdu parola de admin pentru a continua:");
    if (parola === "cadou") {
        document.getElementById('ecran-admin').style.display = "block";
    } else {
        alert("Parolă incorectă!");
        window.location.href = "/"; // Îl trimitem înapoi pe pagina principală
    }
} else if (ziCurenta) {
    document.getElementById('ecran-zi').style.display = "block";
    document.getElementById('titluZi').innerText = `Cutiuța ${ziCurenta} 🎁`;
    verificaStareaZi();
} else {
    document.getElementById('ecran-acasa').style.display = "block";
    incarcaProgresZile();
}

// --- LOGICA PENTRU PAGINA DE BUN VENIT (ACASĂ) ---

async function incarcaProgresZile() {
    try {
        let { data: zile, error } = await db.from('zile_advent').select('*').order('zi', { ascending: true });
        if (error) throw error;

        const grid = document.getElementById('grid-zile');
        grid.innerHTML = ""; // curățăm

        zile.forEach(z => {
            let div = document.createElement('div');
            if (z.scanat) {
                div.className = "zi-item zi-scanata";
                // Afișăm litera dacă e premiu, altfel o bomboană
                let icon = z.premiu_obtinut.includes("Litera") ? `🏆 ${z.premiu_obtinut.split(' ')[1]}` : "🍬";
                div.innerHTML = `Z${z.zi}<br>${icon}`;
            } else {
                div.className = "zi-item zi-nescanata";
                div.innerHTML = `Z${z.zi}<br>🔒`;
            }
            grid.appendChild(div);
        });
    } catch (err) {
        console.error("Eroare la încărcarea progresului:", err);
    }
}

function pornesteScanerul() {
    document.getElementById('reader').style.display = 'block';
    
    // Inițializăm scanerul QR folosind camera telefonului
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, // camera de pe spate
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
            // Când găsește un cod QR valid:
            html5QrCode.stop(); // Oprește camera
            window.location.href = decodedText; // Te redirecționează către linkul din QR (ex: ?zi=5)
        },
        (errorMessage) => {
            // Ignoră erorile temporare până fixează codul
        }
    ).catch((err) => {
        alert("Eroare la deschiderea camerei. Verifică dacă ai dat permisiunea pentru cameră!");
    });
}

function inapoiAcasa() {
    window.location.href = "?"; // Sterge parametrii din URL și întoarce la home
}


// --- LOGICA PENTRU ZIUA SCANATĂ (PAGINA DE EXTRAGERE) ---

async function verificaStareaZi() {
    try {
        let { data, error } = await db.from('zile_advent').select('*').eq('zi', ziCurenta).single();
        if (error || !data) {
            document.getElementById('descriere').innerText = "Eroare: Această zi nu este setată în baza de date.";
            return;
        }

        if (data.scanat === true) {
            document.getElementById('descriere').innerText = "❌ Ups! Această cutiuță a fost deja deschisă!";
            document.getElementById('rezultat').innerHTML = data.premiu_obtinut 
                ? `Premiul câștigat a fost: <br><span style="color:#d9534f; font-size: 24px;"><b>${data.premiu_obtinut}</b></span>`
                : "Ai primit deja dulciurile de atunci!";
            return;
        }

        document.getElementById('descriere').innerText = "Cutiuța este neatinsă! Apasă butonul pentru a declanșa ruleta:";
        document.getElementById('btnExtragere').style.display = "block";

    } catch (err) {
        console.error(err);
    }
}

async function deschideCutia() {
    const btn = document.getElementById('btnExtragere');
    const ruleta = document.getElementById('ruleta');
    const divRezultat = document.getElementById('rezultat');
    
    btn.style.display = "none";
    ruleta.style.display = "block"; // Afișăm animația de suspans
    document.getElementById('descriere').style.display = "none";

    // 1. Facem logica bazei de date (extragem premiul în background)
    let premiuCastigatText = "Doar dulciurile delicioase! 🍬";
    try {
        let { data: premiiDisponibile } = await db.from('premii').select('*').eq('castigat', false);
        
        if (premiiDisponibile && premiiDisponibile.length > 0 && Math.random() < 0.5) {
            const index = Math.floor(Math.random() * premiiDisponibile.length);
            const literaAleasa = premiiDisponibile[index].litera;
            premiuCastigatText = `Litera ${literaAleasa} (Premiu Mare! 🎉)`;

            await db.from('premii').update({ castigat: true }).eq('id', premiiDisponibile[index].id);
        }

        await db.from('zile_advent').update({ scanat: true, premiu_obtinut: premiuCastigatText }).eq('zi', ziCurenta);
    } catch (err) {
        console.error("Eroare DB în timpul ruletei", err);
        premiuCastigatText = "Eroare la server, dar măcar ai dulciuri!";
    }

    // 2. Simulăm suspansul! Așteptăm 3 secunde (3000 milisecunde) înainte să arătăm rezultatul
    setTimeout(() => {
        ruleta.style.display = "none"; // Ascundem ruleta
        divRezultat.innerHTML = `🎉 Felicitări! Ai primit: <br><br><span style="color:#d9534f; font-size:28px;">${premiuCastigatText}</span>`;
    }, 3000); 
}


// --- LOGICA PENTRU ADMIN ---
async function reseteazaTot() {
    if (!confirm("Sigur vrei să resetezi totul? (Va șterge tot progresul)")) return;
    try {
        await db.from('zile_advent').update({ scanat: false, premiu_obtinut: null }).neq('zi', 0);
        await db.from('premii').update({ castigat: false }).neq('id', 0);
        alert("✅ Resetat cu succes!");
        window.location.href = "?"; // Întoarcere pe prima pagină
    } catch (err) {
        alert("Eroare la resetare.");
    }
}