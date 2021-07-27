// lib/app.ts
import express = require("express"); // Create a new express application instance
const app: express.Application = express();
import Puppeteer from "./helpers/Puppeteer";
import { Empresa } from "./models/Empresa";

/**
 * Cacheamos las  respuestas al ser pesada la operación.
 */
const memjs = require("memjs");
const memcached = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true, // default: false
  timeout: 1, // default: 0.5 (seconds)
  keepAlive: true, // default: false
});

const puppeteer = new Puppeteer();
const rutvalidator = require("chileanrutvalidator");
const port: number | string = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  res.send({
    message: "usa /byrut/:rut",
  });
});

/**
 * Devuelve el objeto empresa correspondiente
 */
app.get("/byrut/:rut", async (req, res) => {
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
        try {
          const empresa: Empresa = await puppeteer.scrap(RUT, DV);
          //Cache de 30 días
          await memcached.set(
            rutOriginal,
            JSON.stringify(empresa),
            60 * 60 * 24 * 30,
            (errorSet: Error) => {
              console.log(errorSet);
            }
          );
          res.send(empresa);
        } catch (error) {
          console.log(error);
          res
            .status(503)
            .send({ message: "SII Sin respuesta o error en Captcha" });
        }
      }
    });
  } else {
    res.status(500).send({
      message: "RUT INVALIDO",
    });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}!`);
});
