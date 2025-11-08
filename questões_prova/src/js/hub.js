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
            // Em vez de listar a pasta, carrega o índice
            const response = await fetch('../data/provas/index.json');
            const index = await response.json();
            const files = index.provas;
            
            // Resto do código igual...
            const promises = files.map(async file => {
                const response = await fetch(`../data/provas/${file}`);
                const prova = await response.json();
                return prova.prova;
            });

            this.provas = await Promise.all(promises);
            this.filtradas = [...this.provas];
            
        } catch (error) {
            console.error('Erro ao carregar lista de provas:', error);
            document.getElementById('loading').textContent = 'Erro ao carregar provas. Use um servidor local.';
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

    abrirProva(provaId) {
        window.location.href = `prova.html?id=${provaId}`;
    }
}

const hub = new HubProvas();
