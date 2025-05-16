const Media = require('../models/MultiMedia');


exports.getMediaByAnimalId = async (req, res) => {
  try {
    const { animalId } = req.params;
    
    if (!animalId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }
    
    const mediaItems = await Media.findByAnimalId(animalId);
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(mediaItems));
  } catch (error) {
    console.error("Error fetching media for animal:", error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Failed to fetch media" }));
  }
};