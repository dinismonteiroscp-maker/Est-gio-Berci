// ==================== BERCI - APP.JS (LOJA PÚBLICA) ====================
// Design Premium - Versão Clara e Elegante

window.todasAsVariantes = {};
window.opcoesOriginais = {}; // Guarda as opções originais de cada select por produto

// ===== PRELOADER =====
document.addEventListener('DOMContentLoaded', function() {
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = `
        <div class="preloader-container">
            <div class="preloader-logo">
                <img src="image/Logo.png" alt="Berci Gráfica">
            </div>
            <div class="preloader-brand">Berci</div>
            <div class="preloader-track">
                <div class="preloader-track-inner"></div>
            </div>
            <div class="preloader-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    document.body.prepend(preloader);

    window.addEventListener('load', function() {
        setTimeout(function() {
            preloader.classList.add('hidden');
            setTimeout(function() {
                preloader.remove();
            }, 800);
        }, 1000);
    });

    carregarEstruturaCliente();

    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
});

// ===== UTILITARIOS =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPlaceholderSVG() {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="280" height="200" viewBox="0 0 280 200">
            <rect width="280" height="200" fill="#f7f2ec"/>
            <rect x="85" y="55" width="110" height="90" rx="4" fill="#ede6de" stroke="#d9d0c8" stroke-width="1.5"/>
            <text x="140" y="110" font-family="Inter, sans-serif" font-size="13" fill="#b5aaa0" text-anchor="middle" dominant-baseline="middle">Sem Imagem</text>
            <text x="140" y="128" font-family="Inter, sans-serif" font-size="10" fill="#c9a87c" text-anchor="middle" dominant-baseline="middle">Berci</text>
        </svg>
    `);
}

// ===== CARREGAR ESTRUTURA =====
async function carregarEstruturaCliente() {
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura');
        const estrutura = await res.json();
        const menu = document.getElementById("menu-categorias");
        if (!menu) return;

        menu.innerHTML = "";

        estrutura.forEach(cat => {
            const divItem = document.createElement("div");
            divItem.className = "accordion-item";
            
            let subsHtml = "";
            if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
                cat.subcategorias.forEach(sub => {
                    subsHtml += `
                        <div class="subcat-container">
                            <button class="subcat-btn" data-subcat-id="${sub.id}">${escapeHtml(sub.nome)}</button>
                        </div>
                    `;
                });
            }

            divItem.innerHTML = `
                <button class="accordion-header" data-cat-id="${cat.id}" data-cat-nome="${escapeHtml(cat.nome)}">${escapeHtml(cat.nome)}</button>
                <div class="accordion-content">
                    ${subsHtml}
                </div>
            `;

            menu.appendChild(divItem);
        });

        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', function(e) {
                const content = this.nextElementSibling;
                const categoriaId = parseInt(this.dataset.catId);
                const categoriaNome = this.dataset.catNome;
                
                if (content.classList.contains('closed')) {
                    content.classList.remove('closed');
                    this.classList.add('open');
                    carregarProdutosCategoria(categoriaId, categoriaNome);
                } else {
                    content.classList.add('closed');
                    this.classList.remove('open');
                    const grid = document.getElementById("grelha-produtos");
                    if (grid) {
                        grid.innerHTML = "<p class='mensagem-inicial'>Selecione uma categoria ou subcategoria para visualizar os produtos.</p>";
                    }
                }
            });
        });

        document.querySelectorAll('.subcat-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const subcatId = parseInt(this.dataset.subcatId);
                carregarProdutosCliente(subcatId);
            });
        });

        const primeiroHeader = document.querySelector('.accordion-header');
        if (primeiroHeader) {
            const content = primeiroHeader.nextElementSibling;
            content.classList.remove('closed');
            primeiroHeader.classList.add('open');
            const categoriaId = parseInt(primeiroHeader.dataset.catId);
            const categoriaNome = primeiroHeader.dataset.catNome;
            carregarProdutosCategoria(categoriaId, categoriaNome);
        }

    } catch (error) {
        console.error("Erro ao carregar menu:", error);
    }
}

async function carregarProdutosCategoria(categoriaId, categoriaNome) {
    const grid = document.getElementById("grelha-produtos");
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="loading-produtos">
            <div class="spinner"></div>
            <p>A carregar produtos da categoria "${escapeHtml(categoriaNome)}"...</p>
        </div>
    `;
    
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura');
        const estrutura = await res.json();
        
        const categoria = estrutura.find(c => c.id == categoriaId);
        if (!categoria) {
            grid.innerHTML = "<p class='mensagem-inicial'>Categoria não encontrada.</p>";
            return;
        }
        
        if (!categoria.subcategorias || categoria.subcategorias.length === 0) {
            grid.innerHTML = "<p class='mensagem-inicial'>Esta categoria não tem subcategorias.</p>";
            return;
        }
        
        const promessas = categoria.subcategorias.map(sub => 
            fetch(`api/api.php?acao=produtos&subcategoria_id=${sub.id}`)
                .then(res => res.ok ? res.json() : [])
                .catch(() => [])
        );
        
        const resultados = await Promise.all(promessas);
        const todosProdutos = resultados.flat();
        
        if (todosProdutos.length === 0) {
            grid.innerHTML = "<p class='mensagem-inicial'>Esta categoria não tem produtos disponíveis.</p>";
            return;
        }
        
        renderizarProdutosNaGrelha(todosProdutos);
        
    } catch (error) {
        console.error("Erro ao carregar produtos da categoria:", error);
        grid.innerHTML = "<p class='mensagem-inicial'>Erro ao carregar produtos. Tente novamente.</p>";
    }
}

async function carregarProdutosCliente(subcatId) {
    try {
        const grid = document.getElementById("grelha-produtos");
        if (grid) {
            grid.innerHTML = `
                <div class="loading-produtos">
                    <div class="spinner"></div>
                    <p>A carregar produtos...</p>
                </div>
            `;
        }
        
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        const produtos = await res.json();
        renderizarProdutosNaGrelha(produtos);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        const grid = document.getElementById("grelha-produtos");
        if (grid) grid.innerHTML = "<p class='mensagem-inicial'>Erro ao carregar produtos.</p>";
    }
}

// ===== RENDERIZAR PRODUTOS =====
function renderizarProdutosNaGrelha(produtos) {
    const grid = document.getElementById("grelha-produtos");
    if (!grid) return;
    grid.innerHTML = "";

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = "<p class='mensagem-inicial'>Nenhum produto disponível nesta categoria.</p>";
        return;
    }

    produtos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "card-produto";

        let imgUrl = prod.imagem_url;
        if (!imgUrl || imgUrl === '') {
            imgUrl = getPlaceholderSVG();
        }
        
        let seccaoOpcoes = "";
        if (prod.tipo_preco === 'variavel' && prod.variantes && prod.variantes.length > 0) {
            seccaoOpcoes = `<div class="opcoes-container" data-prodid="${prod.id}">`;
            
            // Mapear todos os atributos e suas opções
            const atributosMapeados = {};
            const todosFatores = new Set();
            
            prod.variantes.forEach(v => {
                let atributos = v.atributos_json ? JSON.parse(v.atributos_json) : v;
                Object.keys(atributos).forEach(chave => {
                    if (chave !== 'id' && chave !== 'produto_id' && chave !== 'preco' && chave !== 'atributos_json' && chave !== 'created_at' && atributos[chave]) {
                        todosFatores.add(chave);
                        if (!atributosMapeados[chave]) atributosMapeados[chave] = [];
                        if (!atributosMapeados[chave].includes(atributos[chave])) {
                            atributosMapeados[chave].push(atributos[chave]);
                        }
                    }
                });
            });

            // Ordenar fatores alfabeticamente para consistência
            const ordemFatores = Array.from(todosFatores).sort();

            // Guardar opções originais para este produto
            window.opcoesOriginais[prod.id] = {};
            ordemFatores.forEach(fator => {
                window.opcoesOriginais[prod.id][fator] = [...atributosMapeados[fator]];
            });

            // Criar selects
            ordemFatores.forEach(fator => {
                const opcoes = atributosMapeados[fator] || [];
                seccaoOpcoes += `
                    <div style="margin-bottom: 0.5rem;">
                        <label style="font-size:0.8rem; font-weight:500;">${escapeHtml(fator)}:</label>
                        <select class="select-opcao-publica" data-fator="${fator}" data-prodid="${prod.id}" onchange="recalcularPrecoPublico(${prod.id})">
                            ${opcoes.map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join('')}
                        </select>
                    </div>
                `;
            });

            seccaoOpcoes += `</div>`;
            
            // Guardar variantes normalizadas para cálculo de preço
            const variantesNormalizadas = prod.variantes.map(v => {
                if (v.atributos_json) {
                    const atributos = JSON.parse(v.atributos_json);
                    return { ...atributos, preco: v.preco };
                }
                return v;
            });
            window.todasAsVariantes[prod.id] = variantesNormalizadas;
        }

        let precoInicial = prod.tipo_preco === 'fixo' 
            ? parseFloat(prod.preco_fixo).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + ' €' 
            : 'Selecione as opções';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(prod.nome)}" onerror="this.src='${getPlaceholderSVG()}'">
            <h3>${escapeHtml(prod.nome)}</h3>
            ${seccaoOpcoes}
            <div class="preco-tag" id="preco-prod-${prod.id}">
                ${precoInicial}
            </div>
        `;
        grid.appendChild(card);

        if (prod.tipo_preco === 'variavel' && prod.variantes && prod.variantes.length > 0) {
            recalcularPrecoPublico(prod.id);
        }
    });
}

// ===== RECALCULAR PREÇO E FILTRAR (GENÉRICO PARA N FATORES) =====
function recalcularPrecoPublico(produtoId) {
    const variantes = window.todasAsVariantes[produtoId];
    const precoTag = document.getElementById(`preco-prod-${produtoId}`);
    if (!variantes || !precoTag) return;

    const container = document.querySelector(`.opcoes-container[data-prodid="${produtoId}"]`);
    if (!container) return;

    const selects = container.querySelectorAll('.select-opcao-publica');
    if (selects.length === 0) return;

    // 1. Obter valores atuais de todos os selects
    const valoresAtuais = {};
    selects.forEach(sel => {
        valoresAtuais[sel.dataset.fator] = sel.value;
    });

    // 2. Para cada select, ver se é o primeiro (índice 0) ou não
    selects.forEach((sel, index) => {
        const fatorAtual = sel.dataset.fator;
        const opcoesOriginais = window.opcoesOriginais[produtoId]?.[fatorAtual] || [];

        // Se for o primeiro select (índice 0), restaurar todas as opções originais
        if (index === 0) {
            if (opcoesOriginais.length > 0) {
                const opcoesAtuais = Array.from(sel.options).map(o => o.value);
                if (JSON.stringify(opcoesAtuais.sort()) !== JSON.stringify(opcoesOriginais.sort())) {
                    sel.innerHTML = '';
                    opcoesOriginais.forEach(op => {
                        const option = document.createElement('option');
                        option.value = op;
                        option.textContent = op;
                        sel.appendChild(option);
                    });
                    // Garantir que o valor selecionado ainda é válido
                    if (!opcoesOriginais.includes(sel.value) && opcoesOriginais.length > 0) {
                        sel.value = opcoesOriginais[0];
                    }
                }
            }
            return; // Não filtrar o primeiro
        }

        // Para os restantes selects, filtrar com base nos valores de todos os outros selects
        // Incluindo o primeiro e os outros que não estejam a ser filtrados agora
        const outrosFatores = {};
        selects.forEach(s => {
            if (s.dataset.fator !== fatorAtual) {
                outrosFatores[s.dataset.fator] = s.value;
            }
        });

        // Filtrar opções: apenas as que têm pelo menos uma variante com preço >= 0
        const opcoesValidas = opcoesOriginais.filter(opcao => {
            const comboTemp = { ...outrosFatores };
            comboTemp[fatorAtual] = opcao;
            
            const existe = variantes.some(v => {
                let match = true;
                Object.keys(comboTemp).forEach(chave => {
                    if (v[chave] !== comboTemp[chave]) {
                        match = false;
                    }
                });
                // Preço válido (>= 0)
                const precoValido = v.preco !== undefined && v.preco !== null && v.preco !== '' && parseFloat(v.preco) >= 0;
                return match && precoValido;
            });
            return existe;
        });

        // Atualizar o select com as opções válidas, ou restaurar todas se nenhuma for válida
        if (opcoesValidas.length > 0) {
            const valorSelecionado = sel.value;
            const opcoesAtuais = Array.from(sel.options).map(o => o.value);
            if (JSON.stringify(opcoesAtuais.sort()) !== JSON.stringify(opcoesValidas.sort())) {
                sel.innerHTML = '';
                opcoesValidas.forEach(op => {
                    const option = document.createElement('option');
                    option.value = op;
                    option.textContent = op;
                    if (op === valorSelecionado && opcoesValidas.includes(valorSelecionado)) {
                        option.selected = true;
                    }
                    sel.appendChild(option);
                });
                if (!opcoesValidas.includes(valorSelecionado) && opcoesValidas.length > 0) {
                    sel.value = opcoesValidas[0];
                }
            }
        } else {
            // Se não houver opções válidas, restaurar todas as originais (para não ficar vazio)
            if (opcoesOriginais.length > 0) {
                sel.innerHTML = '';
                opcoesOriginais.forEach(op => {
                    const option = document.createElement('option');
                    option.value = op;
                    option.textContent = op;
                    sel.appendChild(option);
                });
                if (opcoesOriginais.includes(sel.value)) {
                    sel.value = sel.value;
                } else {
                    sel.value = opcoesOriginais[0];
                }
            }
        }
    });

    // 3. Recolher os valores atualizados (após filtragem)
    const novosValores = {};
    selects.forEach(sel => {
        novosValores[sel.dataset.fator] = sel.value;
    });

    // 4. Encontrar variante correspondente e mostrar preço
    let varianteCorrespondente = variantes.find(v => {
        let condicao = true;
        Object.keys(novosValores).forEach(fator => {
            if (v[fator] !== novosValores[fator]) {
                condicao = false;
            }
        });
        return condicao;
    });

    if (varianteCorrespondente && varianteCorrespondente.preco !== undefined && varianteCorrespondente.preco !== null && varianteCorrespondente.preco !== '' && parseFloat(varianteCorrespondente.preco) >= 0) {
        let precoVariavelFormatado = parseFloat(varianteCorrespondente.preco).toLocaleString('pt-PT', { minimumFractionDigits: 2 });
        precoTag.innerText = precoVariavelFormatado + " €";
    } else {
        precoTag.innerText = "Indisponível";
    }
}