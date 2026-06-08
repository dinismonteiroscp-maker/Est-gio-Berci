<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'grafica_db');
define('DB_USER', 'root');
define('DB_PASS', ''); // Altera se tiveres password no teu ambiente

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Falha na ligação à base de dados: ' . $e->getMessage()]);
    exit;
}