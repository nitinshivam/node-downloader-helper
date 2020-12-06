/*eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */
const { DownloaderHelper } = require('../dist');
const { byteHelper, pauseResumeTimer } = require('./helpers');
const url = 'https://r5---sn-ci5gup-25ul.googlevideo.com/videoplayback?expire=1607270009&ei=GarMX6L7E93y4-EPsbyvmAQ&ip=223.230.166.5&id=o-AG0wABxU-v7yI5GeKkYVGz7YBVpfGeDHSeQvgLvXR4hj&itag=396&aitags=133%2C134%2C135%2C136%2C137%2C160%2C242%2C243%2C244%2C247%2C248%2C278%2C394%2C395%2C396%2C397%2C398%2C399&source=youtube&requiressl=yes&mh=Ca&mm=31%2C29&mn=sn-ci5gup-25ul%2Csn-ci5gup-cvhr&ms=au%2Crdu&mv=m&mvi=5&pcm2cms=yes&pl=23&initcwndbps=218750&vprv=1&mime=video%2Fmp4&ns=FT-92rK_-DHa8pOukce1r0oF&gir=yes&clen=915837&dur=222.320&lmt=1593936063680889&mt=1607248118&fvip=5&keepalive=yes&beids=9466585&c=WEB&txp=5531432&n=EK4uNJZV5LMxoA&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cvprv%2Cmime%2Cns%2Cgir%2Cclen%2Cdur%2Clmt&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpcm2cms%2Cpl%2Cinitcwndbps&lsig=AG3C_xAwRAIgQVo8ddf7z69Bq6qmHOWWl9yMYkln4yn_2hlWSua3FdICIErJpsPAo1ApjJmOf-TbGKJz0vnOGP3bO1IsnIxtBlKJ&alr=yes&sig=AOq0QJ8wRAIgIQaFL93O9tZLKDSzUUcOVLhHaza1ai6mCDMx9ih5KdUCICnPk7LZvY438ONeb8jpsKDkjVQy3IVtPB2VSvKguupf&cpn=3GFpdXm1yhDRPLFj&cver=2.20201203.06.00&rn=1'; // http://www.ovh.net/files/
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
