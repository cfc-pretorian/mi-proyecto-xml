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

// Rutas para manejar la subida de archivos
app.post('/upload-xml', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;
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

        // Subir el archivo a GitHub
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `archivos_xml/${fileName}`,
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
        res.json({ success: true, message: 'Archivo XML subido a GitHub.' });
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
        fs.unlinkSync(req.file.path);
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
