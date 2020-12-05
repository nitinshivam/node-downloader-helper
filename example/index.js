/*eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
const { DownloaderHelper } = require('../dist');
const { byteHelper, pauseResumeTimer } = require('./helpers');
const url = 'https://r7---sn-ci5gup-25ul.googlevideo.com/videoplayback?expire=1607208624&ei=ULrLX5m1Krnb4-EPyLCHiAI&ip=223.230.166.5&id=o-AApO39qWBwrtwBlkPn7gpLUINJO3GOO1p1vAVgT2YrvJ&itag=243&aitags=133%2C134%2C135%2C136%2C160%2C242%2C243%2C244%2C247%2C278%2C298%2C299%2C302%2C303&source=youtube&requiressl=yes&mh=1P&mm=31%2C29&mn=sn-ci5gup-25ul%2Csn-ci5gup-cvhk&ms=au%2Crdu&mv=m&mvi=7&pl=23&initcwndbps=153750&vprv=1&mime=video%2Fwebm&ns=sOBaKMfZJ0IVG0243Jq8CegF&gir=yes&clen=8742038&dur=218.000&lmt=1607111970155264&mt=1607186441&fvip=7&keepalive=yes&beids=9466585&c=WEB&txp=6432432&n=61gI6fj3FvE0Uw&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cvprv%2Cmime%2Cns%2Cgir%2Cclen%2Cdur%2Clmt&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AG3C_xAwRQIgbmJ0IRYRXvJ6JVqoZ2Y0f5Osc3vsl6jnNsrxG2aiVI0CIQCBtsS08amfRAfhMM65H5f1o3ibd6g2dxgsz1Rdu8YH8Q%3D%3D&alr=yes&sig=AOq0QJ8wRQIgFKz7ZsSwWmfnMAABiwwFkoCMELHj4ASsA-vw3pAdBgYCIQC0lo_vlpI_TeQaFfL-kPIXFxj7XAuT-dMohiN93pZulA%3D%3D&cpn=6rI8v9Z5k3HfQzCg&cver=2.20201203.06.00&rn=1'; // http://www.ovh.net/files/
const pkg = require('../package.json');
const zlib = require('zlib');

// these are the default options
const options = {
    method: 'GET', // Request Method Verb
    // Custom HTTP Header ex: Authorization, User-Agent
    headers: {
        'user-agent': pkg.name + '@' + pkg.version
    },
    retry: { maxRetries: 3, delay: 3000 }, // { maxRetries: number, delay: number in ms } or false to disable (default)
    fileName: filename => `${filename}.gz`, // Custom filename when saved
    /* override
    object: { skip: skip if already exists, skipSmaller: skip if smaller }
    boolean: true to override file, false to append '(number)' to new file name
    */
    override: { skip: true, skipSmaller: true },
    forceResume: false, // If the server does not return the "accept-ranges" header but it does support it
    removeOnStop: true, // remove the file when is stopped (default:true)
    removeOnFail: true, // remove the file when fail (default:true)    
    httpRequestOptions: {}, // Override the http request options  
    httpsRequestOptions: {} // Override the https request options, ex: to add SSL Certs
};

let startTime = new Date();
const dl = new DownloaderHelper(url, __dirname, options);

dl
    .once('download', () => pauseResumeTimer(dl, 5000))
    .on('download', downloadInfo => console.log('Download Begins: ',
        {
            name: downloadInfo.fileName,
            total: downloadInfo.totalSize
        }))
    .on('end', downloadInfo => console.log('Download Completed: ', downloadInfo))
    .on('skip', skipInfo =>
        console.log('Download skipped. File already exists: ', skipInfo))
    .on('error', err => console.error('Something happened', err))
    .on('retry', (attempt, opts) => {
        console.log(
            'Retry Attempt:', attempt + '/' + opts.maxRetries,
            'Starts on:', opts.delay / 1000, 'secs'
        );
    })
    .on('resume', isResumed => {
        // is resume is not supported, 
        // a new pipe instance needs to be attached
        if (!isResumed) {
            dl.unpipe();
            dl.pipe(zlib.createGzip());
            console.warn("This URL doesn't support resume, it will start from the beginning");
        }
    })
    .on('stateChanged', state => console.log('State: ', state))
    .on('renamed', filePaths => console.log('File Renamed to: ', filePaths.fileName))
    .on('progress', stats => {
        const progress = stats.progress.toFixed(1);
        const speed = byteHelper(stats.speed);
        const downloaded = byteHelper(stats.downloaded);
        const total = byteHelper(stats.total);

        // print every one second (`progress.throttled` can be used instead)
        const currentTime = new Date();
        const elaspsedTime = currentTime - startTime;
        if (elaspsedTime > 1000) {
            startTime = currentTime;
            console.log(`${speed}/s - ${progress}% [${downloaded}/${total}]`);
        }
    });

console.log('Downloading: ', url);
dl.pipe(zlib.createGzip()); // Adding example of pipe to compress the file while downloading
dl.start().catch(err => { /* already listening on 'error' event but catch can be used too */ });
