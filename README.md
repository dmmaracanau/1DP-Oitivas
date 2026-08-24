# Agenda de Oitivas — Delegacia Metropolitana de Maracanaú

Sistema de agendamento, controle de pautas, impressão de mandados de intimação (PDF) e gestão de depoimentos da Polícia Civil do Estado do Ceará (1ª DP de Maracanaú).

---

## 🚀 Publicação e Hospedagem 100% Gratuita (Free Billing)

O projeto foi totalmente configurado para operar dentro do **plano gratuito (Free Tier / Spark Plan)**:

1. **Google AI Studio / Cloud Run (Publish):**
   - Arquitetura SPA (Single Page Application) estática e otimizada (`dist/`).
   - Sem custos de servidor em espera (scale-to-zero / hospedagem estática).
   - Para publicar: utilize a opção **Share** ou **Deploy** no menu do Google AI Studio.

2. **Firebase Firestore & Auth (Free Tier - Spark Plan):**
   - 50.000 leituras/dia e 20.000 gravações/dia gratuitas.
   - Cache local em navegador com sincronização automática multi-abas.
   - Regras de segurança ativas e implantadas.

---

## 🌐 Publicação Automática no GitHub Pages

O repositório já inclui o fluxo automático de compilação e deploy via **GitHub Actions** (`.github/workflows/deploy.yml`), além de caminhos relativos (`base: './'`) e arquivos de compatibilidade (`404.html` e `.nojekyll`).

### Como ativar o GitHub Pages no seu repositório:
1. Acesse o seu repositório no GitHub.
2. Vá em **Settings** > **Pages** (no menu lateral esquerdo).
3. Na seção **Build and deployment**:
   - Em **Source**, selecione: **`GitHub Actions`**.
4. Pronto! Sempre que você enviar alterações (`git push`), o GitHub Actions irá compilar o projeto e publicar automaticamente em:
   ```
   https://<seu-usuario>.github.io/<nome-do-repositorio>/
   ```

---

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev

# Compilar para produção
npm run build

# Pré-visualizar build de produção
npm run preview
```

---

## 📄 Recursos Principais
- **Mandados de Intimação (PDF):** Cabeçalho oficial da PC-CE (80%), preenchimento automático, edição rápida e canhoto de certidão para o OIP.
- **Pauta de Oitivas (PDF):** Relação por dia ou geral com cabeçalho oficial para impressão.
- **Notificação via WhatsApp:** Link direto com mensagem pré-formatada para intimados.
- **Integração Google Workspace:** Sincronização com Google Calendar, Google Drive e Gmail.
