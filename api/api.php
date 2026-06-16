<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configuração da Base de Dados
$host = "localhost";
$db   = "grafica_db";
$user = "root";
$pass = "";
$charset = "utf8mb4";

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$opcoes = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $opcoes);
} catch (\PDOException $e) {
    echo json_encode(["erro" => "Falha na conexão: " . $e->getMessage()]);
    exit;
}

// Rotas da API
$acao = $_GET['acao'] ?? '';

switch ($acao) {
    
    // ==================== CATEGORIAS ====================
    case 'listar_estrutura':
        $stmt = $pdo->query("SELECT id, nome FROM categorias ORDER BY nome ASC");
        $categorias = $stmt->fetchAll();
        
        foreach ($categorias as &$cat) {
            $stmtSub = $pdo->prepare("SELECT id, nome FROM subcategorias WHERE categoria_id = ? ORDER BY nome ASC");
            $stmtSub->execute([$cat['id']]);
            $cat['subcategorias'] = $stmtSub->fetchAll();
        }
        echo json_encode($categorias);
        break;

    case 'guardar_categoria':
        $id = $_POST['id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            $stmt = $pdo->prepare("INSERT INTO categorias (nome) VALUES (?)");
            $stmt->execute([$nome]);
        } else {
            $stmt = $pdo->prepare("UPDATE categorias SET nome = ? WHERE id = ?");
            $stmt->execute([$nome, $id]);
        }
        echo json_encode(["sucesso" => true]);
        break;

    case 'eliminar_categoria':
        $id = $_POST['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["sucesso" => true]);
        break;

    // ==================== SUBCATEGORIAS ====================
    case 'guardar_subcategoria':
        $id = $_POST['id'] ?? '';
        $categoria_id = $_POST['categoria_id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            $stmt = $pdo->prepare("INSERT INTO subcategorias (categoria_id, nome) VALUES (?, ?)");
            $stmt->execute([$categoria_id, $nome]);
        } else {
            $stmt = $pdo->prepare("UPDATE subcategorias SET nome = ?, categoria_id = ? WHERE id = ?");
            $stmt->execute([$nome, $categoria_id, $id]);
        }
        echo json_encode(["sucesso" => true]);
        break;

    case 'eliminar_subcategoria':
        $id = $_POST['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM subcategorias WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["sucesso" => true]);
        break;

    // ==================== PRODUTOS ====================
    case 'produtos':
        $subcategoria_id = $_GET['subcategoria_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT id, nome, imagem_url, tipo_preco, preco_fixo FROM produtos WHERE subcategoria_id = ? ORDER BY nome ASC");
        $stmt->execute([$subcategoria_id]);
        $produtos = $stmt->fetchAll();

        foreach ($produtos as &$prod) {
            $stmtVar = $pdo->prepare("SELECT id, produto_id, preco, atributos_json FROM produto_variantes WHERE produto_id = ?");
            $stmtVar->execute([$prod['id']]);
            $variantes = $stmtVar->fetchAll();

            foreach ($variantes as &$v) {
                if (!empty($v['atributos_json'])) {
                    $atributos = json_decode($v['atributos_json'], true);
                    if (is_array($atributos)) {
                        unset($v['atributos_json']);
                        $v = array_merge($v, $atributos);
                    }
                }
                unset($v['created_at']);
            }
            $prod['variantes'] = $variantes;
        }
        echo json_encode($produtos);
        break;

    case 'guardar_produto':
        $id = $_POST['id'] ?? '';
        $subcategoria_id = $_POST['subcategoria_id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        $tipo_preco = $_POST['tipo_preco'] ?? 'fixo';
        $preco_fixo = !empty($_POST['preco_fixo']) ? $_POST['preco_fixo'] : null;
        $imagem_url = $_POST['imagem_url_atual'] ?? '';

        // Upload da imagem
        if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['imagem']['name'], PATHINFO_EXTENSION);
            $nomeFicheiro = uniqid('prod_', true) . '.' . $ext;
            
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            if (move_uploaded_file($_FILES['imagem']['tmp_name'], $uploadDir . $nomeFicheiro)) {
                $imagem_url = 'uploads/' . $nomeFicheiro;
            }
        }

        // Salvar produto
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            $stmt = $pdo->prepare("INSERT INTO produtos (subcategoria_id, nome, imagem_url, tipo_preco, preco_fixo) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$subcategoria_id, $nome, $imagem_url, $tipo_preco, $preco_fixo]);
            $id = $pdo->lastInsertId();
        } else {
            $stmt = $pdo->prepare("UPDATE produtos SET subcategoria_id = ?, nome = ?, imagem_url = ?, tipo_preco = ?, preco_fixo = ? WHERE id = ?");
            $stmt->execute([$subcategoria_id, $nome, $imagem_url, $tipo_preco, $preco_fixo, $id]);
        }

        // Remover variantes antigas
        $stmtDel = $pdo->prepare("DELETE FROM produto_variantes WHERE produto_id = ?");
        $stmtDel->execute([$id]);

        // Salvar novas variantes
        if ($tipo_preco === 'variavel' && !empty($_POST['variantes'])) {
            $variantes = json_decode($_POST['variantes'], true);
            
            if (is_array($variantes)) {
                foreach ($variantes as $variante) {
                    if (isset($variante['preco']) && isset($variante['atributos'])) {
                        $precoVar = floatval($variante['preco']);
                        $atributos_json = json_encode($variante['atributos'], JSON_UNESCAPED_UNICODE);
                        
                        $stmtInsVar = $pdo->prepare("INSERT INTO produto_variantes (produto_id, preco, atributos_json) VALUES (?, ?, ?)");
                        $stmtInsVar->execute([$id, $precoVar, $atributos_json]);
                    }
                }
            }
        }

        echo json_encode(["sucesso" => true, "produto_id" => $id]);
        break;

    case 'eliminar_produto':
        $id = $_POST['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM produtos WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["sucesso" => true]);
        break;

    // ==================== FATORES DINÂMICOS ====================
    case 'listar_fatores':
        $subcategoria_id = isset($_GET['subcategoria_id']) ? intval($_GET['subcategoria_id']) : 0;
        $produto_id = isset($_GET['produto_id']) ? intval($_GET['produto_id']) : 0;
        
        $fatores = [];
        $fatoresIds = [];
        
        // Buscar fatores globais
        $stmt = $pdo->query("SELECT * FROM fatores WHERE escopo = 'global' AND ativo = 1 ORDER BY ordem ASC");
        $globais = $stmt->fetchAll();
        foreach ($globais as $f) {
            $f['opcoes'] = json_decode($f['opcoes'], true);
            if (!in_array($f['id'], $fatoresIds)) {
                $fatores[] = $f;
                $fatoresIds[] = $f['id'];
            }
        }
        
        // Buscar fatores da categoria
        if ($subcategoria_id > 0) {
            $stmt = $pdo->prepare("
                SELECT f.* FROM fatores f
                JOIN subcategorias s ON s.categoria_id = f.entidade_id
                WHERE f.escopo = 'categoria' AND s.id = ? AND f.ativo = 1
                ORDER BY f.ordem ASC
            ");
            $stmt->execute([$subcategoria_id]);
            $categoriaFatores = $stmt->fetchAll();
            foreach ($categoriaFatores as $f) {
                $f['opcoes'] = json_decode($f['opcoes'], true);
                if (!in_array($f['id'], $fatoresIds)) {
                    $fatores[] = $f;
                    $fatoresIds[] = $f['id'];
                }
            }
        }
        
        // Buscar fatores da subcategoria
        if ($subcategoria_id > 0) {
            $stmt = $pdo->prepare("
                SELECT * FROM fatores 
                WHERE escopo = 'subcategoria' AND entidade_id = ? AND f.ativo = 1
                ORDER BY ordem ASC
            ");
            $stmt->execute([$subcategoria_id]);
            $subFatores = $stmt->fetchAll();
            foreach ($subFatores as $f) {
                $f['opcoes'] = json_decode($f['opcoes'], true);
                if (!in_array($f['id'], $fatoresIds)) {
                    $fatores[] = $f;
                    $fatoresIds[] = $f['id'];
                }
            }
        }
        
        // Buscar fatores do produto
        if ($produto_id > 0) {
            $stmt = $pdo->prepare("
                SELECT * FROM fatores 
                WHERE escopo = 'produto' AND entidade_id = ? AND f.ativo = 1
                ORDER BY ordem ASC
            ");
            $stmt->execute([$produto_id]);
            $prodFatores = $stmt->fetchAll();
            foreach ($prodFatores as $f) {
                $f['opcoes'] = json_decode($f['opcoes'], true);
                if (!in_array($f['id'], $fatoresIds)) {
                    $fatores[] = $f;
                    $fatoresIds[] = $f['id'];
                }
            }
        }
        
        // Buscar fatores pendentes
        $stmt = $pdo->prepare("
            SELECT * FROM fatores 
            WHERE escopo = 'produto_pendente' AND ativo = 1
            ORDER BY id ASC
        ");
        $stmt->execute();
        $pendentes = $stmt->fetchAll();
        foreach ($pendentes as $p) {
            $p['opcoes'] = json_decode($p['opcoes'], true);
            if (!in_array($p['id'], $fatoresIds)) {
                $fatores[] = $p;
                $fatoresIds[] = $p['id'];
            }
        }
        
        echo json_encode($fatores);
        break;

    case 'listar_todos_fatores':
        $stmt = $pdo->query("
            SELECT f.*, 
                   CASE 
                       WHEN f.escopo = 'categoria' THEN c.nome
                       WHEN f.escopo = 'subcategoria' THEN s.nome
                       WHEN f.escopo = 'produto' THEN p.nome
                       WHEN f.escopo = 'produto_pendente' THEN 'Aguardando produto'
                       ELSE NULL
                   END as entidade_nome
            FROM fatores f
            LEFT JOIN categorias c ON f.escopo = 'categoria' AND f.entidade_id = c.id
            LEFT JOIN subcategorias s ON f.escopo = 'subcategoria' AND f.entidade_id = s.id
            LEFT JOIN produtos p ON f.escopo = 'produto' AND f.entidade_id = p.id
            ORDER BY FIELD(f.escopo, 'global', 'categoria', 'subcategoria', 'produto', 'produto_pendente'), f.ordem
        ");
        $fatores = $stmt->fetchAll();
        foreach ($fatores as &$f) {
            $f['opcoes'] = json_decode($f['opcoes'], true);
        }
        echo json_encode($fatores);
        break;

    case 'guardar_fator':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $id = $data['id'] ?? null;
        $nome = $data['nome'] ?? '';
        $tipo = $data['tipo'] ?? 'select';
        $escopo = $data['escopo'] ?? 'global';
        $entidade_id = !empty($data['entidade_id']) ? $data['entidade_id'] : null;
        $opcoes = json_encode($data['opcoes'] ?? []);
        $obrigatorio = isset($data['obrigatorio']) ? ($data['obrigatorio'] ? 1 : 0) : 0;
        $ordem = $data['ordem'] ?? 0;
        
        if ($id && $id !== 'null') {
            $stmt = $pdo->prepare("
                UPDATE fatores SET 
                    nome = ?, tipo = ?, escopo = ?, 
                    entidade_id = ?, opcoes = ?, 
                    obrigatorio = ?, ordem = ?
                WHERE id = ?
            ");
            $stmt->execute([$nome, $tipo, $escopo, $entidade_id, $opcoes, $obrigatorio, $ordem, $id]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO fatores (nome, tipo, escopo, entidade_id, opcoes, obrigatorio, ordem) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nome, $tipo, $escopo, $entidade_id, $opcoes, $obrigatorio, $ordem]);
            $id = $pdo->lastInsertId();
        }
        
        echo json_encode(["sucesso" => true, "id" => $id]);
        break;

    case 'eliminar_fator':
        $id = $_POST['id'] ?? 0;
        $stmt = $pdo->prepare("DELETE FROM fatores WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["sucesso" => true]);
        break;

    case 'converter_fatores_pendentes':
        $data = json_decode(file_get_contents('php://input'), true);
        $produto_id = $data['produto_id'] ?? 0;
        
        if ($produto_id > 0) {
            $stmt = $pdo->prepare("
                UPDATE fatores 
                SET escopo = 'produto', entidade_id = ? 
                WHERE escopo = 'produto_pendente' AND entidade_id IS NULL
            ");
            $stmt->execute([$produto_id]);
            
            $count = $stmt->rowCount();
            echo json_encode(["sucesso" => true, "convertidos" => $count]);
        } else {
            echo json_encode(["erro" => "ID do produto inválido"]);
        }
        break;

    // ==================== ESTRUTURA COMPLETA PARA ATUALIZAR PRECOS ====================
    case 'listar_estrutura_completa':
        $stmt = $pdo->query("SELECT id, nome FROM categorias ORDER BY nome ASC");
        $categorias = $stmt->fetchAll();
        
        foreach ($categorias as &$cat) {
            $stmtSub = $pdo->prepare("SELECT id, nome FROM subcategorias WHERE categoria_id = ? ORDER BY nome ASC");
            $stmtSub->execute([$cat['id']]);
            $subcategorias = $stmtSub->fetchAll();
            
            foreach ($subcategorias as &$sub) {
                $stmtProd = $pdo->prepare("SELECT id, nome, tipo_preco, preco_fixo FROM produtos WHERE subcategoria_id = ? ORDER BY nome ASC");
                $stmtProd->execute([$sub['id']]);
                $sub['produtos'] = $stmtProd->fetchAll();
            }
            $cat['subcategorias'] = $subcategorias;
        }
        
        echo json_encode($categorias);
        break;

    // ==================== ATUALIZAR PRECOS ====================
    case 'atualizar_precos':
        $data = json_decode(file_get_contents('php://input'), true);
        $percentagem = floatval($data['percentagem'] ?? 0);
        $categorias = $data['categorias'] ?? [];
        $subcategorias = $data['subcategorias'] ?? [];
        $produtos = $data['produtos'] ?? [];
        
        $produtosAfetados = 0;
        $variantesAfetadas = 0;
        $fator = 1 + ($percentagem / 100);
        
        try {
            $pdo->beginTransaction();
            
            if (!empty($categorias)) {
                $placeholders = implode(',', array_fill(0, count($categorias), '?'));
                $stmt = $pdo->prepare("
                    SELECT p.id FROM produtos p
                    JOIN subcategorias s ON p.subcategoria_id = s.id
                    WHERE s.categoria_id IN ($placeholders)
                ");
                $stmt->execute($categorias);
                $produtosCategoria = $stmt->fetchAll(PDO::FETCH_COLUMN);
                $produtos = array_merge($produtos, $produtosCategoria);
            }
            
            if (!empty($subcategorias)) {
                $placeholders = implode(',', array_fill(0, count($subcategorias), '?'));
                $stmt = $pdo->prepare("
                    SELECT id FROM produtos WHERE subcategoria_id IN ($placeholders)
                ");
                $stmt->execute($subcategorias);
                $produtosSubcategoria = $stmt->fetchAll(PDO::FETCH_COLUMN);
                $produtos = array_merge($produtos, $produtosSubcategoria);
            }
            
            $produtos = array_unique($produtos);
            
            if (!empty($produtos)) {
                $placeholders = implode(',', array_fill(0, count($produtos), '?'));
                
                // Atualizar preços fixos
                $stmt = $pdo->prepare("
                    UPDATE produtos 
                    SET preco_fixo = preco_fixo * ?
                    WHERE id IN ($placeholders) AND tipo_preco = 'fixo'
                ");
                $params = array_merge([$fator], $produtos);
                $stmt->execute($params);
                $produtosAfetados = $stmt->rowCount();
                
                // Atualizar variantes
                $stmt = $pdo->prepare("
                    UPDATE produto_variantes v
                    SET v.preco = v.preco * ?
                    WHERE v.produto_id IN ($placeholders)
                ");
                $params2 = array_merge([$fator], $produtos);
                $stmt->execute($params2);
                $variantesAfetadas = $stmt->rowCount();
            }
            
            $pdo->commit();
            
            echo json_encode([
                "sucesso" => true,
                "produtos_afetados" => $produtosAfetados,
                "variantes_afetadas" => $variantesAfetadas,
                "percentagem_aplicada" => $percentagem
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["erro" => $e->getMessage()]);
        }
        break;

    // ==================== ROTAS AUXILIARES ====================
    case 'listar_categorias_simples':
        $stmt = $pdo->query("SELECT id, nome FROM categorias ORDER BY nome");
        echo json_encode($stmt->fetchAll());
        break;

    case 'listar_subcategorias_simples':
        $stmt = $pdo->query("
            SELECT s.id, s.nome, c.nome as categoria_nome 
            FROM subcategorias s
            JOIN categorias c ON s.categoria_id = c.id
            ORDER BY c.nome, s.nome
        ");
        echo json_encode($stmt->fetchAll());
        break;

    case 'listar_produtos_simples':
        $stmt = $pdo->query("
            SELECT p.id, p.nome, s.nome as subcategoria_nome, c.nome as categoria_nome
            FROM produtos p
            JOIN subcategorias s ON p.subcategoria_id = s.id
            JOIN categorias c ON s.categoria_id = c.id
            ORDER BY c.nome, s.nome, p.nome
        ");
        echo json_encode($stmt->fetchAll());
        break;

    default:
        echo json_encode(["erro" => "Ação não encontrada"]);
        break;
}
?>