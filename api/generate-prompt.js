const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
};
