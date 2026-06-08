CREATE DATABASE IF NOT EXISTS grafica_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE grafica_db;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE subcategorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subcategoria_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    imagem_url VARCHAR(255) DEFAULT NULL,
    tipo_preco ENUM('fixo', 'variavel') DEFAULT 'fixo',
    preco_fixo DECIMAL(10, 2) DEFAULT NULL,
    FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE produto_variantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    tamanho VARCHAR(50) DEFAULT NULL,
    tipo_impressao VARCHAR(50) DEFAULT NULL,
    quantidade VARCHAR(50) DEFAULT NULL,
    acabamento VARCHAR(50) DEFAULT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    UNIQUE KEY uq_variante (produto_id, tamanho, tipo_impressao, quantidade, acabamento)
) ENGINE=InnoDB;