<?php
require_once '../config/conexao.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$acao = $_GET['acao'] ?? '';

// --- MÉTODOS GET ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if ($acao === 'listar_estrutura') {
        try {
            $stmtCat = $pdo->query("SELECT * FROM categorias ORDER BY nome ASC");
            $categorias = $stmtCat->fetchAll();
            
            foreach ($categorias as &$cat) {
                $stmtSub = $pdo->prepare("SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY nome ASC");
                $stmtSub->execute([$cat['id']]);
                $cat['subcategorias'] = $stmtSub->fetchAll();
            }
            echo json_encode($categorias);
        } catch (Exception $e) {
            echo json_encode(['status' => 'erro', 'msg' => $e->getMessage()]);
        }
        exit;
    }

    if ($acao === 'produtos') {
        $subcategoria_id = $_GET['subcategoria_id'] ?? 0;
        try {
            $stmtProd = $pdo->prepare("SELECT * FROM produtos WHERE subcategoria_id = ? ORDER BY nome ASC");
            $stmtProd->execute([$subcategoria_id]);
            $produtos = $stmtProd->fetchAll();

            foreach ($produtos as &$prod) {
                if ($prod['tipo_preco'] === 'variavel') {
                    $stmtVar = $pdo->prepare("SELECT id, tamanho, tipo_impressao, quantidade, acabamento, preco FROM produto_variantes WHERE produto_id = ?");
                    $stmtVar->execute([$prod['id']]);
                    $prod['variantes'] = $stmtVar->fetchAll();
                }
            }
            echo json_encode($produtos);
        } catch (Exception $e) {
            echo json_encode(['status' => 'erro', 'msg' => $e->getMessage()]);
        }
        exit;
    }

    if ($acao === 'calcular_preco') {
        $produto_id = $_GET['produto_id'] ?? 0;
        $tamanho = $_GET['tamanho'] ?? null;
        $tipo_impressao = $_GET['tipo_impressao'] ?? null;
        $quantidade = $_GET['quantidade'] ?? null;
        $acabamento = $_GET['acabamento'] ?? null;

        try {
            $sql = "SELECT preco FROM produto_variantes WHERE produto_id = :prod_id";
            $params = [':prod_id' => $produto_id];

            $sql .= $tamanho ? " AND tamanho = :tamanho" : " AND tamanho IS NULL";
            if($tamanho) $params[':tamanho'] = $tamanho;

            $sql .= $tipo_impressao ? " AND tipo_impressao = :tipo" : " AND tipo_impressao IS NULL";
            if($tipo_impressao) $params[':tipo'] = $tipo_impressao;

            $sql .= $quantidade ? " AND quantidade = :qtd" : " AND quantidade IS NULL";
            if($quantidade) $params[':qtd'] = $quantidade;

            $sql .= $acabamento ? " AND acabamento = :acab" : " AND acabamento IS NULL";
            if($acabamento) $params[':acab'] = $acabamento;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $res = $stmt->fetch();

            if ($res) {
                echo json_encode(['status' => 'sucesso', 'preco' => $res['preco']]);
            } else {
                echo json_encode(['status' => 'indisponivel', 'msg' => 'Combinação indisponível']);
            }
        } catch (Exception $e) {
            echo json_encode(['status' => 'erro', 'msg' => $e->getMessage()]);
        }
        exit;
    }
}

// --- MÉTODOS POST (CRUD Dinâmico) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    if ($acao === 'guardar_categoria') {
        $id = $_POST['id'] ?? null;
        $nome = $_POST['nome'] ?? '';
        
        if (empty($nome)) { echo json_encode(['status'=>'erro','msg'=>'Nome obrigatório']); exit; }
        
        if ($id) {
            $stmt = $pdo->prepare("UPDATE categorias SET nome = ? WHERE id = ?");
            $stmt->execute([$nome, $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO categorias (nome) VALUES (?)");
            $stmt->execute([$nome]);
        }
        echo json_encode(['status' => 'sucesso']);
        exit;
    }

    if ($acao === 'eliminar_categoria') {
        $id = $_POST['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'sucesso']);
        exit;
    }

    if ($acao === 'guardar_subcategoria') {
        $id = $_POST['id'] ?? null;
        $categoria_id = $_POST['categoria_id'] ?? null;
        $nome = $_POST['nome'] ?? '';
        
        if ($id) {
            $stmt = $pdo->prepare("UPDATE subcategorias SET nome = ? WHERE id = ?");
            $stmt->execute([$nome, $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO subcategorias (categoria_id, nome) VALUES (?, ?)");
            $stmt->execute([$categoria_id, $nome]);
        }
        echo json_encode(['status' => 'sucesso']);
        exit;
    }

    if ($acao === 'eliminar_subcategoria') {
        $id = $_POST['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM subcategorias WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'sucesso']);
        exit;
    }

    if ($acao === 'guardar_produto') {
        $id = $_POST['id'] ?? null;
        $subcategoria_id = $_POST['subcategoria_id'] ?? null;
        $nome = $_POST['nome'] ?? '';
        $tipo_preco = $_POST['tipo_preco'] ?? 'fixo';
        $preco_fixo = $_POST['preco_fixo'] ?? null;
        
        // Upload de Imagem Simples
        $imagem_url = $_POST['imagem_url_atual'] ?? '';
        if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['imagem']['name'], PATHINFO_EXTENSION);
            $nome_foto = time() . '_' . uniqid() . '.' . $ext;
            $destino = '../uploads/' . $nome_foto;
            if (move_uploaded_file($_FILES['imagem']['tmp_name'], $destino)) {
                $imagem_url = 'uploads/' . $nome_foto;
            }
        }

        if ($tipo_preco === 'fixo') {
            $preco_fixo = !empty($preco_fixo) ? str_replace(',', '.', $preco_fixo) : 0;
        } else {
            $preco_fixo = null;
        }

        if ($id) {
            $stmt = $pdo->prepare("UPDATE produtos SET nome = ?, imagem_url = ?, tipo_preco = ?, preco_fixo = ? WHERE id = ?");
            $stmt->execute([$nome, $imagem_url, $tipo_preco, $preco_fixo, $id]);
            $produto_id = $id;
        } else {
            $stmt = $pdo->prepare("INSERT INTO produtos (subcategoria_id, nome, imagem_url, tipo_preco, preco_fixo) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$subcategoria_id, $nome, $imagem_url, $tipo_preco, $preco_fixo]);
            $produto_id = $pdo->lastInsertId();
        }

        // Se for variável, processa a matriz de variantes passadas em JSON
        if ($tipo_preco === 'variavel' && isset($_POST['variantes'])) {
            // Limpa variantes antigas primeiro
            $stmtDel = $pdo->prepare("DELETE FROM produto_variantes WHERE produto_id = ?");
            $stmtDel->execute([$produto_id]);

            $variantes = json_decode($_POST['variantes'], true);
            if (is_array($variantes)) {
                $stmtIns = $pdo->prepare("INSERT INTO produto_variantes (produto_id, tamanho, tipo_impressao, quantidade, acabamento, preco) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($variantes as $v) {
                    $tamanho = !empty($v['tamanho']) ? $v['tamanho'] : null;
                    $tipo_imp = !empty($v['tipo_impressao']) ? $v['tipo_impressao'] : null;
                    $qtd = !empty($v['quantidade']) ? $v['quantidade'] : null;
                    $acab = !empty($v['acabamento']) ? $v['acabamento'] : null;
                    $preco_var = str_replace(',', '.', $v['preco']);
                    
                    $stmtIns->execute([$produto_id, $tamanho, $tipo_imp, $qtd, $acab, $preco_var]);
                }
            }
        }

        echo json_encode(['status' => 'sucesso']);
        exit;
    }

    if ($acao === 'eliminar_produto') {
        $id = $_POST['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM produtos WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'sucesso']);
        exit;
    }
}