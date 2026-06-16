// ==================== LOJA PÚBLICA ====================
window.todasAsVariantes = {};

document.addEventListener("DOMContentLoaded", () => {
    carregarEstruturaCliente();
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
                            <button class="subcat-btn" onclick="carregarProdutosCliente(${sub.id}, event)">${escapeHtml(sub.nome)}</button>
                        </div>
                    `;
                });
            }

            divItem.innerHTML = `
                <button class="accordion-header" onclick="toggleAccordionCliente(this)">
                    ${escapeHtml(cat.nome)}
                </button>
                <div class="accordion-content" style="display:none; padding-left:1rem;">
                    ${subsHtml}
                </div>
            `;

            menu.appendChild(divItem);
        });
    } catch (error) {
        console.error("Erro ao carregar menu:", error);
    }
}

function toggleAccordionCliente(btn) {
    const content = btn.nextElementSibling;
    if (content.style.display === 'none') {
        content.style.display = 'block';
    } else {
        content.style.display = 'none';
    }
}

async function carregarProdutosCliente(subcatId, event) {
    if (event) event.stopPropagation();
    
    try {
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        const produtos = await res.json();
        renderizarProdutosNaGrelha(produtos);
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        const grid = document.getElementById("grelha-produtos");
        if (grid) grid.innerHTML = "<p class='mensagem-inicial'>Erro ao carregar produtos.</p>";
    }
}

function renderizarProdutosNaGrelha(produtos) {
    const grid = document.getElementById("grelha-produtos");
    if (!grid) return;
    grid.innerHTML = "";

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = "<p class='mensagem-inicial'>Nenhum produto disponível.</p>";
        return;
    }

    produtos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "card-produto";

        let imgUrl = prod.imagem_url ? prod.imagem_url : "https://via.placeholder.com/260x180?text=Sem+Imagem";
        
        let seccaoOpcoes = "";
        if (prod.tipo_preco === 'variavel' && prod.variantes && prod.variantes.length > 0) {
            seccaoOpcoes = `<div class="opcoes-container" data-prodid="${prod.id}">`;
            
            let atributosMapeados = {};
            
            prod.variantes.forEach(v => {
                let atributos = v.atributos_json ? JSON.parse(v.atributos_json) : v;
                Object.keys(atributos).forEach(chave => {
                    // Ignorar campos que não são fatores
                    if (chave !== 'id' && chave !== 'produto_id' && chave !== 'preco' && chave !== 'atributos_json' && chave !== 'created_at' && atributos[chave]) {
                        if (!atributosMapeados[chave]) atributosMapeados[chave] = [];
                        if (!atributosMapeados[chave].includes(atributos[chave])) {
                            atributosMapeados[chave].push(atributos[chave]);
                        }
                    }
                });
            });

            Object.keys(atributosMapeados).forEach(fator => {
                seccaoOpcoes += `
                    <div style="margin-bottom: 0.5rem;">
                        <label style="font-size:0.8rem; font-weight:600;">${escapeHtml(fator)}:</label>
                        <select class="select-opcao-publica" data-fator="${fator}" onchange="recalcularPrecoPublico(${prod.id})" style="width:100%; padding:6px; border-radius:4px; border:1px solid #cbd5e1;">
                            ${atributosMapeados[fator].map(op => `<option value="${escapeHtml(op)}">${escapeHtml(op)}</option>`).join('')}
                        </select>
                    </div>
                `;
            });
            seccaoOpcoes += `</div>`;
        }

        let precoInicial = prod.tipo_preco === 'fixo' 
            ? parseFloat(prod.preco_fixo).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + ' €' 
            : 'Selecione as opções';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(prod.nome)}" onerror="this.src='https://via.placeholder.com/260x180?text=Sem+Imagem'">
            <h3>${escapeHtml(prod.nome)}</h3>
            ${seccaoOpcoes}
            <div class="preco-tag" id="preco-prod-${prod.id}">
                ${precoInicial}
            </div>
        `;
        grid.appendChild(card);

        if (prod.tipo_preco === 'variavel' && prod.variantes && prod.variantes.length > 0) {
            const variantesNormalizadas = prod.variantes.map(v => {
                if (v.atributos_json) {
                    const atributos = JSON.parse(v.atributos_json);
                    return { ...atributos, preco: v.preco };
                }
                return v;
            });
            window.todasAsVariantes[prod.id] = variantesNormalizadas;
            recalcularPrecoPublico(prod.id);
        }
    });
}

function recalcularPrecoPublico(produtoId) {
    const variantes = window.todasAsVariantes[produtoId];
    const precoTag = document.getElementById(`preco-prod-${produtoId}`);
    if (!variantes || !precoTag) return;

    const container = document.querySelector(`.opcoes-container[data-prodid="${produtoId}"]`);
    if (!container) return;

    const selects = container.querySelectorAll('.select-opcao-publica');
    let selecaoAtual = {};

    selects.forEach(sel => {
        selecaoAtual[sel.dataset.fator] = sel.value;
    });

    let varianteCorrespondente = variantes.find(v => {
        let condicao = true;
        Object.keys(selecaoAtual).forEach(fator => {
            if (v[fator] !== selecaoAtual[fator]) {
                condicao = false;
            }
        });
        return condicao;
    });

    if (varianteCorrespondente && varianteCorrespondente.preco) {
        let precoVariavelFormatado = parseFloat(varianteCorrespondente.preco).toLocaleString('pt-PT', { minimumFractionDigits: 2 });
        precoTag.innerText = precoVariavelFormatado + " €";
    } else {
        precoTag.innerText = "Sob Consulta";
    }
}