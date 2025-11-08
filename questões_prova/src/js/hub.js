class HubProvas {
    constructor() {
        this.provas = [];
        this.filtradas = [];
        this.cargos = new Map();
        this.cargoAtivo = 'todos';
        this.init();
    }

    async init() {
        await this.carregarProvas();
        this.agruparPorCargo();
        this.renderizarNavegacaoCargos();
        this.renderizarProvas();
        this.configurarFiltros();
        this.configurarBusca();
    }

    async carregarProvas() {
        try {
            // LISTA MANUAL das provas disponíveis - ATUALIZE COM SEUS ARQUIVOS
            const provasDisponiveis = [
                'prova_b9f68e13.json'
                // Adicione mais: 'prova_12345678.json', 'prova_abcdef12.json'
            ];

            const promises = provasDisponiveis.map(async (file) => {
                try {
                    const response = await fetch(`./data/provas/${file}`);
                    if (!response.ok) {
                        throw new Error(`Arquivo ${file} não encontrado`);
                    }
                    const prova = await response.json();
                    return prova.prova;
                } catch (error) {
                    console.error(`Erro ao carregar ${file}:`, error);
                    return null;
                }
            });

            const resultados = await Promise.all(promises);
            this.provas = resultados.filter(p => p !== null);
            this.filtradas = [...this.provas];
            
        } catch (error) {
            console.error('Erro ao carregar provas:', error);
            this.mostrarErro('Erro ao carregar provas. Verifique o console.');
        }
    }

    agruparPorCargo() {
        this.cargos.clear();
        
        this.provas.forEach(prova => {
            const cargo = prova.cargo || 'Outros';
            if (!this.cargos.has(cargo)) {
                this.cargos.set(cargo, []);
            }
            this.cargos.get(cargo).push(prova);
        });
    }

    renderizarNavegacaoCargos() {
        const nav = document.getElementById('cargoNav');
        const cargosArray = Array.from(this.cargos.entries());
        
        cargosArray.sort((a, b) => b[1].length - a[1].length);
        
        nav.innerHTML = `
            <button class="nav-btn active" data-cargo="todos">
                📋 Todos (${this.provas.length})
            </button>
            ${cargosArray.map(([cargo, provas]) => `
                <button class="nav-btn" data-cargo="${this.sanitizarCargo(cargo)}">
                    ${this.getCargoIcon(cargo)} ${cargo} (${provas.length})
                </button>
            `).join('')}
        `;

        nav.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.cargoAtivo = btn.dataset.cargo;
                this.filtrarProvas();
            });
        });
    }

    getCargoIcon(cargo) {
        const icons = {
            'ADMINISTRATIVO': '📊',
            'SAÚDE': '🏥', 
            'EDUCAÇÃO': '🎓',
            'TI': '💻',
            'JURÍDICO': '⚖️',
            'ENGENHARIA': '🔧',
            'CONTÁBEIS': '📈',
            'default': '📁'
        };

        const cargoUpper = cargo.toUpperCase();
        for (const [key, icon] of Object.entries(icons)) {
            if (cargoUpper.includes(key)) return icon;
        }
        return icons.default;
    }

    sanitizarCargo(cargo) {
        return cargo.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    renderizarProvas() {
        const container = document.getElementById('provasContainer');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        if (this.filtradas.length === 0) {
            container.style.display = 'none';
            if (loading) loading.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        loading.style.display = 'none';
        noResults.style.display = 'none';
        container.style.display = 'block';

        const provasPorCargo = new Map();
        this.filtradas.forEach(prova => {
            const cargo = prova.cargo || 'Outros';
            if (!provasPorCargo.has(cargo)) {
                provasPorCargo.set(cargo, []);
            }
            provasPorCargo.get(cargo).push(prova);
        });

        container.innerHTML = Array.from(provasPorCargo.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(([cargo, provas]) => `
                <section class="cargo-section" data-cargo="${this.sanitizarCargo(cargo)}">
                    <div class="cargo-header">
                        <div class="cargo-icon">${this.getCargoIcon(cargo)}</div>
                        <h2 class="cargo-title">${cargo}</h2>
                        <span class="cargo-count">${provas.length} prova${provas.length !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div class="provas-grid">
                        ${provas.map(prova => `
                            <div class="prova-card" onclick="hub.abrirProva('${prova.id}')">
                                <h3>${prova.nome_prova}</h3>
                                <div class="prova-meta">
                                    <span>${prova.organizadora}</span>
                                    <span>${prova.ano}</span>
                                    <span>${prova.total_questoes} questões</span>
                                </div>
                                <div class="prova-stats">
                                    <span class="prova-id">${prova.id.slice(0, 8)}</span>
                                    <span>${new Date(prova.data_processamento).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `).join('');
    }

    configurarFiltros() {
        const organizadoras = [...new Set(this.provas.map(p => p.organizadora).filter(Boolean))];
        const anos = [...new Set(this.provas.map(p => p.ano).filter(Boolean))];

        this.preencherSelect('filterOrganizadora', organizadoras);
        this.preencherSelect('filterAno', anos);

        ['filterOrganizadora', 'filterAno'].forEach(id => {
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
        const ano = document.getElementById('filterAno').value;

        this.filtradas = this.provas.filter(prova => {
            const matchSearch = !searchTerm || 
                prova.nome_prova.toLowerCase().includes(searchTerm) ||
                (prova.cargo && prova.cargo.toLowerCase().includes(searchTerm)) ||
                prova.organizadora.toLowerCase().includes(searchTerm);

            const matchOrg = !organizadora || prova.organizadora === organizadora;
            const matchAno = !ano || prova.ano === ano;
            const matchCargo = this.cargoAtivo === 'todos' || 
                             this.sanitizarCargo(prova.cargo || 'Outros') === this.cargoAtivo;

            return matchSearch && matchOrg && matchAno && matchCargo;
        });

        this.renderizarProvas();
    }

    abrirProva(provaId) {
        console.log('Abrindo prova:', provaId);
        
        // Verifica se a prova existe na lista
        const provaExiste = this.provas.some(prova => prova.id === provaId);
        
        if (provaExiste) {
            window.location.href = `prova.html?id=${provaId}`;
        } else {
            alert('Prova não encontrada! Verifique se o arquivo JSON existe.');
            console.error('Prova não encontrada:', provaId);
        }
    }

    mostrarErro(mensagem) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="text-align: center; color: var(--light-beige); padding: 20px;">
                    <p>${mensagem}</p>
                    <button onclick="location.reload()" class="nav-btn" style="margin-top: 15px;">
                        🔄 Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

const hub = new HubProvas();
