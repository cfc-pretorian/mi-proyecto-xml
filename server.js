process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cambia require por import
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';  // Importar path
import { Octokit } from '@octokit/rest';
import https from 'https'; // Para manejar la verificación de certificados SSL

// Crear la aplicación Express
const app = express();
const port = 3000;

// Servir archivos estáticos (como index.html) desde el directorio actual
app.use(express.static(path.resolve()));

// Configura Multer para manejar la subida de archivos
const upload = multer({ dest: 'uploads/' });

// Función para generar un nuevo nombre si el archivo ya existe
async function generateNewFileName(octokit, owner, repo, originalFileName, directory) {
    let fileExists = true;
    let counter = 1;
    let newFileName = originalFileName;
    const [baseName, extension] = originalFileName.split('.');

    // Repetir mientras el archivo exista
    while (fileExists) {
        try {
            // Verificar si el archivo existe en el repositorio
            await octokit.repos.getContent({
                owner,
                repo,
                path: `${directory}/${newFileName}`
            });
            // Si existe, agregar un número al nombre
            newFileName = `${baseName}_${counter}.${extension}`;
            counter++;
        } catch (error) {
            // Si el archivo no existe (error 404), salir del bucle
            if (error.status === 404) {
                fileExists = false;
            } else {
                throw error;  // Si es otro error, lo lanzamos
            }
        }
    }
    return newFileName;
}

// Rutas para manejar la subida de archivos
app.post('/upload-xml', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        let fileName = req.file.originalname;
        const content = fs.readFileSync(filePath, 'utf8');

        // Usar el token desde la variable de entorno
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,  // Obtiene el token desde la variable de entorno
            request: {
                agent: new https.Agent({
                    rejectUnauthorized: false  // Ignorar SSL autofirmado
                })
            }
        });

        const owner = 'cfc-pretorian';
        const repo = 'mi-proyecto-xml';
        const directory = 'archivos_xml';

        // Generar un nuevo nombre si el archivo ya existe
        fileName = await generateNewFileName(octokit, owner, repo, fileName, directory);

        // Subir el archivo a GitHub
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `${directory}/${fileName}`,
            message: `Subir archivo XML: ${fileName}`,
            content: Buffer.from(content).toString('base64'),
            committer: {
                name: 'GitHub Actions',
                email: 'action@github.com'
            },
            author: {
                name: 'GitHub Actions',
                email: 'action@github.com'
            }
        });

        // Manejo de éxito
        console.log('Respuesta de GitHub:', response);
        res.json({ success: true, message: `Archivo XML subido a GitHub como ${fileName}.` });
    } catch (error) {
        // Manejo de error más detallado
        if (error.response && error.response.data) {
            console.error('Error al subir el archivo a GitHub:', error.response.data.message);
            console.error('Documentación de GitHub:', error.response.data.documentation_url);
        } else {
            console.error('Error inesperado:', error);
        }
        res.status(500).json({ success: false, message: 'Error al subir el archivo a GitHub.' });
    } finally {
        fs.unlinkSync(req.file.path);  // Eliminar el archivo temporal después de subirlo
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
