class HubProvas {
    constructor() {
        this.provas = [];
        this.filtradas = [];
        this.init();
    }

    async init() {
        await this.carregarProvas();
        this.renderizarProvas();
        this.configurarFiltros();
        this.configurarBusca();
    }

    async carregarProvas() {
        try {
            console.log('[Hub] fetch index.json -> data/provas/index.json');
            const resIndex = await fetch('data/provas/index.json', { cache: 'no-store' });
            if (!resIndex.ok) {
                throw new Error('index.json não encontrado. status: ' + resIndex.status);
            }
            const index = await resIndex.json();
            console.log('[Hub] index:', index);
            if (!index || !Array.isArray(index.provas)) {
                throw new Error('index.json inválido: falta campo "provas" como array');
            }
    
            const files = index.provas;
            const loaded = [];
    
            for (const file of files) {
                try {
                    console.log('[Hub] carregando', file);
                    const r = await fetch(`./data/provas/${file}`, { cache: 'no-store' });
                    console.log('[Hub] status', r.status);
                    if (!r.ok) {
                        console.warn('[Hub] não encontrado ou erro ao buscar', file, 'status', r.status);
                        continue;
                    }
                    const pj = await r.json().catch(e => { console.warn('[Hub] JSON inválido em', file, e); return null; });
                    if (!pj || !pj.prova) {
                        console.warn('[Hub] arquivo carregado não contém "prova":', file, pj);
                        continue;
                    }
                    // verificação de campos mínimos
                    if (!pj.prova.id) pj.prova.id = (pj.prova.nome_prova || file).slice(0,16);
                    loaded.push(pj.prova);
                } catch (err) {
                    console.error('[Hub] erro ao processar', file, err);
                    continue;
                }
            }
    
            this.provas = loaded;
            this.filtradas = [...this.provas];
            console.log('[Hub] provas finais carregadas:', this.provas.length, this.provas.map(p=>p.id));
        } catch (error) {
            console.error('[Hub] erro geral ao carregar provas:', error);
            document.getElementById('loading').textContent = 'Erro ao carregar provas. Veja console.';
        }
    }


    renderizarProvas() {
        const container = document.getElementById('provasContainer');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        if (this.filtradas.length === 0) {
            container.style.display = 'none';
            loading.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        loading.style.display = 'none';
        noResults.style.display = 'none';
        container.style.display = 'grid';

        container.innerHTML = this.filtradas.map(prova => `
            <div class="prova-card" onclick="hub.abrirProva('${prova.id}')">
                <h3>${prova.nome_prova}</h3>
                <div class="prova-meta">
                    <span>${prova.cargo}</span>
                    <span>${prova.organizadora}</span>
                    <span>${prova.ano}</span>
                </div>
                <p>${prova.total_questoes} questões</p>
                <div class="prova-stats">
                    <span>ID: ${prova.id.slice(0, 8)}</span>
                    <span>${new Date(prova.data_processamento).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        `).join('');
    }

    configurarFiltros() {
        const organizadoras = [...new Set(this.provas.map(p => p.organizadora))];
        const cargos = [...new Set(this.provas.map(p => p.cargo))];
        const anos = [...new Set(this.provas.map(p => p.ano))];

        this.preencherSelect('filterOrganizadora', organizadoras);
        this.preencherSelect('filterCargo', cargos);
        this.preencherSelect('filterAno', anos);

        ['filterOrganizadora', 'filterCargo', 'filterAno'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.filtrarProvas());
        });
    }

    preencherSelect(selectId, opcoes) {
        const select = document.getElementById(selectId);
        opcoes.sort().forEach(opcao => {
            if (opcao && opcao !== 'Não especificado') {
                const option = document.createElement('option');
                option.value = opcao;
                option.textContent = opcao;
                select.appendChild(option);
            }
        });
    }

    configurarBusca() {
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.filtrarProvas(), 300);
        });
    }

    filtrarProvas() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const organizadora = document.getElementById('filterOrganizadora').value;
        const cargo = document.getElementById('filterCargo').value;
        const ano = document.getElementById('filterAno').value;

        this.filtradas = this.provas.filter(prova => {
            const matchSearch = !searchTerm || 
                prova.nome_prova.toLowerCase().includes(searchTerm) ||
                prova.cargo.toLowerCase().includes(searchTerm) ||
                prova.organizadora.toLowerCase().includes(searchTerm);

            const matchOrg = !organizadora || prova.organizadora === organizadora;
            const matchCargo = !cargo || prova.cargo === cargo;
            const matchAno = !ano || prova.ano === ano;

            return matchSearch && matchOrg && matchCargo && matchAno;
        });

        this.renderizarProvas();
    }

    abrirProva(provaIdCompleto) {
        // Usa os primeiros 8 caracteres do ID, assim como feito na renderização do cartão
        const provaIdCurto = provaIdCompleto.slice(0, 8); 
         window.location.href = `prova.html?id=${provaIdCurto}`;
    }
}


const hub = new HubProvas();

