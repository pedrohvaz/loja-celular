import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import fs from 'fs'

// Os scripts das páginas são carregados como <script src="x.js"> clássicos
// (sem type="module"), que o Vite não empacota nem copia para o dist.
// Este plugin copia esses .js para o dist mantendo o mesmo caminho.
function copyClassicScripts(): Plugin {
  return {
    name: 'copy-classic-scripts',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')
      for (const file of fs.readdirSync(__dirname)) {
        if (file.endsWith('.js')) {
          fs.copyFileSync(path.resolve(__dirname, file), path.join(outDir, file))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [copyClassicScripts()],
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        produtos: path.resolve(__dirname, 'produtos.html'),
        checkout: path.resolve(__dirname, 'checkout.html'),
        consultaOs: path.resolve(__dirname, 'consulta-os.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        painel: path.resolve(__dirname, 'painel.html'),
        vendas: path.resolve(__dirname, 'vendas.html'),
        osLista: path.resolve(__dirname, 'os-lista.html'),
        osForm: path.resolve(__dirname, 'os-form.html'),
        osDetalhes: path.resolve(__dirname, 'os-detalhes.html'),
        configuracoes: path.resolve(__dirname, 'configuracoes.html'),
        finDashboard: path.resolve(__dirname, 'fin-dashboard.html'),
        finLancamentos: path.resolve(__dirname, 'fin-lancamentos.html'),
        finContas: path.resolve(__dirname, 'fin-contas.html'),
        finCaixa: path.resolve(__dirname, 'fin-caixa.html'),
        finRelatorios: path.resolve(__dirname, 'fin-relatorios.html'),
        sistema: path.resolve(__dirname, 'sistema.html'),
      },
    },
  },
})
