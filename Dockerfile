# 1. Usar uma imagem base oficial do Node.js (versão slim é menor)
FROM node:18-slim

# 2. Definir o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# 3. Copiar os arquivos de definição do projeto e instalar as dependências
# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./
RUN npm install --production

# 4. Copiar o código-fonte da aplicação para o diretório de trabalho
COPY . .

# 5. Expor a porta que a aplicação vai rodar
# Usamos uma variável de ambiente para que seja configurável
ENV PORT=3000
EXPOSE 3000

# 6. Comando para iniciar a aplicação quando o container for executado
CMD [ "node", "server.js" ]
