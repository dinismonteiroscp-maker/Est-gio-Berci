// =========================================================================
// 1. INICIALIZAÇÃO DE ESTADOS E ACORDÃO DO CLIENTE
// =========================================================================
window.todasAsVariantes = {}; 

document.addEventListener("DOMContentLoaded", () => {
    carregarEstruturaCliente();
});

// Carrega o menu lateral esquerdo do cliente
async function carregarEstruturaCliente() {
    try {
        const res = await fetch('api/api.php?acao=listar_estrutura');
        if (!res.ok) throw new Error("Erro de rede ao ligar à API.");
        
        const estrutura = await res.json();
        // Correção do ID: index.html usa "menu-categorias"
        const menu = document.getElementById("menu-categorias"); 
        if (!menu) return;

        menu.innerHTML = ""; 

        estrutura.forEach(cat => {
            const div = document.createElement("div");
            div.className = "accordion-item";
            
            let subsHtml = "";
            if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
                cat.subcategorias.forEach(sub => {
                    subsHtml += `
                        <div class="subcat-container">
                            <button class="subcat-btn" onclick="carregarProdutosCliente(${sub.id})">${sub.nome}</button>
                        </div>
                    `;
                });
            }

            div.innerHTML = `
                <div style="padding: 6px 10px; margin-top:0.2rem;">
                    <button class="accordion-header" style="background:none; border:none; outline:none; font-weight:700; width:100%; text-align:left;">
                        ${cat.nome}
                    </button>
                </div>
                <div class="accordion-content open" style="padding-left:0.5rem; margin-top: 0.4rem;">
                    ${subsHtml}
                </div>
            `;
            menu.appendChild(div);
        });
    } catch (error) {
        console.error("Erro ao carregar o menu do cliente:", error);
    }
}

// =========================================================================
// 2. CARREGAR PRODUTOS DA API (CLIENTE)
// =========================================================================
async function carregarProdutosCliente(subcatId) {
    try {
        const res = await fetch(`api/api.php?acao=produtos&subcategoria_id=${subcatId}`);
        if (!res.ok) throw new Error("Erro ao puxar produtos.");
        
        const produtos = await res.json();
        renderizarProdutosNaGrelha(produtos);
    } catch (error) {
        console.error("Erro ao carregar os produtos do cliente:", error);
    }
}

// =========================================================================
// 3. INJETAR OS CARTÕES DE PRODUTOS NO HTML COM OS DROPDOWNS DINÂMICOS
// =========================================================================
function renderizarProdutosNaGrelha(produtos) {
    const grid = document.getElementById("grelha-produtos");
    if (!grid) return;
    grid.innerHTML = "";

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = "<p class='mensagem-inicial'>Nenhum produto disponível de momento.</p>";
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
                Object.keys(v).forEach(chave => {
                    if (chave !== 'id' && chave !== 'produto_id' && chave !== 'preco' && chave !== 'atributos_json' && v[chave]) {
                        if (!atributosMapeados[chave]) atributosMapeados[chave] = [];
                        if (!atributosMapeados[chave].includes(v[chave])) {
                            atributosMapeados[chave].push(v[chave]);
                        }
                    }
                });
            });

            if (Object.keys(atributosMapeados).length > 0) {
                Object.keys(atributosMapeados).forEach(fator => {
                    let labelFormatado = fator.replace(/_/g, ' ');
                    seccaoOpcoes += `
                        <div class="fator-grupo" style="margin-bottom: 0.5rem;">
                            <label style="font-size:0.8rem; font-weight:600; text-transform:capitalize; display:block; margin-bottom:2px;">${labelFormatado}:</label>
                            <select class="select-opcao-publica" data-fator="${fator}" onchange="recalcularPrecoPublico(${prod.id})" style="width:100%; padding:4px; border-radius:4px; border:1px solid #cbd5e1;">
                                ${atributosMapeados[fator].map(op => `<option value="${op}">${op}</option>`).join('')}
                            </select>
                        </div>
                    `;
                });
            }
            seccaoOpcoes += `</div>`;
        } else {
            seccaoOpcoes = `<div class="opcoes-container"></div>`;
        }

        card.innerHTML = `
            <img src="${imgUrl}" alt="${prod.nome}">
            <h3>${prod.nome}</h3>
            ${seccaoOpcoes}
            <div class="preco-tag" id="preco-prod-${prod.id}">
                ${prod.tipo_preco === 'fixo' ? parseFloat(prod.preco_fixo).toFixed(2) + ' €' : 'A calcular...'}
            </div>
        `;
        grid.appendChild(card);

        if (prod.tipo_preco === 'variavel' && prod.variantes && prod.variantes.length > 0) {
            window.todasAsVariantes[prod.id] = prod.variantes;
            recalcularPrecoPublico(prod.id);
        }
    });
}

// =========================================================================
// 4. CÁLCULO DE PREÇO COM COMBINAÇÃO DINÂMICA (MATRIZ)
// =========================================================================
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

    if (varianteCorrespondente) {
        precoTag.innerText = parseFloat(varianteCorrespondente.preco).toFixed(2) + " €";
    } else {
        precoTag.innerText = "Sob Consulta";
    }
}