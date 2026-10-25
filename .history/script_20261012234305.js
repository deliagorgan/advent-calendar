// Datele tale din Supabase
const SUPABASE_URL = 'https://xpxeplflvkrrdofgbofh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-AHWG_siQSYls6s4HV3sgw_vIY_Aqas';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === '1';
const ziCurenta = parseInt(urlParams.get('zi')) || 1;

if (isAdmin) {
    document.getElementById('titluZi').innerText = "🛠️ Panou de Test / Reset";
    document.getElementById('descriere').innerText = "Aici poți reseta calendarul înainte să îl dăruiești.";
    document.getElementById('btnExtragere').style.display = "none";
    document.getElementById('rezultat').innerHTML = `
        <button onclick="reseteazaTot()" style="background-color: #333; margin-top: 10px;">Resetează totul</button>
    `;
} else {
    document.getElementById('titluZi').innerText = `Calendar Advent - Ziua ${ziCurenta} 🎁`;
    verificaStarea();
}

async function verificaStarea() {
    try {
        let { data, error } = await db
            .from('zile_advent')
            .select('*')
            .eq('zi', ziCurenta)
            .single();

        if (error || !data) {
            document.getElementById('descriere').innerText = "Eroare: Această zi nu este setată în sistem în baza de date.";
            return;
        }

        if (data.scanat === true) {
            document.getElementById('descriere').innerText = "❌ Ups! Această cutiuță a fost deja deschisă și scanată anterior.";
            document.getElementById('rezultat').innerHTML = data.premiu_obtinut 
                ? `Premiul câștigat a fost: <span style="color:#d9534f"><b>${data.premiu_obtinut}</b></span>`
                : "Ai primit deja dulciurile de atunci!";
            return;
        }

        document.getElementById('descriere').innerText = "Cutiuța este neatinsă! Apasă mai jos pentru a vedea ce ai primit:";
        document.getElementById('btnExtragere').style.display = "block";

    } catch (err) {
        console.error(err);
        document.getElementById('descriere').innerText = "A apărut o eroare de conexiune.";
    }
}

async function deschideCutia() {
    const btn = document.getElementById('btnExtragere');
    btn.disabled = true;
    document.getElementById('rezultat').innerHTML = "Se deschide...";

    try {
        let { data: premiiDisponibile } = await db
            .from('premii')
            .select('*')
            .eq('castigat', false);

        let premiuCastigatText = "Doar dulciurile delicioase de astăzi! (Fără premiu mare)";
        
        if (premiiDisponibile && premiiDisponibile.length > 0 && Math.random() < 0.5) {
            const index = Math.floor(Math.random() * premiiDisponibile.length);
            const literaAleasa = premiiDisponibile[index].litera;
            premiuCastigatText = `Litera ${literaAleasa} (Premiu Mare! 🎉)`;

            await db
                .from('premii')
                .update({ castigat: true })
                .eq('id', premiiDisponibile[index].id);
        }

        await db
            .from('zile_advent')
            .update({ scanat: true, premiu_obtinut: premiuCastigatText })
            .eq('zi', ziCurenta);

        document.getElementById('descriere').innerText = "🎉 Felicitări! Cutiuța a fost deschisă.";
        document.getElementById('rezultat').innerHTML = `Ai primit: <span style="color:#d9534f; font-size:24px;">${premiuCastigatText}</span>`;
        btn.style.display = "none";

    } catch (err) {
        console.error(err);
        document.getElementById('rezultat').innerHTML = "Eroare la procesare.";
        btn.disabled = false;
    }
}

async function reseteazaTot() {
    if (!confirm("Sigur vrei să resetezi totul?")) return;
    try {
        await db.from('zile_advent').update({ scanat: false, premiu_obtinut: null }).neq('zi', 0);
        await db.from('premii').update({ castigat: false }).neq('id', 0);
        alert("✅ Resetat cu succes!");
        location.reload();
    } catch (err) {
        alert("Eroare la resetare.");
    }
}