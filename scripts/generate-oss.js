// scripts/generate-oss.js
const licenseChecker = require('license-checker');
const fs = require('fs-extra');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'oss-licenses.json');

licenseChecker.init(
  { start: path.join(__dirname, '..'), production: true, json: true },
  async (err, packages) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    // Normalize to a compact array for the app
    const items = Object.entries(packages).map(([nameVersion, info]) => ({
      nameVersion,
      licenses: info.licenses,
      repository: info.repository || null,
      licenseFile: info.licenseFile || null,
      publisher: info.publisher || null,
    }));
    await fs.ensureDir(path.dirname(OUT));
    await fs.writeJson(OUT, { generatedAt: new Date().toISOString(), items }, { spaces: 2 });
    console.log(`Wrote ${items.length} entries to ${OUT}`);
  }
);