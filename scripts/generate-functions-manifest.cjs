const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

process.env.GCLOUD_PROJECT = "bigi-awasaana-7b3ce";
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: "bigi-awasaana-7b3ce" });

async function generate() {
  const loader = require("../functions/node_modules/firebase-functions/lib/runtime/loader.js");
  const manifest = require("../functions/node_modules/firebase-functions/lib/runtime/manifest.js");

  console.log("Analyzing functions for manifest...");
  const stack = await loader.loadStack(path.resolve(__dirname, "../functions"));
  const wireFormat = manifest.stackToWire(stack);
  const yamlContent = yaml.stringify(wireFormat);

  const outputPath = path.resolve(__dirname, "../functions/functions.yaml");
  fs.writeFileSync(outputPath, yamlContent, "utf8");
  console.log(`Successfully generated ${outputPath} with ${Object.keys(stack.endpoints).length} endpoints.`);
}

generate().catch(err => {
  console.error("Failed to generate functions manifest:", err);
  process.exit(1);
});
