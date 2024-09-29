const puppeteer = require('puppeteer');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { log } = require('console');
const { fileURLToPath } = require('url');
const { throwDeprecation } = require('process');
const { create } = require('domain');

// constant
const downloadPath = path.resolve('./downloads'); // Change this to your desired path



function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

function createDirectoryIfNotExists(dirPath, recursive = true) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: recursive });
        console.log(`Created directory: ${dirPath}`);
    }
}

(async () => {
    // specify download path
    console.log('setting up download path');
    console.log(`Download path: ${downloadPath}`);
    console.log('setting up browser for download');

    const browser = await puppeteer.launch({ headless: false, args: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // set the download behavior
    const client = await page.createCDPSession();
    // await client.send('Page.setDownloadBehavior', {
    //     behavior: 'allow',
    //     downloadPath: downloadPath
    // })

    console.log("going to template page ");

    await page.goto('https://www.sweetscape.com/010editor/repository/templates/');

    // get all headers
    let headerTrHandleList = await page.$$('.rep-heading');
    headerTrHandleList = await Promise.all(headerTrHandleList.map((headerTd => headerTd.evaluateHandle(el => el.parentElement))));

    for (const [index, headerTr] of headerTrHandleList.entries()) {
        const headerName = await headerTr.evaluate(el => el.firstElementChild.textContent.toLowerCase());
        console.log(`Downloading template for: ${headerName}`);
        let downloadRowElementHandle = await headerTr.evaluateHandle(el => el.nextElementSibling);
        const folderPath = path.join(downloadPath, headerName);
        createDirectoryIfNotExists(folderPath, true);
        while (true) {

            if (!(await downloadRowElementHandle.jsonValue()) ||
                (downloadRowElementHandle &&
                    await downloadRowElementHandle.evaluate(el => el.firstElementChild.classList.contains('rep-heading')))) { // its another header or nothing
                break
            }
            // download the template under the current header folder]
            const rowElements = await downloadRowElementHandle.$$('td');
            const templateName = await rowElements[0].evaluate(e1 => e1.textContent);
            const downloadLink = await rowElements[2].evaluate(e1 => e1.firstElementChild.href);
            // download template
            const filePath = path.join(folderPath, templateName);
            const file = fs.createWriteStream(filePath);
            https.get(downloadLink, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log(`Downloaded: ${templateName}`);
                    });
                });
            }).on('error', (err) => {
                fs.unlink(folderPath, () => {
                    console.log(`Error while downloading: ${templateName}`);
                });
            });
            downloadRowElementHandle = await downloadRowElementHandle.evaluateHandle(el => el.nextElementSibling);
        }
    };





    // await browser.close();
    // return Array.from(document.querySelectorAll('a'))
    //     .filter(link => link.textContent.toLowerCase() == 'download')
    //     .map(linkTag => {
    //         const nameTag = linkTag.parentElement.previousElementSibling.previousElementSibling;
    //         return { "name": nameTag.textContent, "link": linkTag.href };
    //     })
})();
// console.log("download links: ");
// console.log(downloadLinks);
// for (const linkObject of downloadLinks) {
//     const fileDestinationPath = path.resolve(downloadPath, linkObject.name);
//     const file = fs.createWriteStream(fileDestinationPath);
//     delay(100);
//     https.get(linkObject.link, (response) => {
//         response.pipe(file);
//         file.on('finish', () => {
//             file.close(() => {
//                 console.log(`Downloaded: ${linkObject.name}`);
//             });
//         });
//     }).on('error', (err) => {
//         fs.unlink(fileDestinationPath, () => {
//             console.log(`Error while downloading: ${linkObject.name}`);
//         });
//     })
// }
// await browser.close();
// }) ();