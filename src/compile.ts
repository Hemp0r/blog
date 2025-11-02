
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';

const baseOutputPath = path.join(process.cwd(), '/dist');
const baseInputPath = path.join(process.cwd(), '/src');
const copyFiles = ['assets/style.css', 'assets/favicon.ico', 'static/data-privacy.html', 'static/imprint.html'];
const baseUrl = 'https://hemp0r.dev';

/*
*   Helpers
*/ 

export async function compile(
    htmlTemplate: string,
    markdownContent: string,
    props: Map<string, string>
): Promise<string> {
    const converter = await marked.parse(markdownContent);
    let result = htmlTemplate;
    
    // Replace all placeholders with provided properties
    props?.forEach((value, name) => {
        result = result.replaceAll(`%%${name.toUpperCase()}%%`, value);
    });

    // Replace the placeholder with the rendered content
    return result.replace('%%CONTENT%%', converter);
}

async function ensureDir(dir: string) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err: any) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function copyStaticFiles(files: string[], destDir: string) {
    await Promise.all(
        files.map(async (file) => {
            const dest = path.join(destDir, path.basename(file));
            await fs.copyFile(path.join(baseInputPath, file), dest);
        })
    );
}

async function readJSON(file: string) {
    const data = await fs.readFile(file, 'utf-8');
    return JSON.parse(data);
}


/*
*   Main compilation process
*/ 
async function main() {
    try {
        await ensureDir(baseOutputPath);
        await copyStaticFiles(copyFiles, baseOutputPath);

        const entries = await readJSON(path.join(baseInputPath, 'blog.json'));
        const layout = await fs.readFile(path.join(baseInputPath, 'layout.html'), 'utf-8');


        // blog entries
        await Promise.all(
            entries.posts.map(async (entry: any) => {
                entry.URL = `${baseUrl}/${entry.file
                    .replace('blog/', '')
                    .replace('.md', '.html')}`;

                const markdownContent = await fs.readFile(entry.file, 'utf-8');

                // Convert entry object to Map<string, string>
                const props = new Map<string, string>(Object.entries(entry));
                const compiledContent = await compile(layout, markdownContent, props);
                const outFile = path.join(
                    baseOutputPath,
                    entry.file.replace('blog/', '').replace('.md', '.html')
                );
                await fs.writeFile(outFile, compiledContent);
            })
        );

        // index page
        const sortedPosts = [...entries.posts].sort(
            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const indexContent = sortedPosts
            .map(
                (post: any) =>
                    `<a href="${post.file
                        .replace('blog/', '')
                        .replace('.md', '.html')}"><h2>${post.title}</h2><p>${post.date}</p></a>`
            )
            .join('\n');
        const indexHtml = await compile(
            layout,
            indexContent,
            new Map<string, string>([['title', 'Home'], ['URL', baseUrl]])
        );
        await fs.writeFile(path.join(baseOutputPath, 'index.html'), indexHtml);

        console.log('Compilation complete!');
    } catch (err) {
        console.error('Compilation failed:', err);
        process.exit(1);
    }
}

main();