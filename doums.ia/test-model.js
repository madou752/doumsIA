require('dotenv').config();

async function listerModeles() {
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey) {
        console.log("❌ Erreur : Aucune clé API trouvée dans le fichier .env");
        return;
    }

    console.log("🔍 Interrogation de Google pour trouver tes modèles autorisés...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.log("❌ Erreur de l'API :", data.error.message);
            return;
        }

        console.log("\n✅ Voici les modèles que tu peux utiliser pour générer du texte :");
        console.log("--------------------------------------------------");
        data.models.forEach(model => {
            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                const nomPropre = model.name.replace('models/', '');
                console.log(`👉 ${nomPropre}`);
            }
        });
        console.log("--------------------------------------------------\n");

    } catch (error) {
        console.error("Erreur lors de la requête :", error);
    }
}

listerModeles();