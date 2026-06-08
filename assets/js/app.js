document.addEventListener("DOMContentLoaded", () => {
    carregarEstrutura();
});

async function carregarEstrutura() {
    const res = await fetch('api/api.php?acao=listar_estrutura');
    const categorias = await res.json();
    
    const menu = document.getElementById("menu-categorias");
    menu.innerHTML = "";

    categorias.forEach(cat => {
        const item = document.createElement("div");
        item.className = "accordion-item";
        
        let subHtml = "";
        cat.subcategorias.forEach(sub => {
            subHtml += `<button class="subcat-btn" onclick="carregarProdutos(${sub.id}, this)">${sub.nome}</button>`;
        });

        item.innerHTML = `
            <button class="accordion-header" onclick="toggleAccordion(this)">
                ${cat.nome} <span>↓</span>
            </button>
            <div class="accordion-content">
                ${subHtml || '<p style="padding:0.5rem 1rem; font-size:0.8rem; color:#ccc;">Vazio</p>'}
            </div>
        `;
        menu.appendChild(item);
    });
}

function toggleAccordion(btn) {
    const content = btn.nextElementSibling;
    content.classList.toggle("open");
}

async function carregarProdutos(subcatId, btn) {
    document.querySelectorAll(".subcat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
    const produtos = await res.json();
    
    const grid = document.getElementById("grid-produtos");
    grid.innerHTML = "";

    if(produtos.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted);">Nenhum produto nesta categoria.</p>`;
        return;
    }

    produtos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "card-produto";
        
        let imgTag = prod.imagem_url ? `<img src="${prod.imagem_url}" alt="${prod.nome}">` : `<img src="https://via.placeholder.com/260x180?text=Sem+Imagem" alt="Placeholder">`;
        
        let dynamicControls = "";
        let precoInicial = "";

        if (prod.tipo_preco === 'fixo') {
            precoInicial = `${prod.preco_fixo} €`;
        } else {
            precoInicial = "Selecione as opções...";
            
            // Mapear e extrair fatores únicos existentes nas variantes
            const fatores = { tamanho: new Set(), tipo_impressao: new Set(), quantidade: new Set(), acabamento: new Set() };
            prod.variantes.forEach(v => {
                if(v.tamanho) fatores.tamanho.add(v.tamanho);
                if(v.tipo_impressao) fatores.tipo_impressao.add(v.tipo_impressao);
                if(v.quantidade) fatores.quantidade.add(v.quantidade);
                if(v.acabamento) fatores.acabamento.add(v.acabamento);
            });

            // Criar os selects dinamicamente apenas para fatores ativos
            Object.keys(fatores).forEach(fator => {
                if (fatores[fator].size > 0) {
                    let labelFormatado = fator.replace('_', ' ');
                    dynamicControls += `<div class="select-grupo">
                        <label>${labelFormatado}</label>
                        <select class="fator-select" data-fator="${fator}" data-prod="${prod.id}" onchange="atualizarPrecoDinamico(${prod.id})">
                            <option value="">Escolha...</option>`;
                    fatores[fator].forEach(val => {
                        dynamicControls += `<option value="${val}">${val}</option>`;
                    });
                    dynamicControls += `</select></div>`;
                }
            });
        }

        card.innerHTML = `
            ${imgTag}
            <h3>${prod.nome}</h3>
            <div class="configurador">${dynamicControls}</div>
            <div class="preco-tag" id="preco-p-${prod.id}">${precoInicial}</div>
        `;
        grid.appendChild(card);
    });
}

async function atualizarPrecoDinamico(prodId) {
    const selects = document.querySelectorAll(`.fator-select[data-prod="${prodId}"]`);
    let query = `api/api.php?acao=calcular_preco&produto_id=${prodId}`;
    
    let completo = true;
    selects.forEach(sel => {
        if (!sel.value) completo = false;
        query += `&${sel.dataset.fator}=${encodeURIComponent(sel.value)}`;
    });

    const precoTag = document.getElementById(`preco-p-${prodId}`);
    if (!completo) {
        precoTag.innerText = "Selecione as opções...";
        return;
    }

    const res = await fetch(query);
    const dados = await res.json();

    if (dados.status === 'sucesso') {
        precoTag.innerText = `${dados.preco} €`;
    } else {
        precoTag.innerText = "Indisponível";
    }
}