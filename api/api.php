<?php
header('Content-Type: application/json; charset=utf-8');

// 1. CONEXÃO À BASE DE DADOS
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

// 2. ROTAS DA API
$acao = $_GET['acao'] ?? '';

switch ($acao) {
    
    case 'listar_estrutura':
        $stmt = $pdo->query("SELECT * FROM categorias ORDER BY nome ASC");
        $categorias = $stmt->fetchAll();
        
        foreach ($categorias as &$cat) {
            $stmtSub = $pdo->prepare("SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY nome ASC");
            $stmtSub->execute([$cat['id']]);
            $cat['subcategorias'] = $stmtSub->fetchAll();
        }
        echo json_encode($categorias);
        break;

    case 'produtos':
        $subcategoria_id = $_GET['subcategoria_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT * FROM produtos WHERE subcategoria_id = ? ORDER BY nome ASC");
        $stmt->execute([$subcategoria_id]);
        $produtos = $stmt->fetchAll();

        foreach ($produtos as &$prod) {
            $stmtVar = $pdo->prepare("SELECT * FROM produto_variantes WHERE produto_id = ?");
            $stmtVar->execute([$prod['id']]);
            $variantes = $stmtVar->fetchAll();

            foreach ($variantes as &$v) {
                if (!empty($v['atributos_json'])) {
                    $atributos = json_decode($v['atributos_json'], true);
                    if (is_array($atributos)) {
                        foreach ($atributos as $chave => $valor) {
                            $v[$chave] = $valor;
                        }
                    }
                }
            }
            $prod['variantes'] = $variantes;
        }
        echo json_encode($produtos);
        break;

    case 'guardar_categoria':
        $id = $_POST['id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            // Nova Categoria
            $stmt = $pdo->prepare("INSERT INTO categorias (nome) VALUES (?)");
            $stmt->execute([$nome]);
        } else {
            // Editar Categoria Existente
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

    case 'guardar_subcategoria':
        $id = $_POST['id'] ?? '';
        $categoria_id = $_POST['categoria_id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            // Nova Subcategoria
            $stmt = $pdo->prepare("INSERT INTO subcategorias (categoria_id, nome) VALUES (?, ?)");
            $stmt->execute([$categoria_id, $nome]);
        } else {
            // Editar Subcategoria Existente
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

    case 'guardar_produto':
        $id = $_POST['id'] ?? '';
        $subcategoria_id = $_POST['subcategoria_id'] ?? '';
        $nome = $_POST['nome'] ?? '';
        $tipo_preco = $_POST['tipo_preco'] ?? 'fixo';
        $preco_fixo = !empty($_POST['preco_fixo']) ? $_POST['preco_fixo'] : null;
        $imagem_url = $_POST['imagem_url_atual'] ?? '';

        // Tratamento do Upload da Imagem
        if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['imagem']['name'], PATHINFO_EXTENSION);
            $nomeFicheiro = uniqid('prod_', true) . '.' . $ext;
            
            if (!is_dir('../uploads')) {
                mkdir('../uploads', 0777, true);
            }
            
            if (move_uploaded_file($_FILES['imagem']['tmp_name'], '../uploads/' . $nomeFicheiro)) {
                $imagem_url = 'uploads/' . $nomeFicheiro;
            }
        }

        // Salvar dados do Produto Principal
        if (empty($id) || $id === 'null' || $id === 'undefined') {
            $stmt = $pdo->prepare("INSERT INTO produtos (subcategoria_id, nome, imagem_url, tipo_preco, preco_fixo) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$subcategoria_id, $nome, $imagem_url, $tipo_preco, $preco_fixo]);
            $id = $pdo->lastInsertId();
        } else {
            $stmt = $pdo->prepare("UPDATE produtos SET subcategoria_id = ?, nome = ?, imagem_url = ?, tipo_preco = ?, preco_fixo = ? WHERE id = ?");
            $stmt->execute([$subcategoria_id, $nome, $imagem_url, $tipo_preco, $preco_fixo, $id]);
        }

        // CORRIGIDO: Elimina as variantes antigas de forma segura usando o $id correto
        $stmtDel = $pdo->prepare("DELETE FROM produto_variantes WHERE produto_id = ?");
        $stmtDel->execute([$id]);

        // Se o preço for variável, grava a nova matriz combinatória
        if ($tipo_preco === 'variavel' && !empty($_POST['variantes'])) {
            $variantes = json_decode($_POST['variantes'], true);
            
            if (is_array($variantes)) {
                foreach ($variantes as $v) {
                    $precoVar = $v['preco'] ?? 0;
                    
                    // CORRIGIDO: Variável unificada sem espaços
                    $atributos_originais = $v; 
                    unset($atributos_originais['preco']);
                    
                    $atributos_json = json_encode($atributos_originais, JSON_UNESCAPED_UNICODE);

                    $stmtInsVar = $pdo->prepare("INSERT INTO produto_variantes (produto_id, preco, atributos_json) VALUES (?, ?, ?)");
                    $stmtInsVar->execute([$id, $precoVar, $atributos_json]);
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

    default:
        echo json_encode(["erro" => "Ação não encontrada"]);
        break;
}