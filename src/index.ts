import express from 'express'
import knex from 'knex'
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
    }
  });
  

const app = express();

app.use(express.json())

app.get('/api', (req, res) => {
    console.log('olá');
    pg('clientes').then(resp => console.log(resp));
    return res.status(200).send();
})

app.post('/clientes/:id/transacoes', async (req, res) => {
    try{
        const {valor, tipo, descricao} = req.body;
        const id = req.params.id;
        console.log(valor, tipo, descricao, id);
        const obj = JSON.parse(await client.get(String(id)) ?? '{}');
        const dataTransacao = new Date(Date.now());
        if(Object.keys(obj).length !== 0){
            const novoSaldo = tipo == 'd' ? obj.saldo.total - valor : obj.saldo.total + valor;
            if(tipo == 'd' && novoSaldo < -obj.saldo.limite) return res.status(422).send();
            const transacao = {
                valor,
                tipo,
                descricao,
                realizada_em: dataTransacao
            }

            obj.ultimas_transacoes = [transacao, ...obj.ultimas_transacoes].slice(0, 10);
            client.set(String(id), JSON.stringify(obj));
            pg<Cliente>('clientes').update('saldo', novoSaldo).where('id', id).then(() => {}).catch(() => {});
            pg<Transacao>('transacoes').insert({...transacao, id_cliente: Number(id)}).then(() => {}).catch(() => {});
            return res.status(200).send({limite: obj.saldo.limite, saldo: novoSaldo});
        }else{
            const cliente = await pg<Cliente>('clientes').where('id', id).first();
            if(!cliente) return res.status(404).send();
            const novoSaldo = tipo == 'd' ? cliente.saldo - valor : cliente.saldo + valor;
            if(tipo == 'd' && novoSaldo < -cliente.limite) return res.status(422).send();
            const transacao = {
                valor,
                tipo,
                descricao,
                realizada_em: dataTransacao
            }
            const prevTrans = await pg<Transacao>('transacoes').where('id', id).orderBy('realizada_em').limit(9);

            const redisInfo: any = {
                saldo: {
                    total: novoSaldo,
                    limite: cliente.limite
                },
                ultimas_transacoes: [
                    transacao,
                    ...prevTrans
                ]
            }
            await client.set(String(id), JSON.stringify(redisInfo));
            pg<Cliente>('clientes').update('saldo', novoSaldo).where('id', id).then(() => {}).catch(() => {});
            pg<Transacao>('transacoes').insert({...transacao, id_cliente: cliente.id}).then(() => {}).catch(() => {});
            return res.status(200).send({limite: cliente.limite, saldo: novoSaldo});
        }
    }catch(err){
        return res.status(500).send();
    }
})

app.get('/clientes/:id/extrato', async (req, res) => {
    try{
        const id = req.params.id;
        console.log('Pegando extrato do id: ', id)
        const obj = JSON.parse(await client.get(String(id)) ?? '{}');
        if(Object.keys(obj).length !== 0){
            return res.status(200).send(obj);
        }else{
            const cliente = await pg<Cliente>('clientes').where('id', id).first();
            if(!cliente) return res.status(404).send();
            const prevTrans = await pg<Transacao>('transacoes').where('id', id).orderBy('realizada_em').limit(10);
            return res.status(200).send({
                saldo: {
                    total: cliente.saldo,
                    limite: cliente.limite
                },
                ultimas_transacoes: prevTrans
            })
        }
    }catch(err) {
        return res.status(500).send();
    }
})

app.listen(9999, () => {
    console.log('listening on port 9999')
})