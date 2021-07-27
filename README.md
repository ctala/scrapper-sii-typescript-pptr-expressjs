# SII Scrapper

## Contenido

- [Sobre el Scrapper](#about)
- [Comenzando](#getting_started)
- [Uso](#usage)
- [Autores](#authors)

## Sobre el Scrapper <a name = "about"></a>

Scrapper de obtención de datos de empresa a través de API conectándose a la página de Situación Tributaria de Terceros del SII. Está diseñado para usar un servidor de memcache, pero funciona sin problemas al no tenerlo.

Para pruebas recomiendo bajar con docker un servidor de memcached.

### Tecnologías

- ExpressJS
- Puppetter
- Headless Chrome
- NodeJS
- Typescript
- 2Captcha

## Comenzando <a name = "getting_started"></a>

### Requerimientos

Como la página de terceros del SII usa un captcha simple, el único pre-requisito es tener un KEY de [2Captcha](https://2captcha.com?from=9243447)

Es aconsejable un servidor de memcached, sin embargo en caso de no usarla simplemente mostrará error en la consola.

### Instalando

Para instalar todas las dependencias simplemente usar npm

```
npm i
```

Esto también instalará la versión headless de Chrome.

## Usage <a name = "usage"></a>

Para probar de manera local simplemente en un browser puedes ir directamente a :

`http://localhost:3000/byrut/RUT`

En dónde RUT es el RUT a consultar sin puntos ni guión.

## Autores y Contribuidores <a name = "authors"></a>

- Cristian Tala
