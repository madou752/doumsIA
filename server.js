require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);

// Étape 1 : analyser la demande et retourner des questions ciblées si nécessaire
app.post('/api/analyze', async (req, res) => {
    try {
        const { request, history } = req.body;

        if (!request || typeof request !== 'string' || request.trim().length === 0) {
            return res.status(400).json({ error: "La demande ne peut pas être vide." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const historyText = Array.isArray(history) && history.length > 0
            ? `\nContexte : l'utilisateur a déjà fait ces demandes dans cette session :\n${history.map((h, i) => `[${i + 1}] "${h}"`).join('\n')}`
            : '';

        const analyzePrompt = `Tu es un expert en Prompt Engineering. Un utilisateur veut que tu l'aides à générer un prompt de haute qualité qu'il utilisera ensuite sur une IA avancée (ChatGPT, Claude, Gemini Pro, etc.).

Sa demande brute : "${request.trim()}"${historyText}

Analyse sa demande. Si elle manque d'informations essentielles pour créer un prompt précis et efficace, pose 2 à 3 questions ciblées. Si la demande est déjà suffisamment claire, génère directement sans questions.

Réponds UNIQUEMENT avec ce JSON valide, sans markdown ni backticks :
{
  "understood": "résumé en 1 phrase de ce que l'utilisateur veut accomplir",
  "needsQuestions": true ou false,
  "questions": [
    {"id": "q1", "text": "question 1"},
    {"id": "q2", "text": "question 2"}
  ]
}

Règles importantes :
- Maximum 3 questions, uniquement si vraiment nécessaires
- Les questions doivent être concrètes et utiles pour améliorer le prompt
- Si needsQuestions est false, retourne un tableau questions vide []`;

        const result = await model.generateContent(analyzePrompt);
        let text = result.response.text().trim();

        // Nettoyer les éventuels blocs markdown
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        const parsed = JSON.parse(text);

        if (typeof parsed.understood !== 'string' || typeof parsed.needsQuestions !== 'boolean' || !Array.isArray(parsed.questions)) {
            throw new Error("Format de réponse inattendu de l'IA.");
        }

        res.json(parsed);

    } catch (error) {
        console.error("Erreur analyse :", error);
        res.status(500).json({ error: "Erreur lors de l'analyse de la demande." });
    }
});

// Étape 2 : générer le prompt optimisé final
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { request, understood, answers, history } = req.body;

        if (!request || typeof request !== 'string' || request.trim().length === 0) {
            return res.status(400).json({ error: "La demande ne peut pas être vide." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const answersText = answers && typeof answers === 'object' && Object.keys(answers).length > 0
            ? `\nPrécisions apportées par l'utilisateur :\n${Object.entries(answers).map(([q, a]) => `- ${q} → ${a}`).join('\n')}`
            : '';

        const historyText = Array.isArray(history) && history.length > 0
            ? `\nContexte de session (demandes précédentes) :\n${history.map((h, i) => `[${i + 1}] ${h}`).join('\n')}`
            : '';

        const metaPrompt = `Tu es un expert mondial en Prompt Engineering. Ta mission est de transformer une demande brute en un prompt professionnel, précis et optimisé pour être utilisé sur une IA avancée (ChatGPT-4, Claude 3.5 Sonnet, Gemini Ultra, etc.).

DEMANDE ORIGINALE :
"${request.trim()}"

COMPRÉHENSION :
${understood || 'Non fournie'}${answersText}${historyText}

CHECKLIST QUALITÉ — vérifie chaque point avant de générer le prompt final :
✓ Objectif clair et sans ambiguïté
✓ Contexte suffisant fourni à l'IA cible
✓ Rôle ou expertise de l'IA spécifié si pertinent
✓ Format de sortie attendu explicitement défini
✓ Contraintes, limites ou exclusions mentionnées
✓ Ton et niveau de détail adaptés à la demande
✓ Aucune information superflue ou contradictoire

Génère UNIQUEMENT le prompt final optimisé. Aucune introduction, aucune explication, aucun commentaire, aucun titre. Juste le prompt, prêt à être copié-collé directement dans une IA.`;

        const result = await model.generateContent(metaPrompt);
        const generatedPrompt = result.response.text();

        res.json({ prompt: generatedPrompt });

    } catch (error) {
        console.error("Erreur génération :", error);
        res.status(500).json({ error: "Erreur lors de la génération du prompt." });
    }
});

// Local dev
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}

module.exports = app;