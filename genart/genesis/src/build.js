import fs from 'fs';
import path from 'path';

const rootDir = path.join(process.cwd(), 'genart', 'genesis');
const pagesDir = path.join(rootDir, 'src', 'pages');

const templatePath = path.join(rootDir, 'src', 'template.html');
const template = fs.readFileSync(templatePath, 'utf-8');

const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));

pageFiles.forEach((file) => {
    console.log(file);
    const pagePath = path.join(pagesDir, file);
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    const finalContent = template.replace('{{main}}', pageContent);

    const outputFilePath = path.join(rootDir, file);

    fs.writeFileSync(outputFilePath, finalContent, 'utf-8');
});
