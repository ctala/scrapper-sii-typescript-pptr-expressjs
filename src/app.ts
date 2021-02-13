// lib/app.ts
import express = require('express'); // Create a new express application instance
const app: express.Application = express();
import Puppeteer from "./helpers/Puppeteer";
import {
    Empresa
} from './models/Empresa';


const puppeteer = new Puppeteer();
const rutvalidator = require('chileanrutvalidator');
const port:number|string = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    res.send({
        message: "usa /byrut/:rut"
    });
    
});

app.get('/byrut/:rut', async (req, res) => {
    const rutOriginal = req.params.rut;
    if (rutvalidator.validarRut(rutOriginal)) {
        const DV = rutOriginal.slice(-1);
        const RUT = rutOriginal.substring(0, rutOriginal.length - 1);
        console.log(RUT, DV);
        const empresa: Empresa = await puppeteer.scrap(RUT, DV);
        res.send(empresa);
    } else {
        res.status(500).send({
            message: "RUT INVALIDO"
        });
    }
});

app.listen(port, function () {
    console.log(`Listening on port ${port}!`);
});