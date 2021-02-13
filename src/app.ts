// lib/app.ts
import express = require('express'); // Create a new express application instance
const app: express.Application = express();
import Puppeteer from "./helpers/Puppeteer";
import {
    Empresa
} from './models/Empresa';


const memjs = require('memjs')
const mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
    failover: true, // default: false
    timeout: 1, // default: 0.5 (seconds)
    keepAlive: true // default: false
})


const puppeteer = new Puppeteer();
const rutvalidator = require('chileanrutvalidator');
const port: number | string = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    res.send({
        message: "usa /byrut/:rut"
    });

});

app.get('/byrut/:rut', async (req, res) => {
    const rutOriginal = req.params.rut;
    if (rutvalidator.validarRut(rutOriginal)) {
        mc.get(rutOriginal, async (err: Error, cachedEmpresa: Empresa) => {

            if (err == null && cachedEmpresa != null) {
                res.send(cachedEmpresa);
            } else {
                const DV = rutOriginal.slice(-1);
                const RUT = rutOriginal.substring(0, rutOriginal.length - 1);
                console.log(RUT, DV);
                const empresa: Empresa = await puppeteer.scrap(RUT, DV);
                mc.set(rutOriginal, {expires:0}, (errSetCache:Error, resultSet:any) => {
                    console.log(errSetCache,resultSet);
                })
                res.send(empresa);
            }
        })

    } else {
        res.status(500).send({
            message: "RUT INVALIDO"
        });
    }
});

app.listen(port, function () {
    console.log(`Listening on port ${port}!`);
});