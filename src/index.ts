import express from 'express'
import knex from 'knex'
import { resolve } from 'path'
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { createClient } from 'redis';

interface Cliente{
    id: number
    nome: string
    limite: number
    saldo: number
}

interface Transacao {
    id?: number,
    id_cliente: number,
    tipo: string,
    descricao: string,
    valor: number,
    realizada_em: Date
}

function log(...args: any[]): void {
    console.log(args);
    appendFileSync(path, `${args.join(',')}\n`);

}

const fileName = `logs.log`;

const WORKDIR = resolve(process.cwd(), "workdir");
if (!existsSync(WORKDIR)) mkdirSync(WORKDIR);

const LOGS_DIR = resolve(WORKDIR, "logs");
if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR);

const path = resolve(LOGS_DIR, fileName);


const client = createClient();

client.on('error', err => console.log('Redis Client Error', err));

client.connect()

const pg = knex({
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5433,
      user: 'root',
      database: 'project_d',
      password: '123456',
      pool: {
        min: 10,
        max: 30
      }
    }
  });
  

const app = express();

app.use(express.json())

app.get('/api', (req, res) => {
    console.log('olá');
    pg.raw(`SELECT * FROM CLIENTES WHERE id = ${1} FOR UPDATE`).then(resp => console.log(resp.rows));
    return res.status(200).send();
})

app.post('/clientes/:id/transacoes', async (req, res) => {
    try{
        const {valor, tipo, descricao} = req.body;
        const id = req.params.id;
        if(!valor || !tipo || !descricao || !id) return res.status(422).send()
        if(!['c', 'd'].includes(tipo)) return res.status(422).send();
        if(valor < 0 || !Number.isInteger(valor)) return res.status(422).send();
        if(descricao.length > 10) return res.status(422).send();
        // log(valor, tipo, descricao, id);
        // const obj = JSON.parse(await client.get(String(id)) ?? '{}');
        const dataTransacao = new Date(Date.now());
        // if(Object.keys(obj).length !== 0){
        //     const novoSaldo = tipo == 'd' ? obj.saldo.total - valor : obj.saldo.total + valor;
        //     if(tipo == 'd' && novoSaldo < -obj.saldo.limite) return res.status(422).send();
        //     const transacao = {
        //         valor,
        //         tipo,
        //         descricao,
        //         realizada_em: dataTransacao
        //     }

        //     obj.saldo.total = novoSaldo;
        //     obj.ultimas_transacoes = [transacao, ...obj.ultimas_transacoes].slice(0, 10);
        //     client.set(String(id), JSON.stringify(obj));
        //     log('Resultado transacao: ', obj.saldo.total)
        //     await pg.raw(`update clientes set saldo = saldo + ${tipo == 'c' ? valor : -valor} where id = ${id}`);
        //     pg<Transacao>('transacoes').insert({...transacao, id_cliente: Number(id)}).then(() => {}).catch(() => {});
        //     return res.status(200).send({limite: obj.saldo.limite, saldo: novoSaldo});
        // }else{
            // log('AQ: ', descricao)
            // const cliente = await pg<Cliente>('clientes').where('id', id).first().forUpdate();
            const cliente = (await pg.raw(`SELECT * FROM CLIENTES WHERE id = ${id} FOR UPDATE`)).rows[0];
            if(!cliente) return res.status(404).send();
            const novoSaldo = tipo == 'd' ? cliente.saldo - valor : cliente.saldo + valor;
            if(tipo == 'd' && novoSaldo < -cliente.limite) return res.status(422).send();
            // const prevTrans = await pg<Transacao>('transacoes').where('id', id).orderBy('realizada_em').limit(9);
            
            // const redisInfo: any = {
                //     saldo: {
                    //         total: novoSaldo,
                    //         limite: cliente.limite
                    //     },
                    //     ultimas_transacoes: [
                        //         transacao,
                        //         ...prevTrans
                        //     ]
                        // }
                        // log('Resultado transacao: ', novoSaldo)
                        // await client.set(String(id), JSON.stringify(redisInfo));
            await pg.raw(`update clientes set saldo = saldo + ${tipo == 'c' ? valor : -valor} where id = ${id}`);
            const transacao = {
                valor,
                tipo,
                descricao,
                realizada_em: dataTransacao
            }
            pg<Transacao>('transacoes').insert({...transacao, id_cliente: cliente.id}).then(() => {}).catch(() => {});
            return res.status(200).send({limite: cliente.limite, saldo: novoSaldo});
        // }
    }catch(err){
        log('Erro', (err as Error).message)
        return res.status(500).send();
    }
})

app.get('/clientes/:id/extrato', async (req, res) => {
    try{
        const id = req.params.id;
        // log('Pegando extrato do id: ', id)
        // const obj = JSON.parse(await client.get(String(id)) ?? '{}');
        // if(Object.keys(obj).length !== 0){
        //     log('Resultado extrato: ', obj.saldo.total)
        //     return res.status(200).send(obj);
        // }else{
            const cliente = await pg<Cliente>('clientes').where('id', id).first();
            if(!cliente) return res.status(404).send();
            const prevTrans = await pg<Transacao>('transacoes').where('id', id).orderBy('realizada_em').limit(10);
            // log('Resultado extrato (sem redis): ', cliente.saldo)
            return res.status(200).send({
                saldo: {
                    total: cliente.saldo,
                    limite: cliente.limite
                },
                ultimas_transacoes: prevTrans
            })
        // }
    }catch(err) {
        log('Erro', (err as Error).message)
        return res.status(500).send();
    }
})

app.listen(9999, () => {
    console.log('listening on port 9999')
})