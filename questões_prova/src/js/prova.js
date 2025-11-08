class GerenciadorProva {
    constructor() {
        this.prova = null;
        this.respostas = {};
        this.finalizada = false;
        this.provaId = new URLSearchParams(window.location.search).get('id');
        
        if (!this.provaId) {
            alert('ID da prova não encontrado! Voltando ao hub.');
            window.location.href = 'hub.html';
            return;
        }

        console.log('Iniciando prova com ID:', this.provaId);
        this.init();
    }

    async init() {
        await this.carregarProva();
        this.renderizarProva();
        this.configurarEventos();
        this.atualizarStats();
    }

    async carregarProva() {
        try {
            console.log('Tentando carregar prova:', `./data/provas/prova_${this.provaId}.json`);
            
            const response = await fetch(`./data/provas/prova_${this.provaId}.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.prova = data;
            
            console.log('Prova carregada com sucesso:', this.prova);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('provaContent').style.display = 'block';
            
            this.atualizarHeader();
            
        } catch (error) {
            console.error('Erro detalhado ao carregar prova:', error);
            this.mostrarErroCarregamento();
        }
    }

    mostrarErroCarregamento() {
        const loading = document.getElementById('loading');
        loading.innerHTML = `
            <div style="text-align: center; color: var(--light-beige); padding: 40px;">
                <h3 style="margin-bottom: 20px;">❌ Erro ao carregar a prova</h3>
                <p><strong>ID da prova:</strong> ${this.provaId}</p>
                <p style="margin: 15px 0;">Verifique se o arquivo <code>prova_${this.provaId}.json</code> existe na pasta data/provas/</p>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                    <a href="hub.html" class="back-btn">← Voltar ao Hub</a>
                    <button onclick="location.reload()" class="nav-btn" style="background: var(--light-beige); color: var(--dark-brown);">
                        🔄 Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    atualizarHeader() {
        if (!this.prova || !this.prova.prova) {
            console.error('Estrutura da prova inválida:', this.prova);
            return;
        }

        document.getElementById('provaTitle').textContent = this.prova.prova.nome_prova || 'Prova sem nome';
        document.getElementById('provaCargo').textContent = this.prova.prova.cargo || 'Cargo não especificado';
        document.getElementById('provaOrganizadora').textContent = this.prova.prova.organizadora || 'Organizadora não especificada';
        document.getElementById('provaAno').textContent = this.prova.prova.ano || 'Ano não especificado';
        document.getElementById('totalQuestoes').textContent = this.prova.prova.total_questoes || 0;
    }

    renderizarProva() {
        if (!this.prova || !this.prova.prova) {
            console.error('Não é possível renderizar: prova não carregada');
            return;
        }

        this.renderizarTextosBase();
        this.renderizarQuestoes();
    }

    renderizarTextosBase() {
        const container = document.getElementById('textosBaseContainer');
        
        if (this.prova.prova.textos_base && this.prova.prova.textos_base.length > 0) {
            container.innerHTML = this.prova.prova.textos_base.map(texto => `
                <div class="texto-base" data-texto-id="${texto.id}">
                    <h3>${texto.titulo}</h3>
                    <p>${texto.conteudo}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '';
        }
    }

    renderizarQuestoes() {
        const container = document.getElementById('questoesContainer');
        
        if (!this.prova.prova.questoes || this.prova.prova.questoes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--light-beige);">Nenhuma questão encontrada nesta prova.</p>';
            return;
        }

        container.innerHTML = this.prova.prova.questoes.map(questao => {
            const temImagem = questao.tem_imagem || questao.imagem_id;
            const imagemHtml = temImagem ? 
                `<img src="./data/img/prova_${this.provaId}_img/${questao.imagem_id || 'img_1'}.png" 
                      alt="Imagem da questão" 
                      class="questao-imagem"
                      onerror="this.style.display='none'">` : '';

            return `
                <div class="questao" id="questao-${questao.numero_prova}" data-questao-id="${questao.id}">
                    <div class="questao-header">
                        <span class="questao-numero">Questão ${questao.numero_prova}</span>
                        <span class="questao-area">${questao.area_conhecimento || 'Geral'}</span>
                    </div>
                    
                    ${questao.texto_contexto ? `
                        <div class="texto-contexto">
                            <p><strong>Texto de apoio:</strong> ${questao.texto_contexto}</p>
                        </div>
                    ` : ''}
                    
                    ${imagemHtml}
                    
                    <div class="questao-enunciado">${questao.enunciado || 'Enunciado não disponível'}</div>
                    
                    <div class="alternativas">
                        ${(questao.alternativas || []).map(alt => `
                            <div class="alternativa" 
                                 data-letra="${alt.letra}"
                                 onclick="prova.selecionarAlternativa(${questao.numero_prova}, '${alt.letra}')">
                                <div class="alternativa-letra">${alt.letra}</div>
                                <div class="alternativa-texto">${alt.texto || 'Alternativa não disponível'}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="feedback" id="feedback-${questao.numero_prova}" style="display: none;"></div>
                </div>
            `;
        }).join('');
    }

    selecionarAlternativa(numeroQuestao, letra) {
        if (this.finalizada) return;

        const questaoElement = document.getElementById(`questao-${numeroQuestao}`);
        if (!questaoElement) {
            console.error('Questão não encontrada:', numeroQuestao);
            return;
        }

        const alternativas = questaoElement.querySelectorAll('.alternativa');
        alternativas.forEach(alt => alt.classList.remove('selecionada'));
        
        const alternativaSelecionada = questaoElement.querySelector(`[data-letra="${letra}"]`);
        if (alternativaSelecionada) {
            alternativaSelecionada.classList.add('selecionada');
        }
        
        this.respostas[numeroQuestao] = letra;
        this.verificarResposta(numeroQuestao, letra);
        this.atualizarStats();
    }

    verificarResposta(numeroQuestao, respostaUsuario) {
        const questao = this.prova.prova.questoes.find(q => q.numero_prova === numeroQuestao);
        if (!questao) {
            console.error('Questão não encontrada para verificação:', numeroQuestao);
            return;
        }

        const gabaritoCorreto = questao.gabarito;
        const feedbackElement = document.getElementById(`feedback-${numeroQuestao}`);
        const questaoElement = document.getElementById(`questao-${numeroQuestao}`);
        const alternativaElement = questaoElement.querySelector(`[data-letra="${respostaUsuario}"]`);
        
        if (!gabaritoCorreto) {
            console.warn('Questão sem gabarito:', numeroQuestao);
            return;
        }

        if (respostaUsuario === gabaritoCorreto) {
            questaoElement.classList.add('correta');
            if (alternativaElement) alternativaElement.classList.add('correta');
            feedbackElement.innerHTML = `
                <div class="feedback correta">
                    ✅ <span>Correto!</span> A alternativa ${gabaritoCorreto} está correta.
                </div>
            `;
        } else {
            questaoElement.classList.add('incorreta');
            if (alternativaElement) alternativaElement.classList.add('incorreta');
            
            const corretaElement = questaoElement.querySelector(`[data-letra="${gabaritoCorreto}"]`);
            if (corretaElement) {
                corretaElement.classList.add('correta');
            }
            
            feedbackElement.innerHTML = `
                <div class="feedback incorreta">
                    ❌ <span>Incorreto!</span> Você marcou ${respostaUsuario}, mas a correta é ${gabaritoCorreto}.
                </div>
            `;
        }
        
        feedbackElement.style.display = 'block';
    }

    atualizarStats() {
        const total = this.prova.prova.total_questoes || 0;
        const respondidas = Object.keys(this.respostas).length;
        const corretas = Object.keys(this.respostas).filter(num => {
            const questao = this.prova.prova.questoes.find(q => q.numero_prova == num);
            return questao && this.respostas[num] === questao.gabarito;
        }).length;
        
        const pontuacao = total > 0 ? Math.round((corretas / total) * 100) : 0;
        const progresso = total > 0 ? (respondidas / total) * 100 : 0;

        document.getElementById('respondidas').textContent = respondidas;
        document.getElementById('corretas').textContent = corretas;
        document.getElementById('pontuacao').textContent = `${pontuacao}%`;
        document.getElementById('progressFill').style.width = `${progresso}%`;
    }

    finalizarProva() {
        this.finalizada = true;
        
        this.prova.prova.questoes.forEach(questao => {
            if (!this.respostas[questao.numero_prova]) {
                this.verificarResposta(questao.numero_prova, null);
            }
        });

        const corretas = Object.keys(this.respostas).filter(num => {
            const q = this.prova.prova.questoes.find(questao => questao.numero_prova == num);
            return q && this.respostas[num] === q.gabarito;
        }).length;
        
        const total = this.prova.prova.total_questoes || 0;
        const percentual = total > 0 ? Math.round((corretas / total) * 100) : 0;
        
        alert(`Prova finalizada!\n\nResultado: ${corretas}/${total} (${percentual}%)`);
    }

    reiniciarProva() {
        if (confirm('Deseja reiniciar a prova? Todas as respostas serão perdidas.')) {
            this.respostas = {};
            this.finalizada = false;
            this.renderizarQuestoes();
            this.atualizarStats();
        }
    }

    configurarEventos() {
        document.getElementById('finalizarBtn').addEventListener('click', () => this.finalizarProva());
        document.getElementById('reiniciarBtn').addEventListener('click', () => this.reiniciarProva());
    }
}

const prova = new GerenciadorProva();
