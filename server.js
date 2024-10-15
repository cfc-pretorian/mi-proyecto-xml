// Desactivar validación de certificado autofirmado (solo para desarrollo)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { Octokit } from '@octokit/rest';

const app = express();
const port = 3000;

// Configura Multer para manejar la subida de archivos
const upload = multer({ dest: 'uploads/' });

// Configura el token de GitHub y el repositorio
const octokit = new Octokit({ auth: 'ghp_123456789ABCDEFGHIJ' });  // Reemplaza con tu token real
const owner = 'cfc-pretorian';  // Reemplaza con tu nombre de usuario si es diferente
const repo = 'Inyeccion-IOC-2';  // Reemplaza con el nombre de tu repositorio

// Ruta para manejar la subida de archivos
app.post('/upload-xml', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;  // Ubicación temporal del archivo subido
        const fileName = req.file.originalname;
        const content = fs.readFileSync(filePath, 'utf8');

        // Subir el archivo a GitHub
        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `archivos_xml/${fileName}`,  // Carpeta dentro del repo
            message: `Subir archivo XML: ${fileName}`,
            content: Buffer.from(content).toString('base64'),  // Convertir a base64
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
        fs.unlinkSync(req.file.path);  // Borrar el archivo temporal después de subirlo
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
