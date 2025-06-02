const OpenAI = require("openai");

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  throw new Error('OpenAI API key is required');
}

console.log('✅ OpenAI API key loaded:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function normalizeWithAI(text, type = "specie") {
  try {
    const prompt = `Normalizează acest ${type} de animal la forma de bază, nearticulată, un singur cuvânt, fără explicații. Prima literă să fie mare și cu diacritice corecte: ${text}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",  // Updated model
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 10,
      temperature: 0,
      n: 1
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Check for specific error types
    if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI rate limit exceeded');
    }
    
    // Fallback: return original text if AI fails
    console.warn('AI normalization failed, returning original text:', text);
    return text;
  }
}

module.exports = { normalizeWithAI };