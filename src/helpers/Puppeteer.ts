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

export default class Puppeteer {
    private baseUrl: string = "https://zeus.sii.cl";
    private captcha: Captcha;

    constructor() {
        this.captcha = new Captcha();
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
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                  ],
            })
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

            await page.waitFor(
                "#contenedor > table:nth-child(25) > tbody > tr > td:nth-child(1)"
            );

            console.log("Resulted Page");

            const jsonEmpresa = await page.evaluate((selector) => {

                const count = document.querySelectorAll(
                    "#contenedor > table:nth-child(25) > tbody > tr > td:nth-child(1)"
                ).length;

                let actividades: Actividad[] = [];

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


                const nombreRazonSocial: string = document
                    .querySelector("#contenedor > div:nth-child(4)") !.textContent!.trim();

                const rut: string = document
                    .querySelector("#contenedor > div:nth-child(7)") !
                    .textContent!.trim();
                const inicia: string = document
                    .querySelector("#contenedor > span:nth-child(12)") !
                    .textContent!.trim();
                const fechaInicia: string = document
                    .querySelector("#contenedor > span:nth-child(14)") !
                    .textContent!.trim();

                const authExt = document
                    .querySelector("#contenedor > span:nth-child(16)") !
                    .textContent!.trim();

                const empTam = document
                    .querySelector("#contenedor > span:nth-child(18)") !
                    .textContent!.trim();

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

            console.log(jsonEmpresa);

            await browser.close();

            resolve(jsonEmpresa);
        })

    }


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