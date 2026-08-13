const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");

exports.generateSeoBlog = onCall({ maxInstances: 5 }, async (request) => {
  const data = request.data || {};
  const topic = data.topic;

  if (!topic) {
    throw new HttpsError("invalid-argument", "The function must be called with a topic.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not set in the environment.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are an expert SEO copywriter and food blogger. 
Write a highly optimized, engaging blog post about: "${topic}".
The restaurant is called "Bigi Awasaana", located in Reseda, California. It serves authentic Afghan street food, like Chapli Kabab, Bolani, and Halal Burgers.
Return the response ONLY as a raw JSON object (no markdown formatting, no \`\`\`json) with the following keys:
- "title": A catchy, SEO-friendly title (string).
- "excerpt": A short, 1-2 sentence meta description (string).
- "keywords": A comma-separated string of 5-7 local SEO keywords.
- "content": The main body of the blog post, formatted as clean HTML. Use <h2> and <h3> for headings, and <p> for paragraphs. DO NOT include a <h1> (the title acts as the H1). Ensure the content sounds appetizing and localized to the San Fernando Valley (SFV).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let text = response.text;
    
    // Sometimes the model returns markdown code blocks despite instructions
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.substring(3, jsonStr.length - 3);
    }
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("Error generating blog:", error);
    throw new HttpsError("internal", error.message);
  }
});
