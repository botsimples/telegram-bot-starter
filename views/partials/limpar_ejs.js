import fs from "fs";
import path from "path";

const pastaViews = "./views";

function limparArquivosEJS(dir) {
  const arquivos = fs.readdirSync(dir);

  for (const arquivo of arquivos) {
    const caminho = path.join(dir, arquivo);
    const stats = fs.statSync(caminho);

    if (stats.isDirectory()) {
      limparArquivosEJS(caminho);
    } else if (arquivo.endsWith(".ejs")) {
      let conteudo = fs.readFileSync(caminho, "utf8");
      const original = conteudo;

      // Remove cabeçalho e rodapé HTML
      conteudo = conteudo.replace(/<!DOCTYPE html>[\s\S]*?<body.*?>/gi, "");
      conteudo = conteudo.replace(/<\/body>\s*<\/html>/gi, "");
      conteudo = conteudo.trim();

      if (conteudo !== original) {
        fs.writeFileSync(caminho, conteudo, "utf8");
        console.log(`🧹 Limpo: ${caminho}`);
      }
    }
  }
}

limparArquivosEJS(pastaViews);
console.log("✅ Limpeza concluída!");
