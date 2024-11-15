const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const featureExtractionScript = 'feature_extraction.py';
  const predictionScript = 'predict_new_samples.py';

  // Run feature_extraction.py
  exec(`python ${featureExtractionScript} ${filePath}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error running ${featureExtractionScript}:`, stderr);
      return res.status(500).send('Error processing file');
    }

    const featuresFilePath = stdout.trim(); // Assuming the script outputs the path to the features file

    // Run predict_new_samples.py
    exec(`python ${predictionScript} ${featuresFilePath}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error running ${predictionScript}:`, stderr);
        return res.status(500).send('Error predicting samples');
      }

      const predictionResults = stdout.trim();
      res.send(predictionResults);

      // Clean up temporary files
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
      fs.unlink(featuresFilePath, (err) => {
        if (err) console.error('Error deleting features file:', err);
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});