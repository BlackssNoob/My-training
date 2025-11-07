class GerenciadorProva {
    constructor() {
        this.prova = null;
        this.respostas = {};
        this.finalizada = false;
        this.provaId = new URLSearchParams(window.location.search).get('id');
        
        if (!this.provaId) {
            window.location.href = 'hub.html';
            return;
        }

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
            const response = await fetch(`../data/provas/prova_${this.provaId}.json`);
            this.prova = await response.json();
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('provaContent').style.display = 'block';
            
            this.atualizarHeader();
        } catch (error) {
            console.error('Erro ao carregar prova:', error);
            document.getElementById('loading').innerHTML = 
                '<p>Erro ao carregar a prova</p>' +
                '<a href="hub.html" class="back-btn">Voltar ao Hub</a>';
        }
    }

    atualizarHeader() {
        document.getElementById('provaTitle').textContent = this.prova.prova.nome_prova;
        document.getElementById('provaCargo').textContent = this.prova.prova.cargo;
        document.getElementById('provaOrganizadora').textContent = this.prova.prova.organizadora;
        document.getElementById('provaAno').textContent = this.prova.prova.ano;
        document.getElementById('totalQuestoes').textContent = this.prova.prova.total_questoes;
    }

    renderizarProva() {
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
        
        container.innerHTML = this.prova.prova.questoes.map(questao => {
            const temImagem = questao.tem_imagem || questao.imagem_id;
            const imagemHtml = temImagem ? 
                `<img src="../data/img/prova_${this.provaId}_img/${questao.imagem_id || 'img_1'}.png" 
                      alt="Imagem da questão" 
                      class="questao-imagem"
                      onerror="this.style.display='none'">` : '';

            return `
                <div class="questao" id="questao-${questao.numero_prova}" data-questao-id="${questao.id}">
                    <div class="questao-header">
                        <span class="questao-numero">Questão ${questao.numero_prova}</span>
                        <span class="questao-area">${questao.area_conhecimento}</span>
                    </div>
                    
                    ${questao.texto_contexto ? `
                        <div class="texto-contexto">
                            <p><strong>Texto de apoio:</strong> ${questao.texto_contexto}</p>
                        </div>
                    ` : ''}
                    
                    ${imagemHtml}
                    
                    <div class="questao-enunciado">${questao.enunciado}</div>
                    
                    <div class="alternativas">
                        ${questao.alternativas.map(alt => `
                            <div class="alternativa" 
                                 data-letra="${alt.letra}"
                                 onclick="prova.selecionarAlternativa(${questao.numero_prova}, '${alt.letra}')">
                                <div class="alternativa-letra">${alt.letra}</div>
                                <div class="alternativa-texto">${alt.texto}</div>
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
        const alternativas = questaoElement.querySelectorAll('.alternativa');
        
        // Remove seleção anterior
        alternativas.forEach(alt => alt.classList.remove('selecionada'));
        
        // Marca como selecionada
        const alternativaSelecionada = questaoElement.querySelector(`[data-letra="${letra}"]`);
        alternativaSelecionada.classList.add('selecionada');
        
        // Salva resposta
        this.respostas[numeroQuestao] = letra;
        
        // Verifica resposta imediatamente
        this.verificarResposta(numeroQuestao, letra);
        this.atualizarStats();
    }

    verificarResposta(numeroQuestao, respostaUsuario) {
        const questao = this.prova.prova.questoes.find(q => q.numero_prova === numeroQuestao);
        const gabaritoCorreto = questao.gabarito;
        const feedbackElement = document.getElementById(`feedback-${numeroQuestao}`);
        const questaoElement = document.getElementById(`questao-${numeroQuestao}`);
        const alternativaElement = questaoElement.querySelector(`[data-letra="${respostaUsuario}"]`);
        
        if (respostaUsuario === gabaritoCorreto) {
            questaoElement.classList.add('correta');
            alternativaElement.classList.add('correta');
            feedbackElement.innerHTML = `
                <div class="feedback correta">
                    ✅ <span>Correto!</span> A alternativa ${gabaritoCorreto} está correta.
                </div>
            `;
        } else {
            questaoElement.classList.add('incorreta');
            alternativaElement.classList.add('incorreta');
            
            // Marca a correta também
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
        const total = this.prova.prova.total_questoes;
        const respondidas = Object.keys(this.respostas).length;
        const corretas = Object.keys(this.respostas).filter(num => {
            const questao = this.prova.prova.questoes.find(q => q.numero_prova == num);
            return this.respostas[num] === questao.gabarito;
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
        
        // Verifica todas as questões não respondidas
        this.prova.prova.questoes.forEach(questao => {
            if (!this.respostas[questao.numero_prova]) {
                this.verificarResposta(questao.numero_prova, null);
            }
        });

        // Mostra resultado final
        const corretas = Object.keys(this.respostas).filter(num => {
            const q = this.prova.prova.questoes.find(questao => questao.numero_prova == num);
            return this.respostas[num] === q.gabarito;
        }).length;
        
        const total = this.prova.prova.total_questoes;
        const percentual = Math.round((corretas / total) * 100);
        
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