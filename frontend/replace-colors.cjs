const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.jsx') && !filePath.endsWith('.js') && !filePath.endsWith('.css')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We only want to replace tailwind color classes like "indigo-500", "text-indigo", "bg-indigo"
    // or literal "indigo" in some contexts. But straightforward string replace of the words is usually safe in these UI files.
    // Let's be a bit careful:
    content = content.replace(/indigo-/g, 'blue-');
    content = content.replace(/purple-/g, 'red-');
    content = content.replace(/pink-/g, 'rose-');

    // Replace literal references too if they are mapped to tailwind themes
    content = content.replace(/'indigo'/g, "'blue'");
    content = content.replace(/'purple'/g, "'red'");
    content = content.replace(/'pink'/g, "'rose'");

    // Also "indigo" to "blue" in double quotes
    content = content.replace(/"indigo"/g, '"blue"');
    content = content.replace(/"purple"/g, '"red"');
    content = content.replace(/"pink"/g, '"rose"');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath.replace(srcDir, '')}`);
    }
}

walkDir(srcDir, processFile);
console.log('Color replacement complete.');
