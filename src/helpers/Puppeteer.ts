import puppeteer from 'puppeteer'
import {
    v4 as uuidv4
} from 'uuid';
import {
    Actividad
} from '../models/Actividad';
import {
    Empresa
} from '../models/Empresa';

import
Captcha
from './Captcha';

const fs = require('fs');
const Path = require('path');
const axios = require('axios');
const os = require('os');
const IS_DEV = process.env.NODE_ENV === 'test';




export default class Puppeteer {
    private baseUrl: string = "https://zeus.sii.cl";
    private captcha: Captcha;

    constructor() {
        this.captcha = new Captcha();
        console.log("DEV ENV",process.env.NODE_ENV,IS_DEV);
    }

    /**
     * 
     * @param RUT 
     * @param DV 
     */
    async scrap(RUT: string, DV: string): Promise < Empresa > {
        return new Promise(async (resolve, reject) => {
            console.log("Scrapping Started", RUT, DV);
            const imageCapture = "#imgcapt";

            const browser = await this.getBrowser();

            // const browser = await puppeteer.launch()
            const page = await browser.newPage()

            const navigationPromise = page.waitForNavigation()

            await page.goto(`${this.baseUrl}/cvc/stc/stc.html`)

            await navigationPromise

            await page.waitForSelector('#contenedor > #contenido > #form1 #RUT')

            //

            await page.type('#contenedor > #contenido > #form1 #RUT', `${RUT}`)

            await page.type('#contenedor > #contenido > #form1 #DV', `${DV}`)

            await page.waitFor(imageCapture);

            const imgSource = await page.evaluate((sel) => {
                return document.querySelector(sel).getAttribute("src");
            }, imageCapture);

            console.log(imgSource);

            const imgUrl = `${this.baseUrl}${imgSource}`;
            console.log(`Captcha URL: ${imgUrl}`);
            const imgId = uuidv4() + ".png";

            //IMG FILE PATH
            const path = Path.resolve(os.tmpdir(), `${imgId}`);


            await this.downloadImage(imgUrl, path);

            //Envio img a 2Captcha
            const result2CaptchaCode = await this.captcha.send2Captcha(path);

            await this.captcha.timeout(3000);

            //Obtengo el Código del Captcha
            const txt_code = await this.captcha.getCaptcha(result2CaptchaCode);
            console.log(`Captcha Result : ${txt_code}`);

            //Elimino Imagen
            fs.unlinkSync(path);


            await page.waitForSelector('#divCaptcha #txt_code')
            // await page.click('#divCaptcha #txt_code')
            await page.type("#txt_code", txt_code);

            console.log("Llenado Form");
            // await page.$eval('#form1', form => form.submit());
            await page.click('#contenedor > #contenido > #form1 > div > input:nth-child(12)')
            console.log("Form Submited");

            //Esperamos que la página resultante cargue
            await page.waitForNavigation({
                waitUntil: 'networkidle0'
            });

            console.log("Resulted Page");

            const jsonEmpresa = await this.getDatosEmpresaFromPage(page);

            console.log(jsonEmpresa);

            await browser.close();

            resolve(jsonEmpresa);
        })

    }


    /**
     * 
     * @param page 
     */
    async getDatosEmpresaFromPage(page: puppeteer.Page) {
        const result = await page.evaluate((selector) => {




            const nombreRazonSocial: string = document
                .querySelector("#contenedor > div:nth-child(4)") !.textContent!.trim();
            console.log(nombreRazonSocial);

            const rut: string = document
                .querySelector("#contenedor > div:nth-child(7)") !.textContent!.trim();
            console.log(rut);

            const inicia: string = document
                .querySelector("#contenedor > span:nth-child(12)") !.textContent!.trim();
            console.log(inicia);


            let fechaInicia: string = "";
            let authExt: string = "";
            let empTam: string = "";
            let actividades: Actividad[] = [];

            //Si no inicia actividades no tiene ninguno de las siguientes variables.
            if (inicia != "Contribuyente presenta Inicio de Actividades: NO") {

                console.log("NO TIENE INICIO DE ACTIVIDADES");

                fechaInicia = document
                    .querySelector("#contenedor > span:nth-child(14)") !
                    .textContent!.trim();

                authExt = document
                    .querySelector("#contenedor > span:nth-child(16)") !
                    .textContent!.trim();

                empTam = document
                    .querySelector("#contenedor > span:nth-child(18)") !
                    .textContent!.trim();

                //Obtenemos lista de Actividades desde la tabla.
                const count = document.querySelectorAll(
                    "#contenedor > table:nth-child(25) > tbody > tr > td:nth-child(1)"
                ).length;


                for (let i = 2; i <= count; i++) {
                    const el = Array.prototype.slice.call(
                        document.querySelectorAll(
                            "#contenedor > table:nth-child(25) > tbody > tr:nth-child(" +
                            i +
                            ") > td"
                        )
                    );
                    const data: Actividad = {
                        actividad: el[0].textContent.trim(),
                        codigo: el[1].textContent.trim(),
                        categoria: el[2].textContent.trim(),
                        afectaIva: el[3].textContent.trim(),
                        fecha: el[4].textContent.trim(),
                    };
                    actividades.push(data);
                }

            }

            const JsonEmpresa: Empresa = {
                nombreRazonSocial,
                rut,
                inicia,
                fechaInicia,
                authExt,
                empTam,
                actividades: actividades,
            };
            return JsonEmpresa;
        }, "#contenedor > table:nth-child(25) > tbody > tr > td:nth-child(1)");

        return result;
    }


    getBrowser = () => !IS_DEV ?

        // Connect to browserless so we don't run Chrome on the same hardware in production
        puppeteer.connect({
            browserWSEndpoint: 'wss://chrome.browserless.io?token=3cde03ac-4715-4732-8613-e86223af16e4'
        }) :

        // Run the browser locally while in development
        puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

    /**
     * 
     * @param imgUrl 
     * @param path 
     */
    async downloadImage(imgUrl: string, path: string): Promise < boolean > {

        const url = imgUrl;


        // axios image download with response type "stream"
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        })

        // pipe the result stream into a file on disc
        response.data.pipe(fs.createWriteStream(path))

        // return a promise and resolve when download finishes
        return new Promise((resolve, reject) => {
            response.data.on('end', () => {
                resolve(true);
            })

            response.data.on('error', () => {
                reject(false)
            })
        })

    }
}

module.exports = Puppeteer;