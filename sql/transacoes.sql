CREATE TABLE transacoes (
    id SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES clientes(id),
    tipo VARCHAR(1),
    descricao VARCHAR(10),
    valor INT,
    realizada_em TIMESTAMP
);