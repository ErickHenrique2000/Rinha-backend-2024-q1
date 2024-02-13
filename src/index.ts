import express from 'express'

const app = express();

app.use(express.json())

app.get('/api', (req, res) => {
    console.log('olá');
    return res.status(200).send();
})

app.post('/clientes/:id/transacoes', (req, res) => {
    const {valor, tipo, descricao} = req.body;
    const id = req.params.id;
    console.log(valor, tipo, descricao, id);

    return res.status(200).send()
})

app.get('/clientes/:id/extrato', (req, res) => {
    
})

app.listen(9999, () => {
    console.log('listening on port 9999')
})