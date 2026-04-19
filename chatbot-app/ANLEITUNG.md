# ChatBot Pro – Anleitung zum Hochladen & Starten

## Was du hast
Eine fertige Web-App mit:
- Landingpage (deine Verkaufsseite)
- Admin-Dashboard (für deine Kunden)
- Einbettbarer Chatbot-Button (für Kunden-Websites)
- Automatischer KI-Antwort via Claude API

---

## Schritt 1 – API-Key holen (kostenlos starten)

1. Gehe zu https://console.anthropic.com
2. Registriere dich (kostenlos)
3. Klicke auf "API Keys" → "Create Key"
4. Kopiere den Key (beginnt mit `sk-ant-...`)

---

## Schritt 2 – App hochladen auf Render.com (kostenlos)

Render ist ein Hosting-Dienst, der diese App kostenlos hostet.

### 2a – GitHub-Konto erstellen (falls nicht vorhanden)
- Gehe zu https://github.com → "Sign up"

### 2b – Neues Repository erstellen
1. Klicke auf "New repository"
2. Name: `chatbot-pro`
3. Klicke "Create repository"
4. Lade alle Dateien aus diesem Ordner hoch:
   - `server.js`
   - `package.json`
   - `.env.example`
   - Den Ordner `public/` mit allen Dateien darin

### 2c – Render einrichten
1. Gehe zu https://render.com → "Get Started for Free"
2. Klicke "New +" → "Web Service"
3. Verbinde dein GitHub-Konto und wähle `chatbot-pro`
4. Einstellungen:
   - **Name**: chatbot-pro
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Klicke auf "Advanced" → "Add Environment Variable":
   - Key: `ANTHROPIC_API_KEY`
   - Value: dein API-Key von Schritt 1
6. Klicke "Create Web Service"

Nach 2-3 Minuten ist deine App live unter z.B.:
`https://chatbot-pro.onrender.com`

---

## Schritt 3 – Ersten Kunden anlegen

Die App lädt mit einem Demo-Kunden vor. Um einen echten Kunden anzulegen:

1. Öffne die Datei `data/clients.json` auf Render (oder lokal)
2. Kopiere den "demo"-Block und ändere:
   - `id`: eindeutiger Slug (z.B. "bäckerei-schmidt")
   - `name`: Firmenname
   - `password`: Passwort für den Kunden
3. Speichere und deploye neu

Oder: Schreibe mir, ich baue dir ein Admin-Interface dafür!

---

## Schritt 4 – Kunden einrichten

Sende jedem Kunden:
- **Admin-URL**: `https://deine-app.onrender.com/admin`
- **Kunden-ID**: der Slug (z.B. "bäckerei-schmidt")
- **Passwort**: das Passwort aus clients.json

Der Kunde loggt sich ein und kann:
- Willkommensnachricht anpassen
- FAQs einpflegen
- Farbe & Bot-Name einstellen
- Den Einbettungs-Code kopieren

---

## Schritt 5 – Chatbot in Kunden-Website einbetten

Der Kunde fügt diesen Code in seine Website ein:

```html
<script src="https://deine-app.onrender.com/widget.js"
  data-id="kunden-slug"
  data-color="#1D9E75">
</script>
```

Das ist alles – der Chatbot erscheint sofort als Button unten rechts!

---

## Was du monatlich verdienst

| Paket    | Einrichtung | Monatlich | Deine Kosten (API) |
|----------|-------------|-----------|-------------------|
| Starter  | 499 €       | 79 €      | ~5-15 €           |
| Business | 799 €       | 149 €     | ~10-30 €          |
| Agentur  | 1.499 €     | 299 €     | ~30-80 €          |

**Beispiel**: 5 Business-Kunden = 5x 149 € = 745 €/Monat – minus ~100 € Kosten = ~645 € Gewinn

---

## Fragen?

Schreib mir jederzeit – ich helfe dir beim Einrichten, beim ersten Kunden und beim Verkaufen.
