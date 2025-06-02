const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  throw new Error('Gemini API key is required');
}

console.log('✅ Gemini API key loaded:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function normalizeWithAI(text, type = "specie") {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",  
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 10,
      }
    });

    const prompt = `Normalizează acest ${type} de animal la forma de bază, nearticulată, un singur cuvânt, fără explicații. Prima literă să fie mare și cu diacritice corecte: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const normalizedText = response.text().trim();
    
    return normalizedText;
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    if (error.message && error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API key');
    } else if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('Gemini quota exceeded');
    } else if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
      throw new Error('Gemini rate limit exceeded');
    }
    
    throw error;
  }
}

module.exports = { normalizeWithAI };