// Cambia require por import
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';  // Importar path
import { Octokit } from '@octokit/rest';

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

        const octokit = new Octokit({ auth: 'ghp_123456789ABCDEFGHIJ' });
        const owner = 'cfc-pretorian';
        const repo = 'Inyeccion-IOC-2';

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

        res.json({ success: true, message: 'Archivo XML subido a GitHub.' });
    } catch (error) {
        console.error('Error al subir el archivo a GitHub:', error);
        res.status(500).json({ success: false, message: 'Error al subir el archivo a GitHub.' });
    } finally {
        fs.unlinkSync(req.file.path);
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
