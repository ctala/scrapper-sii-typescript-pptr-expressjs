import {
    AxiosResponse
} from "axios";

const axios = require('axios');
const fs = require('fs');
const Path = require('path');

export default class Captcha {
    private key: string;
    constructor() {
        this.key = "ea9524c70d5eefcad9cdfdfdc91d3e0f";
    }

    /**
     * 
     * @param path 
     */
    async send2Captcha(path: string): Promise < string > {

        var FormData = require('form-data');
        var data = new FormData();
        data.append('key', this.key);
        data.append('min_len', '4'); //Min of 4 
        data.append('max_len', '4'); //Max of 4
        data.append('numeric', '1'); //Only Numbers
        data.append('file', fs.createReadStream(path));

        var config = {
            method: 'post',
            url: 'http://2captcha.com/in.php',
            headers: {
                ...data.getHeaders()
            },
            data: data
        };

        return new Promise((resolve, reject) => {
            axios(config)
                .then(function (response: AxiosResponse) {
                    console.log(JSON.stringify(response.data));
                    const result = response.data.split("|");
                    if (result[0] == "OK") {
                        resolve(result[1]);
                    }
                    reject(response.data);

                })
                .catch(function (error: Error) {
                    console.log(error);
                    reject(error);
                });
        })


    }


    /**
     * 
     * @param codeId 
     */
    getCaptcha(codeId: string): Promise < string > {
        const config = {
            method: 'get',
            url: `http://2captcha.com/res.php?key=ea9524c70d5eefcad9cdfdfdc91d3e0f&action=get&id=${codeId}`,
            headers: {}
        };

        return new Promise((resolve, reject) => {
            axios(config)
                .then(async (response: AxiosResponse) => {
                    console.log(JSON.stringify(response.data));
                    const result = response.data.split("|");
                    if (result[0] == "OK") {
                        resolve(result[1]);
                    } else {
                        if (response.data == "CAPCHA_NOT_READY") {
                            //Espero 2 segundos más y llamo de nuevo.
                            console.log("No está listo");
                            await this.timeout(2000);
                            resolve(await this.getCaptcha(codeId))
                        } else {
                            reject(response.data);
                        }

                    }
                })
                .catch(function (error: Error) {
                    console.log(error);
                });
        })


    }

    /**
     * 
     * @param ms time in miliseconds
     */
    timeout(ms: number) {
        console.log(`WAITING ${ms} miliseconds`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}