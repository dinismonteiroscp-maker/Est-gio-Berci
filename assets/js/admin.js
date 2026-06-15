// ==================== VARIAVEIS GLOBAIS ====================
let subcatAtiva = null;
let estruturaLocal = [];
let contextoAtual = null;
let estruturaSelecao = [];
let selecionados = {
    categorias: new Set(),
    subcategorias: new Set(),
    produtos: new Set()
};

// ==================== INICIALIZACAO ====================
document.addEventListener("DOMContentLoaded", () => {
    carregarEstruturaAdmin();
});

// ==================== UTILITARIOS ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function fecharModais() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    contextoAtual = null;
}

// ==================== CATEGORIAS ====================
async function carregarEstruturaAdmin() {
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura');
        estruturaLocal = await res.json();
        const menu = document.getElementById("menu-admin");
        if (!menu) return;
        
        const itensAntigos = menu.querySelectorAll('.accordion-item');
        itensAntigos.forEach(item => item.remove());

        estruturaLocal.forEach(cat => {
            const div = document.createElement("div");
            div.className = "accordion-item";
            
            let subsHtml = "";
            if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
                cat.subcategorias.forEach(sub => {
                    subsHtml += `
                        <div class="subcat-container">
                            <button class="subcat-btn" onclick="carregarProdutosAdmin(${sub.id})">${escapeHtml(sub.nome)}</button>
                            <div class="menu-row-actions">
                                <button class="btn-action btn-edit" onclick="abrirModalEditarSubcategoria(${cat.id}, ${sub.id}, '${escapeHtml(sub.nome)}')">✎</button>
                                <button class="btn-action btn-delete" onclick="eliminarSubcategoria(${sub.id})">✕</button>
                            </div>
                        </div>
                    `;
                });
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="accordion-header" onclick="toggleAccordion(this)">${escapeHtml(cat.nome)}</button>
                    <div class="menu-row-actions">
                        <button class="btn-action btn-edit" onclick="abrirModalEditarCategoria(${cat.id}, '${escapeHtml(cat.nome)}')">✎</button>
                        <button class="btn-action btn-delete" onclick="eliminarCategoria(${cat.id})">✕</button>
                    </div>
                </div>
                <div class="accordion-content" style="display:none; padding-left:0.5rem; margin-top:0.5rem;">
                    ${subsHtml}
                    <button class="btn-dashed" onclick="abrirModalSubcategoria(${cat.id})">+ Subcategoria</button>
                </div>
            `;
            menu.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao carregar estrutura:", erro);
    }
}

function toggleAccordion(btn) {
    const content = btn.closest('.accordion-item').querySelector('.accordion-content');
    if (content.style.display === 'none') {
        content.style.display = 'block';
    } else {
        content.style.display = 'none';
    }
}

function abrirModalCategoria() {
    document.getElementById('form-categoria').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('modal-cat-titulo').innerText = "Nova Categoria";
    document.getElementById('modal-categoria').classList.add('open');
}

function abrirModalEditarCategoria(id, nome) {
    abrirModalCategoria();
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-nome').value = nome;
    document.getElementById('modal-cat-titulo').innerText = "Editar Categoria";
}

async function guardarCategoria(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('cat-id').value);
    fd.append('nome', document.getElementById('cat-nome').value);
    await fetch('api/api.php?acao=guardar_categoria', { method: 'POST', body: fd });
    fecharModais();
    carregarEstruturaAdmin();
}

async function eliminarCategoria(id) {
    if(confirm("Eliminar esta categoria?")) {
        const fd = new FormData();
        fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_categoria', { method: 'POST', body: fd });
        carregarEstruturaAdmin();
        const grid = document.getElementById("grid-produtos-admin");
        if (grid) grid.innerHTML = "<p class='mensagem-inicial'>Selecione uma subcategoria.</p>";
    }
}

// ==================== SUBCATEGORIAS ====================
function abrirModalSubcategoria(catId) {
    document.getElementById('form-subcategoria').reset();
    document.getElementById('subcat-id').value = '';
    document.getElementById('subcat-cat-id').value = catId;
    document.getElementById('modal-subcat-titulo').innerText = "Nova Subcategoria";
    document.getElementById('modal-subcategoria').classList.add('open');
}

function abrirModalEditarSubcategoria(catId, subcatId, nome) {
    abrirModalSubcategoria(catId);
    document.getElementById('subcat-id').value = subcatId;
    document.getElementById('subcat-nome').value = nome;
    document.getElementById('modal-subcat-titulo').innerText = "Editar Subcategoria";
}

async function guardarSubcategoria(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('subcat-id').value);
    fd.append('categoria_id', document.getElementById('subcat-cat-id').value);
    fd.append('nome', document.getElementById('subcat-nome').value);
    await fetch('api/api.php?acao=guardar_subcategoria', { method: 'POST', body: fd });
    fecharModais();
    carregarEstruturaAdmin();
}

async function eliminarSubcategoria(id) {
    if(confirm("Eliminar esta subcategoria?")) {
        const fd = new FormData();
        fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_subcategoria', { method: 'POST', body: fd });
        carregarEstruturaAdmin();
        const grid = document.getElementById("grid-produtos-admin");
        if (grid) grid.innerHTML = "<p class='mensagem-inicial'>Selecione uma subcategoria.</p>";
    }
}

// ==================== PRODUTOS ====================
async function carregarProdutosAdmin(subcatId) {
    try {
        subcatAtiva = subcatId;
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        const produtos = await res.json();
        
        const grid = document.getElementById("grid-produtos-admin");
        if (!grid) return;
        grid.innerHTML = "";

        if (Array.isArray(produtos) && produtos.length > 0) {
            produtos.forEach(prod => {
                const card = document.createElement("div");
                card.className = "card-produto";
                let img = prod.imagem_url ? `<img src="${prod.imagem_url}">` : `<img src="https://via.placeholder.com/260x180?text=Sem+Imagem">`;
                
                const prodData = encodeURIComponent(JSON.stringify(prod));
                card.innerHTML = `
                    <div class="quick-actions">
                        <button class="btn-action btn-edit" onclick="abrirModalEditarProduto('${prodData}')">✎</button>
                        <button class="btn-action btn-delete" onclick="eliminarProduto(${prod.id})">✕</button>
                    </div>
                    ${img}
                    <h3>${escapeHtml(prod.nome)}</h3>
                    <div class="preco-tag">${prod.tipo_preco === 'fixo' ? prod.preco_fixo + ' €' : 'Preco Dinamico'}</div>
                `;
                grid.appendChild(card);
            });
        }

        const addCard = document.createElement("div");
        addCard.className = "card-produto dashed-card";
        addCard.innerHTML = `<div>+ Adicionar Produto</div>`;
        addCard.onclick = () => abrirModalProduto(subcatId, null);
        grid.appendChild(addCard);
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

function abrirModalProduto(subcatId, produtoId = null) {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = produtoId || '';
    document.getElementById('prod-subcat-id').value = subcatId;
    document.getElementById('prod-img-atual').value = '';
    document.getElementById('container-tabela-matriz').innerHTML = '';
    document.getElementById('inputs-valores-fatores').innerHTML = '';
    document.getElementById('seccao-tabela-matriz').style.display = 'none';
    document.getElementById('modal-prod-titulo').innerText = produtoId ? "Editar Produto" : "Novo Produto";
    toggleTipoPreco();
    
    carregarFatoresDisponiveis(subcatId, produtoId);
    
    document.getElementById('modal-produto').classList.add('open');
}

function toggleTipoPreco() {
    const isVariavel = document.getElementById('prod-tipo-preco').checked;
    const blocoFixo = document.getElementById('bloco-preco-fixo');
    const blocoVariavel = document.getElementById('bloco-preco-variavel');
    
    if (blocoFixo) blocoFixo.style.display = isVariavel ? 'none' : 'block';
    if (blocoVariavel) blocoVariavel.style.display = isVariavel ? 'block' : 'none';
    
    if (!isVariavel) {
        document.getElementById('seccao-tabela-matriz').style.display = 'none';
    }
}

function gerarMatriz() {
    const chks = document.querySelectorAll('.chk-fator:checked');
    const containerInputs = document.getElementById('inputs-valores-fatores');
    
    if (containerInputs) containerInputs.innerHTML = "";
    
    if (chks.length === 0) {
        document.getElementById('seccao-tabela-matriz').style.display = 'none';
        return;
    }
    
    chks.forEach(chk => {
        const fatorNome = chk.dataset.nome;
        
        const div = document.createElement('div');
        div.className = "fator-input-box";
        div.innerHTML = `
            <label style="display:block; margin-bottom:0.4rem;">${fatorNome} (valores separados por virgula):</label>
            <input type="text" class="input-valores-fator" data-fator-nome="${fatorNome}" placeholder="Ex: Pequeno, Medio, Grande" oninput="renderizarTabelaCombinatoria()">
            <button type="button" class="btn-dashed" style="margin-top:5px;" onclick="adicionarValor(this)">+ Adicionar valor</button>
        `;
        containerInputs.appendChild(div);
    });
    
    renderizarTabelaCombinatoria();
}

function adicionarValor(btn) {
    const input = btn.previousElementSibling;
    const novoValor = prompt("Novo valor:");
    if (novoValor) {
        const valorAtual = input.value;
        if (valorAtual) {
            input.value = valorAtual + ', ' + novoValor;
        } else {
            input.value = novoValor;
        }
        input.dispatchEvent(new Event('input'));
    }
}

function renderizarTabelaCombinatoria() {
    const inputs = document.querySelectorAll('.input-valores-fator');
    const seccaoTabela = document.getElementById('seccao-tabela-matriz');
    let listas = [];
    let nomesFatores = [];

    inputs.forEach(inp => {
        let valores = inp.value.split(',').map(s => s.trim()).filter(s => s !== "");
        if (valores.length > 0) {
            listas.push(valores);
            nomesFatores.push(inp.dataset.fatorNome);
        }
    });

    if (listas.length === 0) {
        if (seccaoTabela) seccaoTabela.style.display = 'none';
        return;
    }

    if (seccaoTabela) seccaoTabela.style.display = 'block';

    const cartesiano = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinacoes = listas.length > 1 ? cartesiano(listas) : listas[0].map(x => [x]);

    let tableHtml = `<table style="width:100%; border-collapse:collapse;"><thead><tr>`;
    nomesFatores.forEach(n => tableHtml += `<th style="padding:8px;">${n}</th>`);
    tableHtml += `<th style="padding:8px;">Preco (€)</th></tr></thead><tbody>`;

    combinacoes.forEach((combo) => {
        let arrCombo = Array.isArray(combo) ? combo : [combo];
        tableHtml += `<tr class="linha-matriz" data-combo='${JSON.stringify(arrCombo)}'>`;
        arrCombo.forEach(v => tableHtml += `<td style="padding:8px;">${escapeHtml(v)}<\/td>`);
        tableHtml += `<td style="padding:8px;"><input type="number" step="0.01" class="preco-variante-input" placeholder="0.00" style="width:100px;"><\/td>`;
    });

    tableHtml += `<\/tbody><\/table>`;
    document.getElementById('container-tabela-matriz').innerHTML = tableHtml;
}

async function guardarProduto(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('prod-id').value);
    fd.append('subcategoria_id', document.getElementById('prod-subcat-id').value);
    fd.append('nome', document.getElementById('prod-nome').value);
    fd.append('imagem_url_atual', document.getElementById('prod-img-atual').value);
    
    const isVariavel = document.getElementById('prod-tipo-preco').checked;
    fd.append('tipo_preco', isVariavel ? 'variavel' : 'fixo');
    fd.append('preco_fixo', document.getElementById('prod-preco-fixo').value || '0');
    
    const imgFile = document.getElementById('prod-imagem').files[0];
    if (imgFile) fd.append('imagem', imgFile);

    if (isVariavel) {
        let variantes = [];
        const inputsFatores = document.querySelectorAll('.input-valores-fator');
        let nomesFatores = Array.from(inputsFatores).map(i => i.dataset.fatorNome);
        
        const linhas = document.querySelectorAll('.linha-matriz');
        if (linhas.length === 0) {
            alert('Selecione fatores e preencha os valores antes de salvar.');
            return;
        }
        
        linhas.forEach(tr => {
            let valoresCombo = JSON.parse(tr.dataset.combo);
            let precoInput = tr.querySelector('.preco-variante-input');
            let precoVal = precoInput ? precoInput.value : '';
            
            if (precoVal && precoVal !== '') {
                let atributos = {};
                nomesFatores.forEach((nome, i) => {
                    atributos[nome] = valoresCombo[i];
                });
                variantes.push({
                    preco: parseFloat(precoVal),
                    atributos: atributos
                });
            }
        });
        
        if (variantes.length === 0) {
            alert('Preencha pelo menos um preco na matriz!');
            return;
        }
        fd.append('variantes', JSON.stringify(variantes));
    }

    const res = await fetch('api/api.php?acao=guardar_produto', { method: 'POST', body: fd });
    const result = await res.json();
    
    if (result.sucesso) {
        fecharModais();
        if (subcatAtiva) carregarProdutosAdmin(subcatAtiva);
    }
}

async function eliminarProduto(id) {
    if(confirm("Eliminar este produto?")) {
        const fd = new FormData();
        fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_produto', { method: 'POST', body: fd });
        if (subcatAtiva) carregarProdutosAdmin(subcatAtiva);
    }
}

function abrirModalEditarProduto(prodStringEncoded) {
    try {
        const prod = JSON.parse(decodeURIComponent(prodStringEncoded));
        abrirModalProduto(prod.subcategoria_id, prod.id);
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-nome').value = prod.nome;
        document.getElementById('prod-img-atual').value = prod.imagem_url || '';
        document.getElementById('modal-prod-titulo').innerText = "Editar Produto";

        if (prod.tipo_preco === 'fixo') {
            document.getElementById('prod-tipo-preco').checked = false;
            document.getElementById('prod-preco-fixo').value = prod.preco_fixo;
            toggleTipoPreco();
        } else {
            document.getElementById('prod-tipo-preco').checked = true;
            toggleTipoPreco();
            
            setTimeout(async () => {
                if (prod.variantes && prod.variantes.length > 0) {
                    let fatoresUsados = new Set();
                    prod.variantes.forEach(v => {
                        let atributos = v.atributos_json ? JSON.parse(v.atributos_json) : v;
                        Object.keys(atributos).forEach(key => {
                            if (key !== 'preco' && key !== 'id' && key !== 'produto_id') {
                                fatoresUsados.add(key);
                            }
                        });
                    });
                    
                    await new Promise(r => setTimeout(r, 500));
                    
                    document.querySelectorAll('.chk-fator').forEach(chk => {
                        const nome = chk.dataset.nome;
                        if (fatoresUsados.has(nome)) {
                            chk.checked = true;
                        }
                    });
                    
                    gerarMatriz();
                    
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('.input-valores-fator');
                        inputs.forEach(input => {
                            const nome = input.dataset.fatorNome;
                            const valoresUnicos = [...new Set(prod.variantes.map(v => {
                                let atributos = v.atributos_json ? JSON.parse(v.atributos_json) : v;
                                return atributos[nome];
                            }))];
                            if (valoresUnicos.length > 0 && valoresUnicos[0]) {
                                input.value = valoresUnicos.join(', ');
                            }
                        });
                        renderizarTabelaCombinatoria();
                        
                        setTimeout(() => {
                            document.querySelectorAll('.linha-matriz').forEach(tr => {
                                let comboValores = JSON.parse(tr.dataset.combo);
                                let varianteMatch = prod.variantes.find(v => {
                                    let atributos = v.atributos_json ? JSON.parse(v.atributos_json) : v;
                                    let match = true;
                                    comboValores.forEach((valor, idx) => {
                                        const nomeFator = document.querySelectorAll('.input-valores-fator')[idx]?.dataset.fatorNome;
                                        if (atributos[nomeFator] !== valor) match = false;
                                    });
                                    return match;
                                });
                                if (varianteMatch) {
                                    const precoInput = tr.querySelector('.preco-variante-input');
                                    if (precoInput) precoInput.value = varianteMatch.preco;
                                }
                            });
                        }, 100);
                    }, 100);
                }
            }, 500);
        }
    } catch(e) {
        console.error("Erro ao editar produto:", e);
    }
}

// ==================== FATORES ====================

async function abrirGerirFatores() {
    await carregarListaFatores();
    document.getElementById('modal-gerir-fatores').classList.add('open');
}

async function carregarListaFatores() {
    const res = await fetch('api/api.php?acao=listar_todos_fatores');
    const fatores = await res.json();
    
    const container = document.getElementById('lista-fatores-container');
    if (!container) return;
    
    if (fatores.length === 0) {
        container.innerHTML = '<div class="info-box">Nenhum fator criado ainda.</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            ${fatores.map(f => {
                let aplicaTexto = '';
                if (f.escopo === 'global') aplicaTexto = 'Todos os produtos';
                else if (f.escopo === 'categoria') aplicaTexto = 'Categoria';
                else if (f.escopo === 'subcategoria') aplicaTexto = 'Subcategoria';
                else if (f.escopo === 'produto') aplicaTexto = 'Produto';
                else if (f.escopo === 'produto_pendente') aplicaTexto = 'Produto (pendente)';
                else aplicaTexto = f.escopo;
                
                return `
                <div class="fator-row">
                    <div class="fator-info">
                        <div class="fator-nome">${escapeHtml(f.nome)}</div>
                        <div class="fator-detalhes">
                            Aplica-se a: ${aplicaTexto}${f.entidade_nome ? ' - ' + f.entidade_nome : ''}
                        </div>
                    </div>
                    <div class="fator-actions">
                        <button class="btn-action btn-edit" onclick="abrirModalEditarFator(${f.id})">✎</button>
                        <button class="btn-action btn-delete" onclick="eliminarFator(${f.id})">✕</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

function abrirModalCriarFator() {
    const subcatId = document.getElementById('prod-subcat-id').value;
    const produtoId = document.getElementById('prod-id').value;
    const produtoNome = document.getElementById('prod-nome').value || 'Novo Produto';
    
    if (subcatId && subcatId !== '') {
        fetch(`api/api.php?acao=listar_estrutura`)
            .then(res => res.json())
            .then(categorias => {
                let subcatNome = '';
                let catId = null;
                let catNome = '';
                
                for (let cat of categorias) {
                    for (let sub of cat.subcategorias) {
                        if (sub.id == subcatId) {
                            subcatNome = sub.nome;
                            catId = cat.id;
                            catNome = cat.nome;
                            break;
                        }
                    }
                }
                
                contextoAtual = {
                    subcategoria_id: subcatId,
                    subcategoria_nome: subcatNome,
                    categoria_id: catId,
                    categoria_nome: catNome,
                    produto_id: produtoId || 'novo',
                    produto_nome: produtoNome
                };
                
                document.getElementById('form-fator').reset();
                document.getElementById('fator-id').value = '';
                document.getElementById('modal-fator-titulo').innerText = 'Novo Fator';
                document.getElementById('entidade-select-group').style.display = 'none';
                document.getElementById('fator-escopo').value = 'subcategoria';
                document.getElementById('modal-fator').classList.add('open');
            });
    } else {
        contextoAtual = null;
        document.getElementById('form-fator').reset();
        document.getElementById('fator-id').value = '';
        document.getElementById('modal-fator-titulo').innerText = 'Novo Fator';
        document.getElementById('entidade-select-group').style.display = 'none';
        document.getElementById('fator-escopo').value = 'global';
        document.getElementById('modal-fator').classList.add('open');
    }
}

async function abrirModalEditarFator(id) {
    const res = await fetch('api/api.php?acao=listar_todos_fatores');
    const fatores = await res.json();
    const fator = fatores.find(f => f.id == id);
    
    if (!fator) return;
    
    document.getElementById('form-fator').reset();
    document.getElementById('fator-id').value = fator.id;
    document.getElementById('fator-nome').value = fator.nome;
    document.getElementById('fator-escopo').value = fator.escopo;
    document.getElementById('modal-fator-titulo').innerText = 'Editar Fator';
    contextoAtual = null;
    
    if (fator.escopo !== 'global' && fator.entidade_id) {
        await carregarEntidadeSelect(fator.escopo, fator.entidade_id);
        document.getElementById('entidade-select-group').style.display = 'block';
    } else {
        document.getElementById('entidade-select-group').style.display = 'none';
    }
    
    document.getElementById('modal-fator').classList.add('open');
}

async function mudarEscopoFator() {
    const escopo = document.getElementById('fator-escopo').value;
    const entidadeGroup = document.getElementById('entidade-select-group');
    
    if (contextoAtual && escopo !== 'global') {
        entidadeGroup.style.display = 'none';
        return;
    }
    
    if (escopo === 'global') {
        entidadeGroup.style.display = 'none';
        return;
    }
    
    entidadeGroup.style.display = 'block';
    await carregarEntidadeOptions(escopo);
}

async function carregarEntidadeOptions(escopo) {
    const entidadeSelect = document.getElementById('fator-entidade-id');
    const entidadeLabel = document.getElementById('entidade-label');
    
    if (escopo === 'categoria') {
        entidadeLabel.innerText = 'Selecionar Categoria:';
        const res = await fetch('api/api.php?acao=listar_categorias_simples');
        const categorias = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
    } else if (escopo === 'subcategoria') {
        entidadeLabel.innerText = 'Selecionar Subcategoria:';
        const res = await fetch('api/api.php?acao=listar_subcategorias_simples');
        const subcategorias = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            subcategorias.map(s => `<option value="${s.id}">${escapeHtml(s.categoria_nome)} > ${escapeHtml(s.nome)}</option>`).join('');
    } else if (escopo === 'produto') {
        entidadeLabel.innerText = 'Selecionar Produto:';
        const res = await fetch('api/api.php?acao=listar_produtos_simples');
        const produtos = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            produtos.map(p => `<option value="${p.id}">${escapeHtml(p.categoria_nome)} > ${escapeHtml(p.subcategoria_nome)} > ${escapeHtml(p.nome)}</option>`).join('');
    }
}

async function carregarEntidadeSelect(escopo, entidadeId) {
    const entidadeSelect = document.getElementById('fator-entidade-id');
    const entidadeLabel = document.getElementById('entidade-label');
    
    if (escopo === 'categoria') {
        entidadeLabel.innerText = 'Selecionar Categoria:';
        const res = await fetch('api/api.php?acao=listar_categorias_simples');
        const categorias = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
        entidadeSelect.value = entidadeId;
    } else if (escopo === 'subcategoria') {
        entidadeLabel.innerText = 'Selecionar Subcategoria:';
        const res = await fetch('api/api.php?acao=listar_subcategorias_simples');
        const subcategorias = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            subcategorias.map(s => `<option value="${s.id}">${escapeHtml(s.categoria_nome)} > ${escapeHtml(s.nome)}</option>`).join('');
        entidadeSelect.value = entidadeId;
    } else if (escopo === 'produto') {
        entidadeLabel.innerText = 'Selecionar Produto:';
        const res = await fetch('api/api.php?acao=listar_produtos_simples');
        const produtos = await res.json();
        entidadeSelect.innerHTML = '<option value="">Selecione...</option>' + 
            produtos.map(p => `<option value="${p.id}">${escapeHtml(p.categoria_nome)} > ${escapeHtml(p.subcategoria_nome)} > ${escapeHtml(p.nome)}</option>`).join('');
        entidadeSelect.value = entidadeId;
    }
}

async function guardarFator(e) {
    e.preventDefault();
    
    const nome = document.getElementById('fator-nome').value;
    let escopo = document.getElementById('fator-escopo').value;
    let entidade_id = null;
    
    if (contextoAtual && escopo !== 'global') {
        switch (escopo) {
            case 'categoria':
                entidade_id = contextoAtual.categoria_id;
                break;
            case 'subcategoria':
                entidade_id = contextoAtual.subcategoria_id;
                break;
            case 'produto':
                if (!contextoAtual.produto_id || contextoAtual.produto_id === 'novo') {
                    escopo = 'produto_pendente';
                    entidade_id = null;
                } else {
                    entidade_id = contextoAtual.produto_id;
                }
                break;
        }
    } else if (escopo !== 'global') {
        entidade_id = document.getElementById('fator-entidade-id').value;
        if (!entidade_id) {
            alert('Por favor, selecione uma entidade.');
            return;
        }
    }
    
    const fator = {
        id: document.getElementById('fator-id').value || null,
        nome: nome,
        tipo: 'select',
        escopo: escopo,
        entidade_id: entidade_id,
        opcoes: [],
        obrigatorio: false,
        ordem: 0
    };
    
    const res = await fetch('api/api.php?acao=guardar_fator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fator)
    });
    
    const result = await res.json();
    if (result.sucesso) {
        fecharModais();
        await carregarListaFatores();
        
        const subcatId = document.getElementById('prod-subcat-id').value;
        const produtoId = document.getElementById('prod-id').value;
        if (subcatId) {
            await carregarFatoresDisponiveis(subcatId, produtoId || null);
        }
        
        contextoAtual = null;
    }
}

async function eliminarFator(id) {
    if(confirm("Eliminar este fator?")) {
        const fd = new FormData();
        fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_fator', { method: 'POST', body: fd });
        await carregarListaFatores();
        
        const subcatId = document.getElementById('prod-subcat-id').value;
        const produtoId = document.getElementById('prod-id').value;
        if (subcatId) {
            await carregarFatoresDisponiveis(subcatId, produtoId || null);
        }
    }
}

async function carregarFatoresDisponiveis(subcategoriaId, produtoId = null) {
    let url = `api/api.php?acao=listar_fatores&subcategoria_id=${subcategoriaId}`;
    if (produtoId && produtoId !== '') {
        url += `&produto_id=${produtoId}`;
    }
    
    const res = await fetch(url);
    const fatores = await res.json();
    
    const container = document.getElementById('fatores-checkboxes');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (fatores.length === 0) {
        container.innerHTML = '<div class="info-box">Nenhum fator disponivel. Clique em "Gerir Fatores" para adicionar.</div>';
        return;
    }
    
    fatores.forEach(fator => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        let aplicaTexto = '';
        if (fator.escopo === 'global') aplicaTexto = ' (global)';
        else if (fator.escopo === 'categoria') aplicaTexto = ' (categoria)';
        else if (fator.escopo === 'subcategoria') aplicaTexto = ' (subcategoria)';
        else if (fator.escopo === 'produto') aplicaTexto = ' (produto)';
        else if (fator.escopo === 'produto_pendente') aplicaTexto = ' (pendente)';
        
        div.innerHTML = `
            <input type="checkbox" class="chk-fator" value="${fator.id}" 
                   data-nome="${fator.nome}" 
                   onchange="gerarMatriz()">
            <label>${escapeHtml(fator.nome)}<span style="color:#64748b; font-size:0.7rem;">${aplicaTexto}</span></label>
        `;
        container.appendChild(div);
    });
}

// ==================== ATUALIZAR PRECOS ====================

async function abrirModalAtualizarPrecos() {
    document.getElementById('modal-atualizar-precos').classList.add('open');
    await carregarArvoreSelecao();
}

async function carregarArvoreSelecao() {
    const container = document.getElementById('arvore-selecao');
    container.innerHTML = '<div class="loading">A carregar estrutura...</div>';
    
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura_completa');
        const dados = await res.json();
        
        if (Array.isArray(dados)) {
            estruturaSelecao = dados;
        } else {
            estruturaSelecao = [];
            console.error('Dados recebidos nao sao um array:', dados);
        }
        
        selecionados = {
            categorias: new Set(),
            subcategorias: new Set(),
            produtos: new Set()
        };
        
        renderizarArvoreSelecao();
    } catch (error) {
        console.error('Erro ao carregar estrutura:', error);
        container.innerHTML = '<div class="loading">Erro ao carregar estrutura. Tente novamente.</div>';
    }
}

function renderizarArvoreSelecao() {
    const container = document.getElementById('arvore-selecao');
    
    if (!estruturaSelecao || estruturaSelecao.length === 0) {
        container.innerHTML = '<div class="loading">Nenhuma categoria encontrada.</div>';
        return;
    }
    
    let html = '';
    
    estruturaSelecao.forEach(categoria => {
        const categoriaId = `cat_${categoria.id}`;
        const categoriaChecked = selecionados.categorias.has(categoria.id);
        
        html += `
            <div class="tree-item-categoria">
                <label class="checkbox-label">
                    <input type="checkbox" id="${categoriaId}" data-tipo="categoria" data-id="${categoria.id}" 
                           onchange="toggleCategoria(this, ${categoria.id})" ${categoriaChecked ? 'checked' : ''}>
                    <strong>Categoria: ${escapeHtml(categoria.nome)}</strong>
                    <span class="selected-count" id="count_${categoriaId}"></span>
                </label>
        `;
        
        if (categoria.subcategorias && categoria.subcategorias.length > 0) {
            html += `<div class="tree-item">`;
            categoria.subcategorias.forEach(subcategoria => {
                const subcategoriaId = `sub_${subcategoria.id}`;
                const subcategoriaChecked = selecionados.subcategorias.has(subcategoria.id);
                
                html += `
                    <div class="tree-item-subcategoria">
                        <label class="checkbox-label">
                            <input type="checkbox" id="${subcategoriaId}" data-tipo="subcategoria" data-id="${subcategoria.id}" 
                                   data-categoria-id="${categoria.id}" onchange="toggleSubcategoria(this, ${subcategoria.id}, ${categoria.id})" ${subcategoriaChecked ? 'checked' : ''}>
                            <strong>Subcategoria: ${escapeHtml(subcategoria.nome)}</strong>
                            <span class="selected-count" id="count_${subcategoriaId}"></span>
                        </label>
                `;
                
                if (subcategoria.produtos && subcategoria.produtos.length > 0) {
                    html += `<div class="tree-item">`;
                    subcategoria.produtos.forEach(produto => {
                        const produtoId = `prod_${produto.id}`;
                        const produtoChecked = selecionados.produtos.has(produto.id);
                        
                        let precoTexto = '';
                        if (produto.tipo_preco === 'fixo') {
                            precoTexto = produto.preco_fixo + ' €';
                        } else {
                            precoTexto = 'Preco Dinamico';
                        }
                        
                        html += `
                            <div class="tree-item-produto">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="${produtoId}" data-tipo="produto" data-id="${produto.id}" 
                                           data-subcategoria-id="${subcategoria.id}" onchange="toggleProduto(this, ${produto.id}, ${subcategoria.id})" ${produtoChecked ? 'checked' : ''}>
                                    Produto: ${escapeHtml(produto.nome)} - <span style="color:#2563eb;">${precoTexto}</span>
                                </label>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
    atualizarContadores();
}

function toggleCategoria(checkbox, categoriaId) {
    if (checkbox.checked) {
        selecionados.categorias.add(categoriaId);
        const categoria = estruturaSelecao.find(c => c.id == categoriaId);
        if (categoria && categoria.subcategorias) {
            categoria.subcategorias.forEach(sub => {
                selecionados.subcategorias.add(sub.id);
                const subCheckbox = document.getElementById(`sub_${sub.id}`);
                if (subCheckbox) subCheckbox.checked = true;
                
                if (sub.produtos) {
                    sub.produtos.forEach(prod => {
                        selecionados.produtos.add(prod.id);
                        const prodCheckbox = document.getElementById(`prod_${prod.id}`);
                        if (prodCheckbox) prodCheckbox.checked = true;
                    });
                }
            });
        }
    } else {
        selecionados.categorias.delete(categoriaId);
        const categoria = estruturaSelecao.find(c => c.id == categoriaId);
        if (categoria && categoria.subcategorias) {
            categoria.subcategorias.forEach(sub => {
                selecionados.subcategorias.delete(sub.id);
                const subCheckbox = document.getElementById(`sub_${sub.id}`);
                if (subCheckbox) subCheckbox.checked = false;
                
                if (sub.produtos) {
                    sub.produtos.forEach(prod => {
                        selecionados.produtos.delete(prod.id);
                        const prodCheckbox = document.getElementById(`prod_${prod.id}`);
                        if (prodCheckbox) prodCheckbox.checked = false;
                    });
                }
            });
        }
    }
    atualizarContadores();
}

function toggleSubcategoria(checkbox, subcategoriaId, categoriaId) {
    if (checkbox.checked) {
        selecionados.subcategorias.add(subcategoriaId);
        if (!selecionados.categorias.has(categoriaId)) {
            const catCheckbox = document.getElementById(`cat_${categoriaId}`);
            if (catCheckbox) catCheckbox.checked = true;
            selecionados.categorias.add(categoriaId);
        }
        const categoria = estruturaSelecao.find(c => c.id == categoriaId);
        if (categoria) {
            const subcategoria = categoria.subcategorias.find(s => s.id == subcategoriaId);
            if (subcategoria && subcategoria.produtos) {
                subcategoria.produtos.forEach(prod => {
                    selecionados.produtos.add(prod.id);
                    const prodCheckbox = document.getElementById(`prod_${prod.id}`);
                    if (prodCheckbox) prodCheckbox.checked = true;
                });
            }
        }
    } else {
        selecionados.subcategorias.delete(subcategoriaId);
        const categoria = estruturaSelecao.find(c => c.id == categoriaId);
        if (categoria) {
            const subcategoria = categoria.subcategorias.find(s => s.id == subcategoriaId);
            if (subcategoria && subcategoria.produtos) {
                subcategoria.produtos.forEach(prod => {
                    selecionados.produtos.delete(prod.id);
                    const prodCheckbox = document.getElementById(`prod_${prod.id}`);
                    if (prodCheckbox) prodCheckbox.checked = false;
                });
            }
        }
        const categoriaData = estruturaSelecao.find(c => c.id == categoriaId);
        if (categoriaData && categoriaData.subcategorias) {
            const hasSubcategorias = categoriaData.subcategorias.some(sub => selecionados.subcategorias.has(sub.id));
            if (!hasSubcategorias) {
                selecionados.categorias.delete(categoriaId);
                const catCheckbox = document.getElementById(`cat_${categoriaId}`);
                if (catCheckbox) catCheckbox.checked = false;
            }
        }
    }
    atualizarContadores();
}

function toggleProduto(checkbox, produtoId, subcategoriaId) {
    if (checkbox.checked) {
        selecionados.produtos.add(produtoId);
        if (!selecionados.subcategorias.has(subcategoriaId)) {
            const subCheckbox = document.getElementById(`sub_${subcategoriaId}`);
            if (subCheckbox) subCheckbox.checked = true;
            selecionados.subcategorias.add(subcategoriaId);
            
            for (let cat of estruturaSelecao) {
                const sub = cat.subcategorias ? cat.subcategorias.find(s => s.id == subcategoriaId) : null;
                if (sub && !selecionados.categorias.has(cat.id)) {
                    const catCheckbox = document.getElementById(`cat_${cat.id}`);
                    if (catCheckbox) catCheckbox.checked = true;
                    selecionados.categorias.add(cat.id);
                    break;
                }
            }
        }
    } else {
        selecionados.produtos.delete(produtoId);
        let subcategoriaHasProdutos = false;
        for (let cat of estruturaSelecao) {
            const sub = cat.subcategorias ? cat.subcategorias.find(s => s.id == subcategoriaId) : null;
            if (sub && sub.produtos) {
                subcategoriaHasProdutos = sub.produtos.some(p => selecionados.produtos.has(p.id));
                break;
            }
        }
        if (!subcategoriaHasProdutos) {
            selecionados.subcategorias.delete(subcategoriaId);
            const subCheckbox = document.getElementById(`sub_${subcategoriaId}`);
            if (subCheckbox) subCheckbox.checked = false;
            
            for (let cat of estruturaSelecao) {
                const hasSubcategorias = cat.subcategorias ? cat.subcategorias.some(sub => selecionados.subcategorias.has(sub.id)) : false;
                if (!hasSubcategorias && selecionados.categorias.has(cat.id)) {
                    selecionados.categorias.delete(cat.id);
                    const catCheckbox = document.getElementById(`cat_${cat.id}`);
                    if (catCheckbox) catCheckbox.checked = false;
                }
            }
        }
    }
    atualizarContadores();
}

function atualizarContadores() {
    if (!estruturaSelecao) return;
    
    estruturaSelecao.forEach(categoria => {
        const countSpan = document.getElementById(`count_cat_${categoria.id}`);
        if (countSpan) {
            let count = 0;
            if (categoria.subcategorias) {
                categoria.subcategorias.forEach(sub => {
                    if (selecionados.subcategorias.has(sub.id)) count++;
                    if (sub.produtos) {
                        sub.produtos.forEach(prod => {
                            if (selecionados.produtos.has(prod.id)) count++;
                        });
                    }
                });
            }
            countSpan.textContent = count > 0 ? `(${count} selecionados)` : '';
        }
    });
    
    estruturaSelecao.forEach(categoria => {
        if (categoria.subcategorias) {
            categoria.subcategorias.forEach(sub => {
                const countSpan = document.getElementById(`count_sub_${sub.id}`);
                if (countSpan && sub.produtos) {
                    const count = sub.produtos.filter(p => selecionados.produtos.has(p.id)).length;
                    countSpan.textContent = count > 0 ? `(${count} produtos selecionados)` : '';
                }
            });
        }
    });
}

function selecionarTodos() {
    if (!estruturaSelecao) return;
    
    estruturaSelecao.forEach(categoria => {
        selecionados.categorias.add(categoria.id);
        if (categoria.subcategorias) {
            categoria.subcategorias.forEach(sub => {
                selecionados.subcategorias.add(sub.id);
                if (sub.produtos) {
                    sub.produtos.forEach(prod => {
                        selecionados.produtos.add(prod.id);
                    });
                }
            });
        }
    });
    renderizarArvoreSelecao();
}

function desmarcarTodos() {
    selecionados = {
        categorias: new Set(),
        subcategorias: new Set(),
        produtos: new Set()
    };
    renderizarArvoreSelecao();
}

async function aplicarAumentoPrecos() {
    const percentagem = parseFloat(document.getElementById('percentagem-aumento').value);
    
    if (isNaN(percentagem)) {
        alert('Por favor, insira uma percentagem valida.');
        return;
    }
    
    if (selecionados.produtos.size === 0 && selecionados.subcategorias.size === 0 && selecionados.categorias.size === 0) {
        alert('Por favor, selecione pelo menos um item para atualizar.');
        return;
    }
    
    const confirmMsg = `Tem certeza que deseja aplicar ${percentagem > 0 ? '+' : ''}${percentagem}% de ${percentagem > 0 ? 'aumento' : 'diminuicao'} nos precos dos itens selecionados?`;
    if (!confirm(confirmMsg)) return;
    
    const dados = {
        percentagem: percentagem,
        categorias: Array.from(selecionados.categorias),
        subcategorias: Array.from(selecionados.subcategorias),
        produtos: Array.from(selecionados.produtos)
    };
    
    try {
        const res = await fetch('api/api.php?acao=atualizar_precos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const result = await res.json();
        
        if (result.sucesso) {
            alert(`Precos atualizados com sucesso!\n\nProdutos afetados: ${result.produtos_afetados}\nVariantes afetadas: ${result.variantes_afetadas}`);
            fecharModais();
            
            if (subcatAtiva) {
                carregarProdutosAdmin(subcatAtiva);
            }
        } else {
            alert('Erro ao atualizar precos: ' + (result.erro || 'Tente novamente'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao comunicar com o servidor.');
    }
}