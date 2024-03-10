import express from 'express'
import knex from 'knex'
import { resolve } from 'path'
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import 'dotenv/config'


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

const pg = knex({
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
        const dataTransacao = new Date(Date.now());
        // const novoSaldo = tipo == 'd' ? cliente.saldo - valor : cliente.saldo + valor;
        // if(tipo == 'd' && novoSaldo < -cliente.limite) return res.status(422).send();
        
        const update = await pg.raw(`update clientes set saldo = saldo + ${tipo == 'c' ? valor : -valor} where id = ${id} ${tipo == 'd' ? `and saldo - ${valor} >= - limite` : ''} returning saldo, limite`);
        if(update.rows.length == 0){
            const cliente = await pg('clientes').where('id', id).first();
            if(!cliente) return res.status(404).send();
            return res.status(422).send();
        } 
        const transacao = {
            valor,
            tipo,
            descricao,
            realizada_em: dataTransacao
        }
        await pg<Transacao>('transacoes').insert({...transacao, id_cliente: Number(id)});
        return res.status(200).send({limite: update.rows[0].limite, saldo: update.rows[0].saldo});
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

app.listen(process.env.API_PORT, () => {
    console.log('listening on port ', process.env.API_PORT)
})