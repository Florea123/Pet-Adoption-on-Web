const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function normalizeWithAI(text, type = "specie") {
  const prompt = `Normalizează acest ${type} de animal la forma de bază, nearticulată, un singur cuvânt, fără explicații. Prima literă să fie mare și cu diacritice corecte: ${text}`;
  const response = await openai.completions.create({
    model: "text-davinci-003",
    prompt,
    max_tokens: 5,
    temperature: 0,
    n: 1,
    stop: ["\n"]
  });
  return response.choices[0].text.trim();
}

module.exports = { normalizeWithAI };