// ==================== BERCI - ADMIN.JS ====================
// Design Premium - Versão Clara e Elegante

// ===== VARIAVEIS GLOBAIS =====
let subcatAtiva = null;
let estruturaLocal = [];
let contextoAtual = null;
let estruturaSelecao = [];
let selecionados = {
    categorias: new Set(),
    subcategorias: new Set(),
    produtos: new Set()
};

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

    carregarEstruturaAdmin();

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

function fecharModais() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
    contextoAtual = null;
}

// Fecha apenas os modais de gestão de fatores (mantém o do produto aberto)
function fecharModaisFatores() {
    const modalGerir = document.getElementById('modal-gerir-fatores');
    const modalFator = document.getElementById('modal-fator');
    if (modalGerir) modalGerir.classList.remove('open');
    if (modalFator) modalFator.classList.remove('open');
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

function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

// ===== CATEGORIAS =====
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
                                <button class="btn-action btn-action-edit" onclick="abrirModalEditarSubcategoria(${cat.id}, ${sub.id}, '${escapeHtml(sub.nome)}')">✎</button>
                                <button class="btn-action btn-action-delete" onclick="eliminarSubcategoria(${sub.id})">✕</button>
                            </div>
                        </div>
                    `;
                });
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="accordion-header" onclick="toggleAccordion(this)">${escapeHtml(cat.nome)}</button>
                    <div class="menu-row-actions">
                        <button class="btn-action btn-action-edit" onclick="abrirModalEditarCategoria(${cat.id}, '${escapeHtml(cat.nome)}')">✎</button>
                        <button class="btn-action btn-action-delete" onclick="eliminarCategoria(${cat.id})">✕</button>
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

// ===== SUBCATEGORIAS =====
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

// ===== PRODUTOS =====
async function carregarProdutosAdmin(subcatId) {
    try {
        subcatAtiva = subcatId;
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        const produtos = await res.json();
        
        const grid = document.getElementById("grid-produtos-admin");
        if (!grid) return;
        grid.innerHTML = "";

        const placeholderImg = getPlaceholderSVG();

        if (Array.isArray(produtos) && produtos.length > 0) {
            produtos.forEach(prod => {
                const card = document.createElement("div");
                card.className = "card-produto";
                let img = prod.imagem_url && prod.imagem_url !== '' 
                    ? `<img src="${prod.imagem_url}" onerror="this.src='${getPlaceholderSVG()}'">` 
                    : `<img src="${placeholderImg}">`;
                
                const prodData = encodeURIComponent(JSON.stringify(prod));
                card.innerHTML = `
                    <div class="quick-actions">
                        <button class="btn-action btn-action-edit" onclick="abrirModalEditarProduto('${prodData}')">✎</button>
                        <button class="btn-action btn-action-delete" onclick="eliminarProduto(${prod.id})">✕</button>
                    </div>
                    ${img}
                    <h3>${escapeHtml(prod.nome)}</h3>
                    <div class="preco-tag">${prod.tipo_preco === 'fixo' ? prod.preco_fixo + ' €' : 'Preço Dinâmico'}</div>
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

// ===== MODAL PRODUTO =====
function abrirModalProduto(subcatId, produtoId = null) {
    const subcategoriaId = parseInt(subcatId) || 0;
    
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = produtoId || '';
    document.getElementById('prod-subcat-id').value = subcategoriaId;
    document.getElementById('prod-img-atual').value = '';
    document.getElementById('container-tabela-matriz').innerHTML = '';
    document.getElementById('inputs-valores-fatores').innerHTML = '';
    document.getElementById('seccao-tabela-matriz').style.display = 'none';
    document.getElementById('modal-prod-titulo').innerText = produtoId ? "Editar Produto" : "Novo Produto";
    
    carregarFatoresDisponiveis(subcategoriaId, produtoId);
    
    document.getElementById('bloco-preco-fixo').style.display = 'block';
    document.getElementById('bloco-preco-variavel').style.display = 'none';
    document.getElementById('prod-tipo-preco').checked = false;
    
    document.getElementById('modal-produto').classList.add('open');
}

function toggleTipoPreco() {
    const isVariavel = document.getElementById('prod-tipo-preco').checked;
    const blocoFixo = document.getElementById('bloco-preco-fixo');
    const blocoVariavel = document.getElementById('bloco-preco-variavel');
    
    if (blocoFixo) blocoFixo.style.display = isVariavel ? 'none' : 'block';
    if (blocoVariavel) blocoVariavel.style.display = isVariavel ? 'block' : 'none';
    
    if (isVariavel) {
        const chks = document.querySelectorAll('.chk-fator:checked');
        if (chks.length > 0) {
            gerarMatriz();
        }
    } else {
        document.getElementById('seccao-tabela-matriz').style.display = 'none';
        document.getElementById('container-tabela-matriz').innerHTML = '';
        document.getElementById('inputs-valores-fatores').innerHTML = '';
    }
}

// ===== FATORES =====
async function carregarFatoresDisponiveis(subcategoriaId, produtoId = null) {
    const subcatId = parseInt(subcategoriaId) || 0;
    
    let url = `api/api.php?acao=listar_fatores&subcategoria_id=${subcatId}`;
    if (produtoId && produtoId !== '') {
        url += `&produto_id=${produtoId}`;
    }
    
    const container = document.getElementById('fatores-checkboxes');
    if (!container) return;
    
    container.innerHTML = '<div class="info-box">A carregar fatores...</div>';
    
    try {
        const res = await fetch(url);
        const fatores = await res.json();
        
        container.innerHTML = '';
        
        if (!Array.isArray(fatores) || fatores.length === 0) {
            container.innerHTML = '<div class="info-box">Nenhum fator disponível. Clique em "Gerir Fatores" para adicionar.</div>';
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
            
            const opcoes = fator.opcoes || [];
            
            div.innerHTML = `
                <input type="checkbox" class="chk-fator" value="${fator.id}" 
                       data-nome="${fator.nome}" 
                       data-id="${fator.id}"
                       data-opcoes='${JSON.stringify(opcoes)}'
                       onchange="gerarMatriz()">
                <label>${escapeHtml(fator.nome)}<span style="color:#b5aaa0; font-size:0.7rem;">${aplicaTexto}</span></label>
            `;
            container.appendChild(div);
        });
        
        const isVariavel = document.getElementById('prod-tipo-preco').checked;
        if (isVariavel) {
            const chks = document.querySelectorAll('.chk-fator:checked');
            if (chks.length > 0) {
                gerarMatriz();
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar fatores:', error);
        container.innerHTML = '<div class="info-box" style="border-left-color:#c99a8a;">Erro ao carregar fatores.</div>';
    }
}

// ===== MATRIZ DE PREÇOS =====
function gerarMatriz() {
    const chks = document.querySelectorAll('.chk-fator:checked');
    const containerInputs = document.getElementById('inputs-valores-fatores');
    
    const valoresExistentes = {};
    document.querySelectorAll('.input-valores-fator').forEach(inp => {
        const nome = inp.dataset.fatorNome;
        if (inp.value && inp.value.trim() !== '') {
            valoresExistentes[nome] = inp.value;
        }
    });
    
    if (containerInputs) containerInputs.innerHTML = "";
    
    if (chks.length === 0) {
        document.getElementById('seccao-tabela-matriz').style.display = 'none';
        document.getElementById('container-tabela-matriz').innerHTML = '';
        return;
    }
    
    chks.forEach(chk => {
        const fatorNome = chk.dataset.nome;
        const opcoesPredefinidas = chk.dataset.opcoes ? JSON.parse(chk.dataset.opcoes) : [];
        
        const div = document.createElement('div');
        div.className = "fator-input-box";
        
        if (opcoesPredefinidas && opcoesPredefinidas.length > 0) {
            let optionsHtml = opcoesPredefinidas.map(op => `<option value="${op}">${op}</option>`).join('');
            const valorExistente = valoresExistentes[fatorNome] || '';
            
            div.innerHTML = `
                <label style="display:block; margin-bottom:0.4rem; font-weight:500;">${escapeHtml(fatorNome)}</label>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                    <select class="input-valores-fator" data-fator-nome="${fatorNome}" 
                            style="flex:1; padding:6px 10px; border:1px solid #d9d0c8; border-radius:6px; font-size:0.9rem;" 
                            onchange="renderizarTabelaCombinatoria()">
                        ${optionsHtml}
                    </select>
                    <button type="button" class="btn-dashed" style="padding:4px 12px; margin:0; width:auto; white-space:nowrap;" 
                            onclick="adicionarOpcaoSelect(this)">+ Adicionar</button>
                </div>
                <small style="color:#b5aaa0; font-size:0.75rem;">Selecione uma opção ou adicione uma nova</small>
            `;
            
            if (valorExistente) {
                const select = div.querySelector('.input-valores-fator');
                if (select) {
                    let found = false;
                    for (let opt of select.options) {
                        if (opt.value === valorExistente) {
                            select.value = valorExistente;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const option = document.createElement('option');
                        option.value = valorExistente;
                        option.text = valorExistente;
                        select.appendChild(option);
                        select.value = valorExistente;
                    }
                }
            }
        } else {
            const valorExistente = valoresExistentes[fatorNome] || '';
            div.innerHTML = `
                <label style="display:block; margin-bottom:0.4rem; font-weight:500;">${escapeHtml(fatorNome)}</label>
                <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                    <input type="text" class="input-valores-fator" data-fator-nome="${fatorNome}" 
                           placeholder="Ex: Pequeno, Médio, Grande" 
                           value="${valorExistente}"
                           style="flex:1; padding:6px 10px; border:1px solid #d9d0c8; border-radius:6px; font-size:0.9rem;" 
                           oninput="renderizarTabelaCombinatoria()">
                    <button type="button" class="btn-dashed" style="padding:4px 12px; margin:0; width:auto; white-space:nowrap;" 
                            onclick="adicionarValor(this)">+ Adicionar</button>
                </div>
                <small style="color:#b5aaa0; font-size:0.75rem;">Separe os valores por vírgula (ex: Pequeno, Médio, Grande)</small>
            `;
        }
        containerInputs.appendChild(div);
    });
    
    const inputs = document.querySelectorAll('.input-valores-fator');
    let hasValues = false;
    inputs.forEach(inp => {
        if (inp.value && inp.value.trim() !== '') {
            hasValues = true;
        }
    });
    
    if (hasValues) {
        renderizarTabelaCombinatoria();
    } else {
        document.getElementById('seccao-tabela-matriz').style.display = 'none';
        document.getElementById('container-tabela-matriz').innerHTML = '';
    }
}

function adicionarValor(btn) {
    const input = btn.previousElementSibling;
    const novoValor = prompt("Digite o novo valor:");
    if (novoValor && novoValor.trim() !== '') {
        const valorAtual = input.value;
        if (valorAtual && valorAtual.trim() !== '') {
            const valores = valorAtual.split(',').map(s => s.trim());
            if (valores.includes(novoValor.trim())) {
                alert('Este valor já existe!');
                return;
            }
            input.value = valorAtual + ', ' + novoValor.trim();
        } else {
            input.value = novoValor.trim();
        }
        input.dispatchEvent(new Event('input'));
        renderizarTabelaCombinatoria();
    }
}

function adicionarOpcaoSelect(btn) {
    const select = btn.previousElementSibling;
    const novaOpcao = prompt("Digite a nova opção:");
    if (novaOpcao && novaOpcao.trim() !== '') {
        const opcoesExistentes = Array.from(select.options).map(opt => opt.value);
        if (opcoesExistentes.includes(novaOpcao.trim())) {
            alert('Esta opção já existe!');
            return;
        }
        const option = document.createElement('option');
        option.value = novaOpcao.trim();
        option.text = novaOpcao.trim();
        select.appendChild(option);
        select.value = novaOpcao.trim();
        renderizarTabelaCombinatoria();
    }
}

function renderizarTabelaCombinatoria() {
    const inputs = document.querySelectorAll('.input-valores-fator');
    const seccaoTabela = document.getElementById('seccao-tabela-matriz');
    let listas = [];
    let nomesFatores = [];

    const precosExistentes = {};
    document.querySelectorAll('.linha-matriz').forEach(tr => {
        const comboKey = tr.dataset.combo;
        const precoInput = tr.querySelector('.preco-variante-input');
        if (precoInput && precoInput.value) {
            precosExistentes[comboKey] = precoInput.value;
        }
    });

    inputs.forEach(inp => {
        let valores = [];
        if (inp.tagName === 'SELECT') {
            valores = Array.from(inp.options).map(opt => opt.value);
        } else {
            valores = inp.value.split(',').map(s => s.trim()).filter(s => s !== "");
        }
        if (valores.length > 0) {
            listas.push(valores);
            nomesFatores.push(inp.dataset.fatorNome);
        }
    });

    if (listas.length === 0) {
        if (seccaoTabela) seccaoTabela.style.display = 'none';
        document.getElementById('container-tabela-matriz').innerHTML = '';
        return;
    }

    if (seccaoTabela) seccaoTabela.style.display = 'block';

    const cartesiano = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinacoes = listas.length > 1 ? cartesiano(listas) : listas[0].map(x => [x]);

    let tableHtml = `<div class="table-wrapper"><table>
        <thead>
            <tr>`;
    nomesFatores.forEach(n => tableHtml += `<th>${n}</th>`);
    tableHtml += `<th style="text-align:right; width:120px;">Preço (€)</th></tr></thead><tbody>`;

    combinacoes.forEach((combo) => {
        let arrCombo = Array.isArray(combo) ? combo : [combo];
        const comboKey = JSON.stringify(arrCombo);
        const precoExistente = precosExistentes[comboKey] || '';
        
        tableHtml += `<tr class="linha-matriz" data-combo='${comboKey}'>`;
        arrCombo.forEach(v => tableHtml += `<td>${escapeHtml(v)}</td>`);
        tableHtml += `<td style="text-align:right;">
            <input type="number" step="0.01" class="preco-variante-input" placeholder="0.00" 
                   value="${precoExistente}">
        </td></tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    document.getElementById('container-tabela-matriz').innerHTML = tableHtml;
}

// ===== GUARDAR PRODUTO =====
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
            
            // Só guarda se o preço estiver preenchido
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
            alert('Preencha pelo menos um preço na matriz!');
            return;
        }
        fd.append('variantes', JSON.stringify(variantes));
    }

    try {
        const res = await fetch('api/api.php?acao=guardar_produto', { method: 'POST', body: fd });
        const result = await res.json();
        
        if (result.sucesso) {
            const produtoId = result.produto_id;
            const produtoNome = document.getElementById('prod-nome').value;
            
            const convertRes = await fetch('api/api.php?acao=converter_fatores_pendentes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    produto_id: produtoId, 
                    produto_nome: produtoNome 
                })
            });
            
            fecharModais();
            if (subcatAtiva) carregarProdutosAdmin(subcatAtiva);
        } else {
            alert('Erro: ' + (result.erro || 'Tente novamente'));
        }
    } catch (error) {
        console.error('Erro ao guardar produto:', error);
        alert('Erro ao guardar produto. Tente novamente.');
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

// ===== EDITAR PRODUTO =====
function abrirModalEditarProduto(prodStringEncoded) {
    try {
        const prod = JSON.parse(decodeURIComponent(prodStringEncoded));
        const subcatId = prod.subcategoria_id || 0;
        
        abrirModalProduto(subcatId, prod.id);
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-nome').value = prod.nome;
        document.getElementById('prod-img-atual').value = prod.imagem_url || '';
        document.getElementById('modal-prod-titulo').innerText = "Editar Produto";

        if (prod.tipo_preco === 'fixo') {
            document.getElementById('prod-tipo-preco').checked = false;
            document.getElementById('prod-preco-fixo').value = prod.preco_fixo;
            document.getElementById('bloco-preco-fixo').style.display = 'block';
            document.getElementById('bloco-preco-variavel').style.display = 'none';
        } else {
            document.getElementById('prod-tipo-preco').checked = true;
            document.getElementById('bloco-preco-fixo').style.display = 'none';
            document.getElementById('bloco-preco-variavel').style.display = 'block';
            
            setTimeout(async () => {
                if (prod.variantes && prod.variantes.length > 0) {
                    let fatoresUsados = new Set();
                    let fatoresValores = {};
                    
                    prod.variantes.forEach((v) => {
                        let atributos = {};
                        if (v.atributos_json) {
                            try {
                                atributos = JSON.parse(v.atributos_json);
                            } catch(e) {}
                        } else {
                            atributos = {...v};
                            delete atributos.id;
                            delete atributos.produto_id;
                            delete atributos.preco;
                            delete atributos.created_at;
                        }
                        
                        Object.keys(atributos).forEach(key => {
                            if (key !== 'preco' && key !== 'id' && key !== 'produto_id' && key !== 'atributos_json' && key !== 'created_at') {
                                fatoresUsados.add(key);
                                if (!fatoresValores[key]) fatoresValores[key] = [];
                                if (!fatoresValores[key].includes(atributos[key])) {
                                    fatoresValores[key].push(atributos[key]);
                                }
                            }
                        });
                    });
                    
                    await new Promise(r => setTimeout(r, 500));
                    
                    const checkboxes = document.querySelectorAll('.chk-fator');
                    checkboxes.forEach(chk => {
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
                            Object.keys(fatoresValores).forEach(key => {
                                if (key === nome) {
                                    input.value = fatoresValores[key].join(', ');
                                }
                            });
                        });
                        
                        renderizarTabelaCombinatoria();
                        
                        setTimeout(() => {
                            document.querySelectorAll('.linha-matriz').forEach(tr => {
                                let comboValores = JSON.parse(tr.dataset.combo);
                                let varianteMatch = prod.variantes.find(v => {
                                    let atributos = {};
                                    if (v.atributos_json) {
                                        try {
                                            atributos = JSON.parse(v.atributos_json);
                                        } catch(e) {}
                                    } else {
                                        atributos = {...v};
                                        delete atributos.id;
                                        delete atributos.produto_id;
                                        delete atributos.preco;
                                        delete atributos.created_at;
                                    }
                                    
                                    let match = true;
                                    comboValores.forEach((valor, idx) => {
                                        const nomeFator = document.querySelectorAll('.input-valores-fator')[idx]?.dataset.fatorNome;
                                        if (atributos[nomeFator] !== valor) {
                                            match = false;
                                        }
                                    });
                                    return match;
                                });
                                
                                if (varianteMatch) {
                                    const precoInput = tr.querySelector('.preco-variante-input');
                                    if (precoInput) {
                                        precoInput.value = varianteMatch.preco;
                                    }
                                }
                            });
                        }, 100);
                    }, 100);
                }
            }, 800);
        }
    } catch(e) {
        console.error("Erro ao editar produto:", e);
        alert('Erro ao carregar o produto para edição.');
    }
}

// ===== GERIR FATORES =====

async function abrirGerirFatores() {
    contextoAtual = null;
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
        <div style="border: 1px solid rgba(0,0,0,0.04); border-radius: 10px; overflow: hidden;">
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
                        <button class="btn-action btn-action-edit" onclick="abrirModalEditarFator(${f.id})">✎</button>
                        <button class="btn-action btn-action-delete" onclick="eliminarFator(${f.id})">✕</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

function abrirModalCriarFator() {
    document.getElementById('form-fator').reset();
    document.getElementById('fator-id').value = '';
    document.getElementById('modal-fator-titulo').innerText = 'Novo Fator';
    document.getElementById('entidade-select-group').style.display = 'none';

    const subcatId = document.getElementById('prod-subcat-id').value;
    const produtoId = document.getElementById('prod-id').value;

    if (produtoId && produtoId !== '' && produtoId !== 'undefined' && produtoId !== 'null') {
        document.getElementById('fator-escopo').value = 'produto';
        contextoAtual = { tipo: 'produto', id: produtoId };
    } else if (subcatId && subcatId !== '' && subcatId !== 'undefined' && subcatId !== 'null') {
        document.getElementById('fator-escopo').value = 'produto_pendente';
        contextoAtual = { tipo: 'produto_pendente', id: null };
    } else {
        document.getElementById('fator-escopo').value = 'global';
        contextoAtual = null;
    }

    document.getElementById('modal-fator').classList.add('open');
}

async function abrirModalEditarFator(id) {
    fetch('api/api.php?acao=listar_todos_fatores')
        .then(res => res.json())
        .then(fatores => {
            const fator = fatores.find(f => f.id == id);
            if (!fator) return;
            
            document.getElementById('form-fator').reset();
            document.getElementById('fator-id').value = fator.id;
            document.getElementById('fator-nome').value = fator.nome;
            document.getElementById('fator-escopo').value = fator.escopo;
            document.getElementById('modal-fator-titulo').innerText = 'Editar Fator';
            
            document.getElementById('entidade-select-group').style.display = 'none';
            
            if (fator.escopo === 'produto' && fator.entidade_id) {
                contextoAtual = { tipo: 'produto', id: fator.entidade_id };
            } else if (fator.escopo === 'subcategoria' && fator.entidade_id) {
                contextoAtual = { tipo: 'subcategoria', id: fator.entidade_id };
            } else if (fator.escopo === 'categoria' && fator.entidade_id) {
                contextoAtual = { tipo: 'categoria', id: fator.entidade_id };
            } else if (fator.escopo === 'produto_pendente') {
                contextoAtual = { tipo: 'produto_pendente', id: null };
            } else {
                contextoAtual = null;
            }
            
            document.getElementById('modal-fator').classList.add('open');
        });
}

function mudarEscopoFator() {
    const escopo = document.getElementById('fator-escopo').value;
    document.getElementById('entidade-select-group').style.display = 'none';
    
    const subcatId = document.getElementById('prod-subcat-id').value;
    const produtoId = document.getElementById('prod-id').value;
    
    if (escopo === 'produto') {
        if (produtoId && produtoId !== '' && produtoId !== 'undefined' && produtoId !== 'null') {
            contextoAtual = { tipo: 'produto', id: produtoId };
        } else if (contextoAtual && contextoAtual.tipo === 'produto') {
            // manter
        } else {
            contextoAtual = { tipo: 'produto_pendente', id: null };
        }
    } else if (escopo === 'subcategoria') {
        if (subcatId && subcatId !== '' && subcatId !== 'undefined' && subcatId !== 'null') {
            contextoAtual = { tipo: 'subcategoria', id: subcatId };
        } else {
            contextoAtual = null;
        }
    } else if (escopo === 'categoria') {
        if (subcatId && subcatId !== '' && subcatId !== 'undefined' && subcatId !== 'null') {
            fetch('api/api.php?acao=listar_estrutura')
                .then(res => res.json())
                .then(estrutura => {
                    for (let cat of estrutura) {
                        if (cat.subcategorias && cat.subcategorias.some(s => s.id == subcatId)) {
                            contextoAtual = { tipo: 'categoria', id: cat.id };
                            break;
                        }
                    }
                })
                .catch(() => { contextoAtual = null; });
        } else {
            contextoAtual = null;
        }
    } else {
        contextoAtual = null;
    }
}

async function guardarFator(e) {
    e.preventDefault();
    
    const nome = document.getElementById('fator-nome').value;
    let escopo = document.getElementById('fator-escopo').value;
    let entidade_id = null;
    
    if (escopo === 'produto') {
        const produtoId = document.getElementById('prod-id').value;
        if (produtoId && produtoId !== '' && produtoId !== 'undefined' && produtoId !== 'null') {
            entidade_id = produtoId;
        } else if (contextoAtual && contextoAtual.tipo === 'produto') {
            entidade_id = contextoAtual.id;
        } else {
            escopo = 'produto_pendente';
            entidade_id = null;
        }
    } else if (escopo === 'produto_pendente') {
        entidade_id = null;
    } else if (escopo === 'global') {
        entidade_id = null;
    } else if (escopo === 'subcategoria') {
        const subcatId = document.getElementById('prod-subcat-id').value;
        if (subcatId && subcatId !== '' && subcatId !== 'undefined' && subcatId !== 'null') {
            entidade_id = subcatId;
        } else if (contextoAtual && contextoAtual.tipo === 'subcategoria') {
            entidade_id = contextoAtual.id;
        } else {
            alert('Não foi possível determinar a subcategoria. Selecione uma subcategoria primeiro.');
            return;
        }
    } else if (escopo === 'categoria') {
        const subcatId = document.getElementById('prod-subcat-id').value;
        if (subcatId && subcatId !== '' && subcatId !== 'undefined' && subcatId !== 'null') {
            try {
                const res = await fetch('api/api.php?acao=listar_estrutura');
                const estrutura = await res.json();
                for (let cat of estrutura) {
                    if (cat.subcategorias) {
                        for (let sub of cat.subcategorias) {
                            if (sub.id == subcatId) {
                                entidade_id = cat.id;
                                break;
                            }
                        }
                    }
                    if (entidade_id) break;
                }
                if (!entidade_id) {
                    alert('Não foi possível determinar a categoria.');
                    return;
                }
            } catch (error) {
                alert('Erro ao buscar a categoria.');
                return;
            }
        } else if (contextoAtual && contextoAtual.tipo === 'categoria') {
            entidade_id = contextoAtual.id;
        } else {
            alert('Não foi possível determinar a categoria.');
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
        // Fechar apenas modais de fatores (mantém o do produto)
        fecharModaisFatores();
        await carregarListaFatores();
        
        const subcatId = document.getElementById('prod-subcat-id').value;
        const produtoId = document.getElementById('prod-id').value;
        if (subcatId) {
            await carregarFatoresDisponiveis(subcatId, produtoId || null);
        }
        
        contextoAtual = null;
    } else {
        alert('Erro ao guardar fator: ' + (result.erro || 'Tente novamente.'));
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

// ===== ATUALIZAR PREÇOS =====
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
                            precoTexto = 'Preço Dinâmico';
                        }
                        
                        html += `
                            <div class="tree-item-produto">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="${produtoId}" data-tipo="produto" data-id="${produto.id}" 
                                           data-subcategoria-id="${subcategoria.id}" onchange="toggleProduto(this, ${produto.id}, ${subcategoria.id})" ${produtoChecked ? 'checked' : ''}>
                                    Produto: ${escapeHtml(produto.nome)} - <span style="color:#c9a87c;">${precoTexto}</span>
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
        alert('Por favor, insira uma percentagem válida.');
        return;
    }
    
    if (selecionados.produtos.size === 0 && selecionados.subcategorias.size === 0 && selecionados.categorias.size === 0) {
        alert('Por favor, selecione pelo menos um item para atualizar.');
        return;
    }
    
    const confirmMsg = `Tem certeza que deseja aplicar ${percentagem > 0 ? '+' : ''}${percentagem}% de ${percentagem > 0 ? 'aumento' : 'diminuição'} nos preços dos itens selecionados?`;
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
            alert(`Preços atualizados com sucesso!\n\nProdutos afetados: ${result.produtos_afetados}\nVariantes afetadas: ${result.variantes_afetadas}`);
            fecharModais();
            
            if (subcatAtiva) {
                carregarProdutosAdmin(subcatAtiva);
            }
        } else {
            alert('Erro ao atualizar preços: ' + (result.erro || 'Tente novamente'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao comunicar com o servidor.');
    }
}