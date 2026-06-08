let subcatAtiva = null;
let estruturaLocal = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarEstruturaAdmin();
});

async function carregarEstruturaAdmin() {
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura');
        if (!res.ok) throw new Error("Erro na resposta do servidor");
        
        estruturaLocal = await res.json();
        const menu = document.getElementById("menu-admin");
        if (!menu) return;
        
        // Remove apenas as categorias antigas, protegendo o botão azul fixo
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
                            <button class="subcat-btn" onclick="carregarProdutosAdmin(${sub.id})">${sub.nome}</button>
                            <div class="menu-row-actions">
                                <button class="btn-action btn-edit" title="Editar Subcategoria" onclick="abrirModalEditarSubcategoria(${cat.id}, ${sub.id}, '${sub.nome}')">✎</button>
                                <button class="btn-action btn-delete" title="Eliminar Subcategoria" onclick="eliminarSubcategoria(${sub.id})">✕</button>
                            </div>
                        </div>
                    `;
                });
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; border-radius:8px; padding: 6px 10px; margin-top:0.2rem;">
                    <button class="accordion-header" style="background:none; width:70%; border:none; outline:none; font-weight:700;">${cat.nome}</button>
                    <div class="menu-row-actions">
                        <button class="btn-action btn-edit" title="Editar Categoria" onclick="abrirModalEditarCategoria(${cat.id}, '${cat.nome}')">✎</button>
                        <button class="btn-action btn-delete" title="Eliminar Categoria" onclick="eliminarCategoria(${cat.id})">✕</button>
                    </div>
                </div>
                <div class="accordion-content open" style="padding-left:0.5rem; margin-top: 0.4rem;">
                    ${subsHtml}
                    <button class="btn-dashed" onclick="abrirModalSubcategoria(${cat.id})">+ Subcategoria</button>
                </div>
            `;
            menu.appendChild(div);
        });
    } catch (erro) {
        console.error("Erro ao carregar estrutura do painel:", erro);
    }
}

function fecharModais() { 
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open')); 
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

async function carregarProdutosAdmin(subcatId) {
    try {
        subcatAtiva = subcatId;
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        const produtos = await res.json();
        
        const grid = document.getElementById("grid-produtos-admin");
        if (!grid) return;
        grid.innerHTML = "";

        if (Array.isArray(produtos)) {
            produtos.forEach(prod => {
                const card = document.createElement("div");
                card.className = "card-produto";
                let img = prod.imagem_url ? `<img src="${prod.imagem_url}">` : `<img src="https://via.placeholder.com/260x180?text=Sem+Imagem">`;
                
                // Convertemos o objeto do produto para uma String segura de forma a não quebrar o HTML dos botões
                const prodData = encodeURIComponent(JSON.stringify(prod));

                card.innerHTML = `
                    <div class="quick-actions">
                        <button class="btn-action btn-edit" title="Editar Produto" onclick="abrirModalEditarProduto('${prodData}')">✎</button>
                        <button class="btn-action btn-delete" title="Eliminar Produto" onclick="eliminarProduto(${prod.id})">✕</button>
                    </div>
                    ${img}
                    <h3>${prod.nome}</h3>
                    <div class="preco-tag">${prod.tipo_preco === 'fixo' ? prod.preco_fixo+' €' : 'Preço Dinâmico'}</div>
                `;
                grid.appendChild(card);
            });
        }

        const addCard = document.createElement("div");
        addCard.className = "card-produto dashed-card";
        addCard.innerHTML = `<div>+ Adicionar Produto</div>`;
        addCard.onclick = () => abrirModalProduto(subcatId);
        grid.appendChild(addCard);
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

function abrirModalProduto(subcatId) {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-subcat-id').value = subcatId;
    document.getElementById('prod-img-atual').value = '';
    document.getElementById('container-tabela-matriz').innerHTML = '';
    document.getElementById('inputs-valores-fatores').innerHTML = '';
    
    const seccaoMatriz = document.getElementById('seccao-tabela-matriz');
    if(seccaoMatriz) seccaoMatriz.style.display = 'none';
    
    const itemMala = document.getElementById('item-chk-acessorios-mala');
    if(itemMala) itemMala.style.display = 'none';
    
    document.getElementById('modal-prod-titulo').innerText = "Novo Produto";
    document.querySelectorAll('.chk-fator').forEach(chk => chk.checked = false);
    toggleTipoPreco();
    document.getElementById('modal-produto').classList.add('open');
}

function toggleTipoPreco() {
    const chkPreco = document.getElementById('prod-tipo-preco');
    if(!chkPreco) return;
    
    const isVariavel = chkPreco.checked;
    document.getElementById('bloco-preco-fixo').style.display = isVariavel ? 'none' : 'block';
    
    const blocoVar = document.getElementById('bloco-preco-variavel');
    if(blocoVar) blocoVar.style.display = isVariavel ? 'block' : 'none';
}

function gerarMatriz() {
    const chks = document.querySelectorAll('.chk-fator:checked');
    const containerInputs = document.getElementById('inputs-valores-fatores');
    const seccaoTabela = document.getElementById('seccao-tabela-matriz');
    
    const chkMala = document.getElementById('chk-mala');
    const itemAcessoriosMala = document.getElementById('item-chk-acessorios-mala');
    if (chkMala && chkMala.checked) {
        if(itemAcessoriosMala) itemAcessoriosMala.style.display = 'flex';
    } else {
        if(itemAcessoriosMala) itemAcessoriosMala.style.display = 'none';
        const chkAcessorios = document.getElementById('chk-acessorios-mala');
        if(chkAcessorios) chkAcessorios.checked = false;
    }

    let valoresAntigos = {};
    document.querySelectorAll('.input-valores-fator').forEach(i => {
        valoresAntigos[i.dataset.fator] = i.value;
    });

    if(containerInputs) containerInputs.innerHTML = "";
    
    if(chks.length === 0) {
        document.getElementById('container-tabela-matriz').innerHTML = '';
        if(seccaoTabela) seccaoTabela.style.display = 'none';
        return;
    }

    chks.forEach(chk => {
        const fator = chk.value;
        let valAnterior = valoresAntigos[fator] || "";
        let isReadOnly = "";
        
        if (fator === "cantos_arredondados") {
            valAnterior = "Sim, Não";
            isReadOnly = "readonly style='background:#f1f5f9; color:#64748b; font-weight:600;'";
        }

        const div = document.createElement('div');
        div.className = "fator-input-box";
        div.innerHTML = `
            <label style="text-transform:capitalize; display:block; margin-bottom:0.4rem; font-size:0.85rem;">Opções para: <strong>${fator.replace(/_/g,' ')}</strong></label>
            <input type="text" class="input-valores-fator" data-fator="${fator}" value="${valAnterior}" ${isReadOnly} oninput="renderizarTabelaCombinatoria()" placeholder="Ex: Pequeno, Grande (separe com vírgulas)">
        `;
        if(containerInputs) containerInputs.appendChild(div);
    });
    renderizarTabelaCombinatoria();
}

function renderizarTabelaCombinatoria() {
    const inputs = document.querySelectorAll('.input-valores-fator');
    const seccaoTabela = document.getElementById('seccao-tabela-matriz');
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
        if(seccaoTabela) seccaoTabela.style.display = 'none';
        return;
    }

    if(seccaoTabela) seccaoTabela.style.display = 'block';

    const cartesiano = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinacoes = listas.length > 1 ? cartesiano(listas) : listas[0].map(x => [x]);

    let tableHtml = `<table style="margin-bottom:0; width:100%; border-collapse:collapse;"><thead><tr>`;
    nomesFatores.forEach(n => tableHtml += `<th style="text-transform:capitalize; padding:8px; font-size:0.85rem;">${n.replace(/_/g,' ')}</th>`);
    tableHtml += `<th style="width: 110px; text-align: right; padding:8px; font-size:0.85rem;">Preço (€)</th></tr></thead><tbody>`;

    combinacoes.forEach((combo) => {
        let arrCombo = Array.isArray(combo) ? combo : [combo];
        tableHtml += `<tr class="linha-matriz" data-combo='${JSON.stringify(arrCombo)}'>`;
        arrCombo.forEach(v => tableHtml += `<td>${v}</td>`);
        tableHtml += `<td style="text-align: right;"><input type="number" step="0.01" class="preco-variante-input" required placeholder="0.00" style="padding:4px; text-align:right;"></td></tr>`;
    });

    tableHtml += `</tbody></table>`;
    document.getElementById('container-tabela-matriz').innerHTML = tableHtml;
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
    if(confirm("Deseja apagar esta categoria? Todos os itens abaixo serão eliminados.")) {
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
    fecharModais(); 
    carregarEstruturaAdmin();
}

async function eliminarSubcategoria(id) {
    if(confirm("Deseja eliminar esta subcategoria?")) {
        const fd = new FormData(); fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_subcategoria', { method: 'POST', body: fd });
        carregarEstruturaAdmin();
    }
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
            
            let itemVariante = { preco: precoVal };
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
    if(confirm("Deseja apagar este produto?")) {
        const fd = new FormData(); fd.append('id', id);
        await fetch('api/api.php?acao=eliminar_produto', { method: 'POST', body: fd });
        carregarProdutosAdmin(subcatAtiva);
    }
}

function abrirModalEditarProduto(prodStringEncoded) {
    try {
        const prod = JSON.parse(decodeURIComponent(prodStringEncoded));
        abrirModalProduto(prod.subcategoria_id);
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-nome').value = prod.nome;
        document.getElementById('prod-img-atual').value = prod.imagem_url || '';
        document.getElementById('modal-prod-titulo').innerText = "Editar Produto";

        if (prod.tipo_preco === 'fixo') {
            document.getElementById('prod-tipo-preco').checked = false;
            document.getElementById('prod-preco-fixo').value = prod.preco_fixo;
        } else {
            document.getElementById('prod-tipo-preco').checked = true;
            
            let fatoresAtivos = {};
            if(prod.variantes && prod.variantes.length > 0) {
                prod.variantes.forEach(v => {
                    Object.keys(v).forEach(chave => {
                        if(chave !== 'id' && chave !== 'produto_id' && chave !== 'preco' && v[chave]) {
                            if(!fatoresAtivos[chave]) fatoresAtivos[chave] = [];
                            if(!fatoresAtivos[chave].includes(v[chave])) fatoresAtivos[chave].push(v[chave]);
                        }
                    });
                });
            }

            Object.keys(fatoresAtivos).forEach(fator => {
                const chk = document.querySelector(`.chk-fator[value="${fator}"]`);
                if(chk) chk.checked = true;
            });

            gerarMatriz();

            Object.keys(fatoresAtivos).forEach(fator => {
                const inp = document.querySelector(`.input-valores-fator[data-fator="${fator}"]`);
                if(inp) inp.value = fatoresAtivos[fator].join(', ');
            });

            renderizarTabelaCombinatoria();

            document.querySelectorAll('.linha-matriz').forEach(tr => {
                let comboValores = JSON.parse(tr.dataset.combo);
                let varianteCorrespondente = prod.variantes.find(v => {
                    let check = true; let idx = 0;
                    const inputsFatores = document.querySelectorAll('.input-valores-fator');
                    inputsFatores.forEach(inp => {
                        let f = inp.dataset.fator;
                        if(v[f] !== comboValores[idx]) check = false;
                        idx++;
                    });
                    return check;
                });
                if (varianteCorrespondente) tr.querySelector('.preco-variante-input').value = varianteCorrespondente.preco;
            });
        }
        toggleTipoPreco();
    } catch (e) {
        console.error("Erro ao decodificar produto para edição:", e);
    }
}