# Auto-Close Resolved Issues

Questo workflow GitHub Actions chiude automaticamente le issue quando una Pull Request le risolve.

## 📋 Come Funziona

### 1. **Trigger**
Il workflow si attiva quando:
- Una PR viene aperta su `main` o `develop`
- Una PR viene sincronizzata (push di nuovi commit)
- La descrizione della PR viene modificata

### 2. **Estrazione Issue**
Il workflow estrae i numeri delle issue dal:
- **Commit messages** (es: "fix: resolve issue Fixes #42")
- **PR body** (descrizione della PR)

### 3. **Pattern Supportati**
Tutti questi pattern vengono riconosciuti:
```
Fixes #123
Closes #123
Resolves #123
Fix #123
Close #123
Resolve #123
```

### 4. **Azioni Automatiche**
Per ogni issue trovata:
1. ✅ Verifica se è già chiusa (salta se lo è)
2. ✅ Aggiunge un commento con link alla PR
3. ✅ Chiude automaticamente l'issue

## 🚀 Utilizzo

### Metodo 1: GitHub Actions (Automatico)

Nessuna configurazione necessaria! Il workflow funziona di default.

Basta aggiungere nel commit message o nella PR description:

**Commit message:**
```
fix: resolve accessibility issue

Fixes #42
Closes #20
```

**O nella descrizione della PR:**
```markdown
## Description
This PR fixes the keyboard accessibility issues.

Fixes #42
Closes #20
```

### Metodo 2: Script Locale

Puoi anche eseguire lo script manualmente:

```bash
export GITHUB_TOKEN=your_github_token
export GITHUB_REPOSITORY=L9Lenny/lol-profile-editor
export PR_NUMBER=1

node .github/scripts/close-resolved-issues.js
```

## 📝 Esempio di Utilizzo

### Scenario 1: Commit singolo che risolve issue

```bash
git commit -m "fix: add keyboard accessibility support

This commit adds keyboard event handlers to all interactive elements.

Fixes #20
Fixes #42"
```

Quando la PR viene creata, il workflow:
1. Legge il commit message
2. Trova le issue #20 e #42
3. Aggiunge commenti su entrambe le issue
4. Chiude entrambe le issue

### Scenario 2: Descrizione PR con issue multipli

```markdown
# Fix: Keyboard Accessibility

This PR resolves multiple accessibility issues found by SonarQube.

## Issues Resolved
- Closes #20 - Keyboard listeners on buttons
- Closes #42 - Native button elements
- Fixes #13 - RegExp.exec() usage

## Changes
- Add keyboard event handlers
- Convert div role="button" to native buttons
- Use RegExp.exec() instead of String.match()
```

Il workflow:
1. Estrae tutte le issue dalla descrizione
2. Chiude #20, #42, #13 automaticamente
3. Aggiunge commenti su tutte e tre

## 🔔 Commento Automatico

Quando un'issue viene chiusa, riceve un commento simile a questo:

```markdown
## ✅ Resolved by PR

This issue has been resolved by PR #1: **fix: add keyboard accessibility**

[View PR →](https://github.com/L9Lenny/lol-profile-editor/pull/1)

---
This comment was automatically generated when the PR was opened.
```

## ⚙️ Configurazione

### File Coinvolti

- **`.github/workflows/close-resolved-issues.yml`** - Workflow GitHub Actions
- **`.github/scripts/close-resolved-issues.js`** - Script Node.js (alternativo)

### Permessi Richiesti

Il workflow richiede questi permessi GitHub Actions (già configurati):
- `pull-requests: read` - Leggere i dati delle PR
- `issues: write` - Scrivere commenti e chiudere issue

### Branch Monitorati

Il workflow è attivo su:
- `main`
- `develop`

Per modificare, edita il file `.github/workflows/close-resolved-issues.yml`

## 🎯 Best Practices

### 1. **Sempre referenziare le issue**
Nel commit message o PR description, sempre menzionare le issue che vengono risolte:

```bash
git commit -m "fix: description of fix

Fixes #123"
```

### 2. **Usare il formato corretto**
Usa uno di questi pattern:
- `Fixes #123` (per bug fix)
- `Closes #123` (per issue generiche)
- `Resolves #123` (alternativa)

### 3. **Issue multiplos**
Puoi referenziare multiple issue:

```
Fixes #20
Fixes #42
Closes #13
```

### 4. **Solo issue aperte**
Il workflow salta automaticamente le issue già chiuse, quindi è sicuro referenziare issue vecchie.

## 📊 Monitoraggio

### Workflow Logs

1. Vai su: `Actions` → `Auto-Close Resolved Issues`
2. Seleziona l'ultima esecuzione
3. Visualizza i dettagli dell'esecuzione

### Issue Comments

Ogni issue chiusa avrà:
- ✅ Un commento con link alla PR
- ✅ Lo stato cambiato a `closed`
- ✅ Una timeline entry di chiusura

## 🚨 Troubleshooting

### Workflow non si esegue

**Causa**: Branch non è `main` o `develop`

**Soluzione**: Modifica il file `.github/workflows/close-resolved-issues.yml` se usi branch diversi

### Issue non viene chiusa

**Causa**: Il pattern di referenziamento non è riconosciuto

**Soluzione**: Usa uno dei pattern supportati (Fixes, Closes, Resolves)

### Errore di permessi

**Causa**: GitHub token non ha permessi sufficienti

**Soluzione**: Assicurati che il token abbia accesso `issues:write`

## 📚 Riferimenti

- [GitHub Auto-linking references](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub REST API - Issues](https://docs.github.com/en/rest/issues/issues)

## 🔗 Integrazione con SonarQube

Questo workflow si integra perfettamente con SonarQube:

1. SonarQube crea issue su GitHub
2. Sviluppatore crea PR e referenzia le issue
3. Workflow chiude automaticamente le issue
4. Pull request viene mergiata
5. Issue risolte!

**Flusso completo:**
```
SonarQube Analysis
        ↓
   Creates Issues #20, #42
        ↓
Developer creates PR
        ↓
    Commits "Fixes #20, #42"
        ↓
Workflow detects and closes issues
        ↓
    Issues closed with comments!
```
