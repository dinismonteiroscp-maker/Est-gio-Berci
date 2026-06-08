let subcatAtiva = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarEstruturaAdmin();
});

async function carregarEstruturaAdmin() {
    const res = await fetch('api/api.php?acao=listar_estrutura');
    const categorias = await res.json();
    const menu = document.getElementById("menu-admin");
    menu.innerHTML = "";

    categorias.forEach(cat => {
        const div = document.createElement("div");
        div.className = "accordion-item";
        
        let subsHtml = "";
        cat.subcategorias.forEach(sub => {
            subsHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="subcat-btn" style="width:70%;" onclick="carregarProdutosAdmin(${sub.id})">${sub.nome}</button>
                    <div class="quick-actions" style="position:static;">
                        <button class="btn-action" onclick="eliminarSubcategoria(${sub.id})">🗑️</button>
                    </div>
                </div>
            `;
        });

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f3f5; border-radius:8px; padding-right:10px;">
                <button class="accordion-header" style="width:80%; background:none;">${cat.nome}</button>
                <div>
                    <button class="btn-action" onclick="eliminarCategoria(${cat.id})">🗑️</button>
                </div>
            </div>
            <div class="accordion-content open" style="padding-left:1rem;">
                ${subsHtml}
                <button class="btn-dashed" onclick="abrirModalSubcategoria(${cat.id})">+ Subcategoria</button>
            </div>
        `;
        menu.appendChild(div);
    });
}

/* Modais Control */
function fecharModais() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); }
function abrirModalCategoria() { document.getElementById('form-categoria').reset(); document.getElementById('cat-id').value=''; document.getElementById('modal-categoria').classList.add('open'); }
function abrirModalSubcategoria(catId) { document.getElementById('form-subcategoria').reset(); document.getElementById('subcat-id').value=''; document.getElementById('subcat-cat-id').value = catId; document.getElementById('modal-subcategoria').classList.add('open'); }

/* CRUD Categoria e Subcategoria */
async function guardarCategoria(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('cat-id').value);
    fd.append('nome', document.getElementById('cat-nome').value);
    await fetch('api/api.php?acao=guardar_categoria', { method: 'POST', body: fd });
    fecharModais(); carregarEstruturaAdmin();
}
async function eliminarCategoria(id) {
    if(confirm("ATENÇÃO: Eliminar esta categoria apagará permanentemente todas as subcategorias e produtos associados em efeito Cascata! Confirmar?")) {
        const fd = new FormData(); fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_categoria', { method: 'POST', body: fd });
        carregarEstruturaAdmin();
    }
}
async function guardarSubcategoria(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('subcat-id').value);
    fd.append('categoria_id', document.getElementById('subcat-cat-id').value);
    fd.append('nome', document.getElementById('subcat-nome').value);
    await fetch('api/api.php?acao=guardar_subcategoria', { method: 'POST', body: fd });
    fecharModais(); carregarEstruturaAdmin();
}
async function eliminarSubcategoria(id) {
    if(confirm("Deseja eliminar esta subcategoria e todos os seus produtos?")) {
        const fd = new FormData(); fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_subcategoria', { method: 'POST', body: fd });
        carregarEstruturaAdmin();
    }
}

/* CRUD Produtos */
async function carregarProdutosAdmin(subcatId) {
    subcatAtiva = subcatId;
    const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
    const produtos = await res.json();
    
    const grid = document.getElementById("grid-produtos-admin");
    grid.innerHTML = "";

    produtos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "card-produto";
        let img = prod.imagem_url ? `<img src="${prod.imagem_url}">` : `<img src="https://via.placeholder.com/260x180">`;
        card.innerHTML = `
            <div class="quick-actions">
                <button class="btn-action" onclick="eliminarProduto(${prod.id})">🗑️</button>
            </div>
            ${img}
            <h3>${prod.nome}</h3>
            <div class="preco-tag">${prod.tipo_preco === 'fixo' ? prod.preco_fixo+' €' : 'Preço Dinâmico'}</div>
        `;
        grid.appendChild(card);
    });

    // Card Tracejado para Adicionar Produto no final do grid
    const addCard = document.createElement("div");
    addCard.className = "card-produto dashed-card";
    addCard.innerHTML = `<div>+ Adicionar Produto</div>`;
    addCard.onclick = () => abrirModalProduto(subcatId);
    grid.appendChild(addCard);
}

function abrirModalProduto(subcatId) {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-subcat-id').value = subcatId;
    document.getElementById('container-tabela-matriz').innerHTML = '';
    document.getElementById('inputs-valores-fatores').innerHTML = '';
    toggleTipoPreco();
    document.getElementById('modal-produto').classList.add('open');
}

function toggleTipoPreco() {
    const isVariavel = document.getElementById('prod-tipo-preco').checked;
    document.getElementById('bloco-preco-fixo').style.display = isVariavel ? 'none' : 'block';
    document.getElementById('bloco-preco-variavel').style.display = isVariavel ? 'block' : 'none';
}

/* Motor Combinatório da Matriz de Preço Dinâmica */
function gerarMatriz() {
    const chks = document.querySelectorAll('.chk-fator:checked');
    const containerInputs = document.getElementById('inputs-valores-fatores');
    
    // Reter valores temporários para não limpar a digitação do admin a meio do processo
    let valoresAntigos = {};
    document.querySelectorAll('.input-valores-fator').forEach(i => {
        valoresAntigos[i.dataset.fator] = i.value;
    });

    containerInputs.innerHTML = "";
    
    if(chks.length === 0) {
        document.getElementById('container-tabela-matriz').innerHTML = '';
        return;
    }

    chks.forEach(chk => {
        const fator = chk.value;
        const valAnterior = valoresAntigos[fator] || "";
        const div = document.createElement('div');
        div.className = "form-group";
        div.innerHTML = `
            <label style="text-transform:capitalize;">Valores para ${fator.replace('_',' ')} (Separados por vírgula)</label>
            <input type="text" class="input-valores-fator" data-fator="${fator}" value="${valAnterior}" oninput="renderizarTabelaCombinatoria()" placeholder="Ex: A4, A3 ou 100, 200">
        `;
        containerInputs.appendChild(div);
    });
    renderizarTabelaCombinatoria();
}

function renderizarTabelaCombinatoria() {
    const inputs = document.querySelectorAll('.input-valores-fator');
    let listas = [];
    let nomesFatores = [];

    inputs.forEach(inp => {
        let arr = inp.value.split(',').map(s => s.trim()).filter(s => s !== "");
        if(arr.length > 0) {
            listas.push(arr);
            nomesFatores.push(inp.dataset.fator);
        }
    });

    if(listas.length === 0) {
        document.getElementById('container-tabela-matriz').innerHTML = '';
        return;
    }

    // Função Recursiva para calcular Produto Cartesiano (Combinações)
    const cartesiano = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinacoes = listas.length > 1 ? cartesiano(listas) : listas[0].map(x => [x]);

    let tableHtml = `<table class="matriz-table"><thead><tr>`;
    nomesFatores.forEach(n => tableHtml += `<th style="text-transform:capitalize;">${n.replace('_',' ')}</th>`);
    tableHtml += `<th>Preço (€)</th></tr></thead><tbody>`;

    combinacoes.forEach((combo, idx) => {
        let arrCombo = Array.isArray(combo) ? combo : [combo];
        tableHtml += `<tr class="linha-matriz" data-combo='${JSON.stringify(arrCombo)}'>`;
        arrCombo.forEach(v => tableHtml += `<td>${v}</td>`);
        tableHtml += `<td><input type="number" step="0.01" class="preco-variante-input" required style="width:80px;"></td></tr>`;
    });

    tableHtml += `</tbody></table>`;
    document.getElementById('container-tabela-matriz').innerHTML = tableHtml;
}

async function guardarProduto(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('id', document.getElementById('prod-id').value);
    fd.append('subcategoria_id', document.getElementById('prod-subcat-id').value);
    fd.append('nome', document.getElementById('prod-nome').value);
    
    const isVariavel = document.getElementById('prod-tipo-preco').checked;
    fd.append('tipo_preco', isVariavel ? 'variavel' : 'fixo');
    fd.append('preco_fixo', document.getElementById('prod-preco-fixo').value);
    
    const imgFile = document.getElementById('prod-imagem').files[0];
    if(imgFile) fd.append('imagem', imgFile);

    if (isVariavel) {
        let variantes = [];
        const inputsFatores = document.querySelectorAll('.input-valores-fator');
        let nomesFatores = Array.from(inputsFatores).map(i => i.dataset.fator);

        document.querySelectorAll('.linha-matriz').forEach(tr => {
            let valoresCombo = JSON.parse(tr.dataset.combo);
            let precoVal = tr.querySelector('.preco-variante-input').value;
            
            let itemVariante = { tamanho: null, tipo_impressao: null, quantidade: null, acabamento: null, preco: precoVal };
            nomesFatores.forEach((nome, i) => {
                itemVariante[nome] = valoresCombo[i];
            });
            variantes.push(itemVariante);
        });
        fd.append('variantes', JSON.stringify(variantes));
    }

    await fetch('api/api.php?acao=guardar_produto', { method: 'POST', body: fd });
    fecharModais();
    carregarProdutosAdmin(subcatAtiva);
}

async function eliminarProduto(id) {
    if(confirm("Deseja eliminar este produto definitivamente?")) {
        const fd = new FormData(); fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_produto', { method: 'POST', body: fd });
        carregarProdutosAdmin(subcatAtiva);
    }
}