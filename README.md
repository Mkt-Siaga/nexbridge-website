# Nexbridge International · site do catálogo

Site estático (HTML/CSS/JS puro, sem build) com o catálogo de produtos da Nexbridge: busca, filtro por categoria, ficha do produto e lista de cotação (fica salva só no navegador de quem usa; o botão "Copiar lista" gera o texto com SKU, nome e quantidade).

Publicado pelo GitHub Pages: todo push na `main` atualiza o site.

## Arquivos

- `index.html`, `css/site.css`, `js/app.js`: o site.
- `js/destaques.js`: anúncios do carrossel do topo (produto, selo, título, texto e cor). Editar à mão.
- `js/dados.js`, `img/produtos/`, `img/marca/`, `Nexbridge_Catalogo_de_Produtos.pdf`: **gerados**, não editar à mão.

## Atualizar produtos

Os dados vêm da base de trabalho (pasta `nexbridge-catalogo`, fora deste repositório). Depois de mudar a base ou gerar um novo PDF:

```bash
node ../nexbridge-catalogo/scripts/exportar-site.mjs
```

O exportador só leva campos de vitrine (nome, categoria, descrição, foto e especificações preenchidas). Preço, pedido mínimo, EAN, NCM e anotações internas **não** vão para o site, porque este repositório é público.

## Pendências

- Contato comercial (e-mail, WhatsApp, telefone) para a lista de cotação ser enviada direto.
- Fotos em alta resolução; 7 produtos estão com "Foto em atualização".
- Domínio próprio, se houver.
