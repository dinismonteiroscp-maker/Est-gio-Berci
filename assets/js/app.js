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
        const menu = document.getElementById("menu-categorias"); 
        if (!menu) return;

        menu.innerHTML = ""; 

        estrutura.forEach(cat => {
            const divItem = document.createElement("div");
            divItem.className = "accordion-item";
            
            // Construção das subcategorias
            let subsHtml = "";
            if (cat.subcategorias && Array.isArray(cat.subcategorias)) {
                cat.subcategorias.forEach(sub => {
                    subsHtml += `
                        <div class="subcat-container">
                            <button class="subcat-btn" onclick="carregarProdutosCliente(${sub.id}, event)">${sub.nome}</button>
                        </div>
                    `;
                });
            }

            // Estrutura do acordeão
            divItem.innerHTML = `
                <div class="header-container">
                    <button class="accordion-header">
                        ${cat.nome}
                    </button>
                </div>
                <div class="accordion-content">
                    ${subsHtml}
                </div>
            `;

            // EVENTO DUPLO: Clique na Categoria Mãe
            const btnHeader = divItem.querySelector(".accordion-header");
            btnHeader.addEventListener("click", () => {
                // 1. Comportamento Visual: Fecha os outros acordeões e abre/fecha o atual
                document.querySelectorAll(".accordion-item").forEach(item => {
                    if (item !== divItem) item.classList.remove("open");
                });
                divItem.classList.toggle("open");

                // 2. Comportamento de Dados: Carrega TODOS os produtos que pertencem a esta categoria mãe
                carregarProdutosCategoriaMae(cat);
            });

            menu.appendChild(divItem);
        });
    } catch (error) {
        console.error("Erro ao carregar o menu do cliente:", error);
    }
}

// =========================================================================
// 2. CARREGAR PRODUTOS DA API (CLIENTE)
// =========================================================================

// Ação ao clicar na Categoria Mãe: Junta todos os produtos das suas subcategorias
function carregarProdutosCategoriaMae(categoria) {
    const grid = document.getElementById("grelha-produtos");
    if (!grid) return;

    if (!categoria.subcategorias || categoria.subcategorias.length === 0) {
        grid.innerHTML = "<p class='mensagem-inicial'>Esta categoria não tem subcategorias ou produtos disponíveis.</p>";
        return;
    }

    grid.innerHTML = "<p class='mensagem-inicial'>A carregar produtos da categoria...</p>";

    // Faz pedidos em paralelo para todas as subcategorias pertencentes a esta categoria mãe
    const promessas = categoria.subcategorias.map(sub => 
        fetch(`api/api.php?acao=produtos&subcategoria_id=${sub.id}`)
            .then(res => res.ok ? res.json() : [])
            .catch(() => [])
    );

    Promise.all(promessas).then(resultados => {
        // Junta todos os arrays de produtos num único array plano
        let todosOsProdutos = resultados.flat();
        renderizarProdutosNaGrelha(todosOsProdutos);
    }).catch(err => {
        console.error("Erro ao agregar produtos da categoria mãe:", err);
        grid.innerHTML = "<p class='mensagem-inicial'>Erro ao carregar os produtos desta categoria.</p>";
    });
}

// Ação ao clicar na Subcategoria específica
async function carregarProdutosCliente(subcatId, event) {
    // Evita que o clique na subcategoria dispare o evento do elemento pai (categoria mãe)
    if (event) event.stopPropagation();

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
        grid.innerHTML = "<p class='mensagem-inicial'>Nenhum produto disponível de momento para esta seleção.</p>";
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
                            <select class="select-opcao-publica" data-fator="${fator}" onchange="recalcularPrecoPublico(${prod.id})" style="width:100%; padding:6px; border-radius:4px; border:1px solid #cbd5e1; background:#fff;">
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

        // Formatação do preço fixo inicial com vírgula padrão PT-PT
        let precoFixoFormatado = prod.tipo_preco === 'fixo' 
            ? parseFloat(prod.preco_fixo).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' 
            : 'A calcular...';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${prod.nome}">
            <h3>${prod.nome}</h3>
            ${seccaoOpcoes}
            <div class="preco-tag" id="preco-prod-${prod.id}">
                ${precoFixoFormatado}
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

    // Formatação do preço dinâmico calculado com vírgula padrão PT-PT
    if (varianteCorrespondente) {
        let precoVariavelFormatado = parseFloat(varianteCorrespondente.preco).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        precoTag.innerText = precoVariavelFormatado + " €";
    } else {
        precoTag.innerText = "Sob Consulta";
    }
}