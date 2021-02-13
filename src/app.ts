// lib/app.ts
import express = require('express'); // Create a new express application instance
const app: express.Application = express();
import Puppeteer from "./helpers/Puppeteer";
import {
    Empresa
} from './models/Empresa';

// const Memcached = require('memcached');
// const memcacheOptions = {
//     failover: true, // default: false
//     timeout: 1, // default: 0.5 (seconds)
//     keepAlive: true // default: false
// };

// const memcached = new Memcached(process.env.MEMCACHIER_SERVERS, memcacheOptions);

// memcached.connect( process.env.MEMCACHIER_SERVERS, ( err:Error, conn:any )=>{
//     if( err ) {
//        console.log( conn.server );
//     }
//   });

const memjs = require('memjs')
const memcached = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
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
        memcached.get(rutOriginal, async (err: Error, cachedEmpresa: Buffer) => {

            console.log("CACHE RESULT", err, cachedEmpresa);

            if (err == null && cachedEmpresa != null) {
                const empresa = JSON.parse(cachedEmpresa.toString()); 
                res.send(empresa);
            } else {
                const DV = rutOriginal.slice(-1);
                const RUT = rutOriginal.substring(0, rutOriginal.length - 1);
                console.log(RUT, DV);
                const empresa: Empresa = await puppeteer.scrap(RUT, DV);
                await memcached.set(rutOriginal, JSON.stringify(empresa), 60 * 60 * 4, (errorSet: Error) => {
                    console.log(errorSet)
                });
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