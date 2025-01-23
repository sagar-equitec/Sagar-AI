import fs from 'fs';
import path from 'path';
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function processFileContent(fileContent) {
    const prompt = `${process.env.AI_PROMPT}\n${fileContent}`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
        });

        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
            console.log(response.choices[0].message.content.trim());
        } else {
            throw new Error("Unexpected response format from OpenAI");
        }
    } catch (error) {
        console.error("Error processing file content:", error.message);
        return null;
    }
}

async function addCommentsToFile(filePath) {
    const fileName = path.basename(filePath);
    console.time(`Time taken to process file: ${fileName}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`Processing file: ${fileName}`);
    const originalContent = fileContent;
    const commentedContent = await processFileContent(fileContent);
    if (commentedContent) {
        if (commentedContent !== originalContent) {
            fs.writeFileSync(filePath, commentedContent.trim(), 'utf8');
            console.log(`Updated and saved file: ${fileName}`);
        } else {
            console.log(`No changes made to file: ${fileName}`);
        }
    }
    console.timeEnd(`Time taken to process file: ${fileName}`);
}

async function processFolder(folderPath, batchSize = 5) {
    const files = fs.readdirSync(folderPath)
                    .filter(file => fs.lstatSync(path.join(folderPath, file)).isFile() && path.extname(file) === '.cs')
                    .map(file => path.join(folderPath, file));

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(`Processing batch: ${batchNumber}`);
        console.time(`Time taken to process batch ${batchNumber}`);
        await Promise.all(batch.map(filePath => addCommentsToFile(filePath)));
        console.timeEnd(`Time taken to process batch ${batchNumber}`);
    }
    console.log('Processing complete.');
}

const folderPath = process.env.FOLDER_PATH;
 processFolder(folderPath).catch((error) => {
    console.error('Error processing folder:', error.message);
});