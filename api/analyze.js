const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
};
