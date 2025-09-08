# Patch de porta (HOST)

Erro visto: `Bind for 0.0.0.0:3000 failed: port is already allocated`.

Este compose altera o mapeamento para `3011:3000`, ou seja:
- Container continua ouvindo em **3000**
- Host expõe em **3011**

Aponte seu n8n para: `http://SEU_HOST:3011`.

Se preferir outra porta livre, troque `3011`.
