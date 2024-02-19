<h1 align="center"> API NodeJS Rinha backend 2024-Q1 </h1>

## Instalação


```sh
yarn
```
## Inicialização

```sh
yarn start
```

## Autores

| [<img loading="lazy" src="https://avatars.githubusercontent.com/u/77247827?v=4" width=115><br><sub>Erick Henrique</sub>](https://github.com/ErickHenrique2000) |  [<img loading="lazy" src="https://avatars.githubusercontent.com/u/59484056?v=4" width=115><br><sub>Lucca Duarte</sub>](https://github.com/Lucca810) |
| :---: | :---: |

## Sobre nós e objetivos

<p>
Somos 2 desenvolvedores com pouco tempo de experiencia na área, cerca de 2 anos de experiencia cada, iniciamos na rinha de backend com o objetivo de melhorar nossos conceitos e conhecimento na área, principalmente em relação ao uso de NodeJS em cenários que exigem maior conhecimento técnico. <br />
Esperamos que ao final tenhamos saído com um conhecimento maior e melhores do que iniciamos. <br />
Caso queiram ver nossa jornada e desafios enfrentados fiquem a vontade de ler os proximos tópicos, que conta de maneira bem resumida o que passamos.
</p>

## Ideias e inicio da API

<p>
Para iniciarmos nossa api olhamos o desafio proposto e tentamos advinhar qual seria o objetivo final dele, a primeira conclusão que chegamos é de que o maior problema seria lidar com requisições concorrentes alterando e lendo os mesmos dados, um problema clássico que todos que fizeram faculdade já viram, além disso outro problema que teriamos seria a liberação rápida as requisições para não deixarmos nossa API sobrecarregada. <br />
Com isso nossa primeira ideia foi algo básico, iriamos utilizar 2 tipos de armazenamento de dados, um banco de dados SQL, sendo ele o PostgreSQL e o Redis, que serviria como cache de alta velocidade para conseguirmos responder de maneira rápida às requisições, nossa ideia principal era utilizar todos os dados no redis e inserirmos no banco de forma assincrona, dessa forma, ao chegar uma requisição, capturariamos o valor atual no Redis, atualizariamos o seu valor nele e devolveriamos ao cliente, após isso enviariamos os comandos de insert e update ao banco de forma assincrona, para ele resolver "quando der"
</p>

## Primeira versão e primeiros erros

<p>
Ao finalizarmos nossa primeira versão fomos rodar ela localmente e passar a primeira bateria de testes, ao final do primeiro teste não poderiamos estar mais surpresos, apenas 28 erros entre 60000 requests:
<br />
<img src="https://i.ibb.co/nzkV6GN/Screenshot-4.png" width=550></img>
<br />
Maravilha certo? Só corrigir alguns errinhos, criar os dockers e partir para o abraço né? <br />
É agora que a nossa jornada começa a ficar interessante e tortuosa, algo que só fomos descobrir no futuro é que esses 28 erros estavam ocultando uma centena de outros erros presentes.
</p>

## Corrigindo validações

<p>
Iniciamos a correção das validações, em boa parte foi tranquilo, descobrimos que não estavamos validando o body que estavamos recebendo corretamente, adicionamos essas validações, porém após resolver esses erros, ficamos com um erro final, o saldo não estava sendo atualizado corretamente, ou seja, estavamos travados na situação de concorrência, estavamos recebendo inúmeras requisições para atualizar o saldo e todas estavam executando juntas, pegávamos o valor que estava armazenado atualizávamos ele e inserindo, mas isso gerava inconsistencia se os dados fossem capturados antes das atualizações, para resolver isso decidimos dar um passo atrás na nossa arquitetura e focar no básico, deixamos o Redis de lado e passamos a utilizar somente o PostgreSQL, por ser um banco ACID utilizamos desse apecto para atualizar os saldos no update, assim todos os saldos eram atualizados com consistencia, eliminando assim um problema de paralelismo, após isso conseguimos passar por todas as validações, porém entramos em outro problema.
<img src="https://i.ibb.co/nrw6xJ8/Screenshot-2.png" width=550></img>
<br />
Estavamos agora ultrapassando os limites estipulados
</p>

## Corrigindo limites