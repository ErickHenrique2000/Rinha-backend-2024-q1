"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const knex_1 = __importDefault(require("knex"));
const path_1 = require("path");
const fs_1 = require("fs");
require("dotenv/config");
function log(...args) {
    console.log(args);
    (0, fs_1.appendFileSync)(path, `${args.join(',')}\n`);
}
const fileName = `logs.log`;
const WORKDIR = (0, path_1.resolve)(process.cwd(), "workdir");
if (!(0, fs_1.existsSync)(WORKDIR))
    (0, fs_1.mkdirSync)(WORKDIR);
const LOGS_DIR = (0, path_1.resolve)(WORKDIR, "logs");
if (!(0, fs_1.existsSync)(LOGS_DIR))
    (0, fs_1.mkdirSync)(LOGS_DIR);
const path = (0, path_1.resolve)(LOGS_DIR, fileName);
const pg = (0, knex_1.default)({
    client: 'pg',
    connection: {
        host: process.env.HOST,
        port: Number(process.env.PORT),
        user: process.env.USER,
        database: process.env.DATABASE,
        password: process.env.PASSWORD,
        pool: {
            min: 20,
            max: 50
        }
    }
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/api', (req, res) => {
    console.log('olá');
    pg.raw(`SELECT * FROM CLIENTES WHERE id = ${1} FOR UPDATE`).then(resp => console.log(resp.rows));
    return res.status(200).send();
});
app.post('/clientes/:id/transacoes', async (req, res) => {
    try {
        const { valor, tipo, descricao } = req.body;
        const id = req.params.id;
        if (!valor || !tipo || !descricao || !id)
            return res.status(422).send();
        if (!['c', 'd'].includes(tipo))
            return res.status(422).send();
        if (valor < 0 || !Number.isInteger(valor))
            return res.status(422).send();
        if (descricao.length > 10)
            return res.status(422).send();
        const dataTransacao = new Date(Date.now());
        const cliente = await pg('clientes').where('id', id).first();
        if (!cliente)
            return res.status(404).send();
        const novoSaldo = tipo == 'd' ? cliente.saldo - valor : cliente.saldo + valor;
        if (tipo == 'd' && novoSaldo < -cliente.limite)
            return res.status(422).send();
        const update = await pg.raw(`update clientes set saldo = saldo + ${tipo == 'c' ? valor : -valor} where id = ${id} ${tipo == 'd' ? `and saldo - ${valor} >= - limite` : ''} returning saldo`);
        if (update.rows.length == 0)
            return res.status(422).send();
        const transacao = {
            valor,
            tipo,
            descricao,
            realizada_em: dataTransacao
        };
        await pg('transacoes').insert(Object.assign(Object.assign({}, transacao), { id_cliente: cliente.id }));
        return res.status(200).send({ limite: cliente.limite, saldo: update.rows[0].saldo });
    }
    catch (err) {
        log('Erro', err.message);
        return res.status(500).send();
    }
});
app.get('/clientes/:id/extrato', async (req, res) => {
    try {
        const id = req.params.id;
        const cliente = await pg('clientes').where('id', id).first();
        if (!cliente)
            return res.status(404).send();
        const prevTrans = await pg('transacoes').where('id', id).orderBy('realizada_em').limit(10);
        return res.status(200).send({
            saldo: {
                total: cliente.saldo,
                limite: cliente.limite
            },
            ultimas_transacoes: prevTrans
        });
    }
    catch (err) {
        log('Erro', err.message);
        return res.status(500).send();
    }
});
app.listen(process.env.API_PORT, () => {
    console.log('listening on port ', process.env.API_PORT);
});
