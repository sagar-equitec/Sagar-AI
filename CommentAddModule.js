import fs from 'fs';
import path from 'path';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: "API-KEY"
});

// Function to process a single chunk of code
async function processChunk(chunk) {
   const prompt = `You are a code assistant. Your task is to add detailed explanatory comments to the provided code. 
    - Do not replace, modify, or truncate any part of the original code.
    - Preserve all original content exactly as it is.
    - Add comments next to or above each line of code, using the same commenting style already used in the file (e.g., \`//\` or \`/* */\`).
    - Ensure that each comment explains the functionality of the respective line or block of code, while maintaining the original code intact.
    
    Code:
    ${chunk}`;


    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1500,
        });

        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
            return response.choices[0].message.content.trim();
        } else {
            throw new Error("Unexpected response format from OpenAI");
        }
    } catch (error) {
        console.error("Error processing chunk:", error.message);
        return null;
    }
}

// Function to split file content into manageable chunks
function splitFileContent(fileContent, linesPerChunk = 150) {
    const lines = fileContent.split('\n');
    const chunks = [];

    for (let i = 0; i < lines.length; i += linesPerChunk) {
        chunks.push(lines.slice(i, i + linesPerChunk).join('\n'));
    }

    return chunks;
}

// Function to process a file
async function addCommentsToFile(filePath) {
    const fileName = path.basename(filePath);
    console.time(`Time taken to process file: ${fileName}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    console.log(`Processing file: ${fileName}`);

    const chunks = splitFileContent(fileContent);
    let updatedContent = '';

    for (const chunk of chunks) {
        const commentedChunk = await processChunk(chunk);
        if (commentedChunk) {
            updatedContent += commentedChunk + '\n';
        }
    }

    // Save the updated content back to the file
    fs.writeFileSync(filePath, updatedContent.trim(), 'utf8');
    console.timeEnd(`Time taken to process file: ${fileName}`);
    console.log(`Updated and saved file: ${fileName}`);
}

// Function to process files in batches
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

// Replace with your folder path
const folderPath = 'FOLDER-PATH';
processFolder(folderPath).catch((error) => {
    console.error('Error processing folder:', error.message);
});
